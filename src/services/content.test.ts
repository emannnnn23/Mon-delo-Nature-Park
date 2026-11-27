import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "~/types/database";
import {
  MAX_FEATURED_ATTRACTIONS,
  MAX_GALLERY_IMAGES,
} from "~/lib/homeContent";
import {
  ContentError,
  getAboutContent,
  getAttractionBySlug,
  getDiscoverContent,
  getGalleryContent,
  getHomeContent,
  getSiteChrome,
  getVisitContent,
  listPublishedAttractionSlugs,
} from "./content";

type Result = { data: unknown; error: unknown };
type Call = { op: string; args: unknown[] };
type Query = { table: string; calls: Call[] };

/**
 * Minimal fake of the supabase-js query builder. Each `from(table)` takes the
 * next queued result for that table (in call order), records every chained
 * call, and resolves to that result when awaited.
 */
function makeFake(results: Record<string, Result | Result[]>) {
  const queues = new Map<string, Result[]>(
    Object.entries(results).map(([table, r]) => [
      table,
      Array.isArray(r) ? [...r] : [r],
    ]),
  );
  const queries: Query[] = [];
  const client = {
    from(table: string) {
      const result = queues.get(table)?.shift() ?? { data: null, error: null };
      const query: Query = { table, calls: [] };
      queries.push(query);
      const b: Record<string, unknown> = {};
      for (const op of [
        "select",
        "eq",
        "lte",
        "or",
        "order",
        "limit",
        "maybeSingle",
      ]) {
        b[op] = (...args: unknown[]) => {
          query.calls.push({ op, args });
          return b;
        };
      }
      b.then = (
        resolve: (r: Result) => unknown,
        reject: (e: unknown) => unknown,
      ) => Promise.resolve(result).then(resolve, reject);
      return b;
    },
  };
  return { client: client as unknown as SupabaseClient<Database>, queries };
}

const has = (q: Query, op: string, ...args: unknown[]) =>
  q.calls.some(
    (c) =>
      c.op === op &&
      args.every((a, i) => JSON.stringify(c.args[i]) === JSON.stringify(a)),
  );
const forTable = (queries: Query[], table: string) =>
  queries.filter((q) => q.table === table);

function expectPublishedAndOrdered(q: Query) {
  expect(has(q, "eq", "is_published", true)).toBe(true);
  const topLevel = q.calls
    .filter(
      (c) =>
        c.op === "order" &&
        (c.args[1] as { referencedTable?: string } | undefined)
          ?.referencedTable === undefined,
    )
    .map((c) => c.args[0]);
  expect(topLevel).toEqual(["sort_order", "created_at"]);
}

const media = (id: string) => ({
  id,
  alt_text: `alt ${id}`,
  width: 800,
  height: 600,
  variants: { "480": `${id}/480.webp` },
  focal_x: 50,
  focal_y: 50,
  storage_base_path: id,
  original_filename: null,
  created_at: "x",
  updated_at: "x",
});

const settingsRow = {
  id: "s",
  singleton: true,
  park_name: "Mondelos Nature Park",
  tagline: null,
  short_description: null,
  address_line: "Somewhere",
  plus_code: null,
  latitude: null,
  longitude: null,
  maps_embed_url: null,
  maps_listing_url: null,
  phone: null,
  email: null,
  opening_hours: null,
  facebook_url: null,
  instagram_url: null,
  tiktok_url: null,
  youtube_url: null,
  google_rating: "4.6",
  google_review_count: 70,
  default_og_media_id: null,
  default_og: null,
  created_at: "x",
  updated_at: "x",
};

const attractionRow = (
  id: string,
  kind: "attraction" | "experience",
  extra: Record<string, unknown> = {},
) => ({
  id,
  kind,
  slug: id,
  name: id,
  summary: "s",
  description: null,
  icon: null,
  cover_media_id: null,
  cover: null,
  images: [],
  is_featured: false,
  is_published: true,
  sort_order: 0,
  is_sample: false,
  created_at: "x",
  updated_at: "x",
  ...extra,
});

const sectionRow = (key: string, extra: Record<string, unknown> = {}) => ({
  id: key,
  page: "home",
  key,
  eyebrow: null,
  heading: key,
  body: null,
  cta_label: null,
  cta_href: null,
  media_id: null,
  image: null,
  is_published: true,
  sort_order: 0,
  is_sample: false,
  created_at: "x",
  updated_at: "x",
  ...extra,
});

const galleryRow = (
  id: string,
  category: { id: string; is_published: boolean } | null,
  extra: Record<string, unknown> = {},
) => ({
  id,
  media_id: id,
  category_id: category?.id ?? null,
  category,
  image: media(id),
  caption: null,
  is_featured: true,
  is_published: true,
  is_sample: false,
  sort_order: 0,
  created_at: "x",
  updated_at: "x",
  ...extra,
});

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe("getSiteChrome", () => {
  const now = new Date("2026-11-27T04:00:00Z");

  it("reads the settings singleton and no announcement when none is live", async () => {
    const fake = makeFake({
      site_settings: { data: settingsRow, error: null },
      announcements: { data: [], error: null },
    });
    const chrome = await getSiteChrome(fake.client, now);
    expect(chrome.settings.parkName).toBe("Mondelos Nature Park");
    expect(chrome.settings.googleRating).toBe(4.6);
    expect(chrome.announcement).toBeNull();
    const [settings] = forTable(fake.queries, "site_settings");
    expect(has(settings, "eq", "singleton", true)).toBe(true);
    expect(has(settings, "maybeSingle")).toBe(true);
  });

  it("selects only a published announcement inside its window, newest first", async () => {
    const fake = makeFake({
      site_settings: { data: settingsRow, error: null },
      announcements: {
        data: [
          {
            id: "n1",
            title: "Open late",
            body: null,
            link_label: null,
            link_href: null,
            starts_at: "2026-11-01T00:00:00Z",
            ends_at: null,
            is_published: true,
            created_at: "x",
            updated_at: "x",
          },
        ],
        error: null,
      },
    });
    const chrome = await getSiteChrome(fake.client, now);
    expect(chrome.announcement?.title).toBe("Open late");
    const [q] = forTable(fake.queries, "announcements");
    const iso = now.toISOString();
    expect(has(q, "eq", "is_published", true)).toBe(true);
    expect(has(q, "lte", "starts_at", iso)).toBe(true);
    expect(has(q, "or", `ends_at.is.null,ends_at.gt.${iso}`)).toBe(true);
    expect(has(q, "order", "starts_at", { ascending: false })).toBe(true);
    expect(has(q, "limit", 1)).toBe(true);
  });

  it("double-checks the window on the client", async () => {
    const fake = makeFake({
      site_settings: { data: settingsRow, error: null },
      announcements: {
        data: [
          {
            id: "n1",
            title: "Expired",
            body: null,
            link_label: null,
            link_href: null,
            starts_at: "2026-10-01T00:00:00Z",
            ends_at: "2026-11-01T00:00:00Z",
            is_published: true,
            created_at: "x",
            updated_at: "x",
          },
        ],
        error: null,
      },
    });
    expect((await getSiteChrome(fake.client, now)).announcement).toBeNull();
  });

  it("throws ContentError when the settings row is missing", async () => {
    const fake = makeFake({
      site_settings: { data: null, error: null },
      announcements: { data: [], error: null },
    });
    await expect(getSiteChrome(fake.client, now)).rejects.toBeInstanceOf(
      ContentError,
    );
  });
});

describe("getHomeContent", () => {
  function homeFake() {
    return makeFake({
      site_settings: { data: settingsRow, error: null },
      page_sections: {
        data: [sectionRow("hero"), sectionRow("intro")],
        error: null,
      },
      attractions: [
        {
          data: [attractionRow("garden", "experience")],
          error: null,
        },
        {
          data: [attractionRow("falls", "attraction", { is_featured: true })],
          error: null,
        },
      ],
      gallery_images: {
        data: [galleryRow("g1", { id: "c1", is_published: true })],
        error: null,
      },
      testimonials: {
        data: [
          {
            id: "t1",
            author_name: "Ana",
            quote: "Nice",
            rating: 5,
            source: "google",
            source_url: null,
            review_date: null,
            is_published: true,
            sort_order: 0,
            created_at: "x",
            updated_at: "x",
          },
        ],
        error: null,
      },
    });
  }

  it("filters and orders every query and assembles the home props", async () => {
    const fake = homeFake();
    const home = await getHomeContent(fake.client);

    for (const q of fake.queries) {
      if (q.table === "site_settings") continue;
      expectPublishedAndOrdered(q);
    }

    const [experiences, featured] = forTable(fake.queries, "attractions");
    expect(has(experiences, "eq", "kind", "experience")).toBe(true);
    expect(has(featured, "eq", "kind", "attraction")).toBe(true);
    expect(has(featured, "eq", "is_featured", true)).toBe(true);
    expect(has(featured, "limit", MAX_FEATURED_ATTRACTIONS)).toBe(true);

    const [gallery] = forTable(fake.queries, "gallery_images");
    expect(has(gallery, "eq", "is_featured", true)).toBe(true);
    expect(has(gallery, "limit", MAX_GALLERY_IMAGES)).toBe(true);

    const [sections] = forTable(fake.queries, "page_sections");
    expect(has(sections, "eq", "page", "home")).toBe(true);

    expect(home.settings.parkName).toBe("Mondelos Nature Park");
    expect(home.sections.map((s) => s.key)).toEqual(["hero", "intro"]);
    expect(home.experiences.map((a) => a.slug)).toEqual(["garden"]);
    expect(home.featuredAttractions.map((a) => a.slug)).toEqual(["falls"]);
    expect(home.galleryImages).toHaveLength(1);
    expect(home.testimonials).toHaveLength(1);
  });

  it("caps featured attractions and gallery images with the shared constants", async () => {
    const many = Array.from({ length: 10 }, (_, i) =>
      attractionRow(`a${i}`, "attraction", { is_featured: true }),
    );
    const gallery = Array.from({ length: 10 }, (_, i) =>
      galleryRow(`g${i}`, null),
    );
    const fake = makeFake({
      site_settings: { data: settingsRow, error: null },
      page_sections: { data: [], error: null },
      attractions: [
        { data: [], error: null },
        { data: many, error: null },
      ],
      gallery_images: { data: gallery, error: null },
      testimonials: { data: [], error: null },
    });
    const home = await getHomeContent(fake.client);
    expect(home.featuredAttractions).toHaveLength(MAX_FEATURED_ATTRACTIONS);
    expect(home.galleryImages).toHaveLength(MAX_GALLERY_IMAGES);
  });

  it("rejects with ContentError and hides the raw Supabase text", async () => {
    const failing = makeFake({
      site_settings: { data: settingsRow, error: null },
      page_sections: { data: [], error: null },
      attractions: [
        {
          data: null,
          error: { message: 'relation "attractions" secret', code: "42P01" },
        },
        { data: [], error: null },
      ],
      gallery_images: { data: [], error: null },
      testimonials: { data: [], error: null },
    });
    const err = await getHomeContent(failing.client).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ContentError);
    expect((err as ContentError).message).not.toMatch(/secret|relation/);
    expect((err as ContentError).cause).toMatchObject({ code: "42P01" });
    expect(console.error).toHaveBeenCalled();
  });
});

describe("getDiscoverContent", () => {
  it("splits published attractions and experiences and reads the discover intro", async () => {
    const fake = makeFake({
      page_sections: {
        data: [sectionRow("discover", { heading: "Discover the Park" })],
        error: null,
      },
      attractions: {
        data: [
          attractionRow("falls", "attraction", {
            cover: media("c1"),
            images: [
              {
                id: "ai1",
                caption: "x",
                sort_order: 0,
                created_at: "x",
                image: media("i1"),
              },
            ],
          }),
          attractionRow("garden", "experience"),
        ],
        error: null,
      },
    });
    const discover = await getDiscoverContent(fake.client);
    expect(discover.intro?.heading).toBe("Discover the Park");
    expect(discover.attractions.map((a) => a.slug)).toEqual(["falls"]);
    expect(discover.experiences.map((a) => a.slug)).toEqual(["garden"]);
    expect(discover.attractions[0].images[0].id).toBe("ai1");
    expect(discover.attractions[0].cover?.id).toBe("c1");

    for (const q of fake.queries) expectPublishedAndOrdered(q);
    const [att] = forTable(fake.queries, "attractions");
    const select = att.calls.find((c) => c.op === "select")?.args[0] as string;
    expect(select).toContain("cover:media!attractions_cover_media_id_fkey(*)");
    expect(select).toContain("attraction_images");
    const [sec] = forTable(fake.queries, "page_sections");
    expect(has(sec, "eq", "page", "home")).toBe(true);
    expect(has(sec, "eq", "key", "discover")).toBe(true);
  });

  it("orders embedded attraction images by sort_order then created_at", async () => {
    const fake = makeFake({
      page_sections: { data: [], error: null },
      attractions: { data: [], error: null },
    });
    await getDiscoverContent(fake.client);
    const [att] = forTable(fake.queries, "attractions");
    const embedded = att.calls
      .filter(
        (c) =>
          c.op === "order" &&
          (c.args[1] as { referencedTable?: string } | undefined)
            ?.referencedTable === "attraction_images",
      )
      .map((c) => c.args[0]);
    expect(embedded).toEqual(["sort_order", "created_at"]);
  });
});

describe("getAttractionBySlug", () => {
  it("returns null when no published row matches", async () => {
    const fake = makeFake({ attractions: { data: null, error: null } });
    expect(await getAttractionBySlug("nope", fake.client)).toBeNull();
    const [q] = fake.queries;
    expect(has(q, "eq", "slug", "nope")).toBe(true);
    expect(has(q, "eq", "is_published", true)).toBe(true);
    expect(has(q, "maybeSingle")).toBe(true);
  });

  it("maps a found attraction", async () => {
    const fake = makeFake({
      attractions: {
        data: attractionRow("falls", "attraction", { cover: media("c") }),
        error: null,
      },
    });
    const a = await getAttractionBySlug("falls", fake.client);
    expect(a?.slug).toBe("falls");
    expect(a?.cover?.id).toBe("c");
  });

  it("only looks up attractions, not experiences", async () => {
    const fake = makeFake({ attractions: { data: null, error: null } });
    await getAttractionBySlug("x", fake.client);
    expect(has(fake.queries[0], "eq", "kind", "attraction")).toBe(true);
  });

  it("rejects with ContentError on a Supabase error", async () => {
    const fake = makeFake({
      attractions: { data: null, error: { message: "boom", code: "XX" } },
    });
    await expect(getAttractionBySlug("x", fake.client)).rejects.toBeInstanceOf(
      ContentError,
    );
  });
});

describe("listPublishedAttractionSlugs", () => {
  it("lists published attraction slugs in order", async () => {
    const fake = makeFake({
      attractions: { data: [{ slug: "a" }, { slug: "b" }], error: null },
    });
    expect(await listPublishedAttractionSlugs(fake.client)).toEqual(["a", "b"]);
    const [q] = fake.queries;
    expect(has(q, "select", "slug")).toBe(true);
    expect(has(q, "eq", "kind", "attraction")).toBe(true);
    expectPublishedAndOrdered(q);
  });

  it("returns an empty list when there are none", async () => {
    const fake = makeFake({ attractions: { data: [], error: null } });
    expect(await listPublishedAttractionSlugs(fake.client)).toEqual([]);
  });
});

describe("getGalleryContent", () => {
  it("filters published rows and hides unpublished categories (P4-R7)", async () => {
    const fake = makeFake({
      page_sections: {
        data: [sectionRow("gallery", { heading: "Our Gallery" })],
        error: null,
      },
      gallery_categories: {
        data: [
          {
            id: "c1",
            name: "Gardens",
            slug: "gardens",
            is_published: true,
            sort_order: 0,
            created_at: "x",
            updated_at: "x",
          },
        ],
        error: null,
      },
      gallery_images: {
        data: [
          galleryRow("g1", { id: "c1", is_published: true }),
          galleryRow("g2", { id: "c2", is_published: false }),
          galleryRow("g3", null),
        ],
        error: null,
      },
    });
    const gallery = await getGalleryContent(fake.client);
    expect(gallery.intro?.heading).toBe("Our Gallery");
    expect(gallery.categories).toEqual([
      { id: "c1", name: "Gardens", slug: "gardens" },
    ]);
    expect(gallery.images.map((i) => [i.id, i.categoryId])).toEqual([
      ["g1", "c1"],
      ["g2", null],
      ["g3", null],
    ]);
    for (const q of fake.queries) expectPublishedAndOrdered(q);
    const [sec] = forTable(fake.queries, "page_sections");
    expect(has(sec, "eq", "key", "gallery")).toBe(true);
  });
});

describe("getAboutContent / getVisitContent", () => {
  it("reads published about sections", async () => {
    const fake = makeFake({
      page_sections: {
        data: [sectionRow("story", { page: "about" })],
        error: null,
      },
    });
    const about = await getAboutContent(fake.client);
    expect(about.sections.map((s) => s.key)).toEqual(["story"]);
    const [q] = fake.queries;
    expect(has(q, "eq", "page", "about")).toBe(true);
    expectPublishedAndOrdered(q);
  });

  it("reads visit sections and faqs", async () => {
    const fake = makeFake({
      page_sections: {
        data: [sectionRow("intro", { page: "visit" })],
        error: null,
      },
      faqs: {
        data: [
          {
            id: "f1",
            question: "Q?",
            answer: "A.",
            is_published: true,
            sort_order: 0,
            created_at: "x",
            updated_at: "x",
          },
        ],
        error: null,
      },
    });
    const visit = await getVisitContent(fake.client);
    expect(visit.sections).toHaveLength(1);
    expect(visit.faqs).toEqual([{ id: "f1", question: "Q?", answer: "A." }]);
    const [sec] = forTable(fake.queries, "page_sections");
    expect(has(sec, "eq", "page", "visit")).toBe(true);
    for (const q of fake.queries) expectPublishedAndOrdered(q);
  });
});

describe("without a client", () => {
  it("throws ContentError when the public client is not configured", async () => {
    await expect(getAboutContent()).rejects.toBeInstanceOf(ContentError);
  });
});
