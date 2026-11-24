import type { SettingsRow } from "~/types/db-helpers";

import { computeMissing, getDashboard, RECENT_LABELS } from "./dashboard";

const STAMP = "2026-11-20T00:00:00Z";

/** The settings as seeded: every contact field empty. */
function settings(extra: Partial<SettingsRow> = {}): SettingsRow {
  return {
    id: "s1",
    singleton: true,
    park_name: "Mondelos Nature Park",
    tagline: null,
    short_description: null,
    address_line: "M8GV+8GP, Balaring Road, Kawayan, Biliran, Philippines",
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
    google_rating: null,
    google_review_count: null,
    default_og_media_id: null,
    created_at: STAMP,
    updated_at: STAMP,
    ...extra,
  };
}

describe("computeMissing", () => {
  it("lists all eight items, in order, for the seeded settings", () => {
    expect(computeMissing(settings(), 7, 0, 0)).toEqual([
      "Phone number",
      "Email address",
      "Opening hours",
      "Social media links",
      "Google Maps listing link",
      "Guest reviews",
      "Park photos",
      "7 sample items still to confirm",
    ]);
  });

  it("lists nothing when everything is filled in", () => {
    expect(
      computeMissing(
        settings({
          phone: "0912",
          email: "a@b.co",
          opening_hours: "Daily 8-5",
          facebook_url: "https://facebook.com/x",
          maps_listing_url: "https://maps.app.goo.gl/x",
        }),
        0,
        3,
        12,
      ),
    ).toEqual([]);
  });

  it("asks for social links only when all four are empty", () => {
    expect(
      computeMissing(
        settings({ youtube_url: "https://youtube.com/x" }),
        0,
        1,
        1,
      ),
    ).not.toContain("Social media links");
  });

  it("treats blank text as missing", () => {
    expect(
      computeMissing(settings({ phone: "  ", opening_hours: "" }), 0, 1, 1),
    ).toEqual(expect.arrayContaining(["Phone number", "Opening hours"]));
  });
});

describe("RECENT_LABELS", () => {
  it("names every source the view returns", () => {
    expect(RECENT_LABELS).toEqual({
      page_sections: "Page section",
      attractions: "Attraction",
      gallery_images: "Gallery photo",
      gallery_categories: "Gallery category",
      testimonials: "Testimonial",
      announcements: "Announcement",
      faqs: "FAQ",
      site_settings: "Contact & settings",
    });
  });
});

type Call = { op: string; args: unknown[] };
type Query = { table: string; calls: Call[] };

const fake = vi.hoisted(() => {
  const state = {
    queries: [] as Query[],
    counts: {} as Record<string, number>,
    rows: {} as Record<string, unknown>,
  };
  function builder(table: string) {
    const query: Query = { table, calls: [] };
    state.queries.push(query);
    const b: Record<string, unknown> = {};
    for (const op of ["select", "eq", "order", "limit", "maybeSingle"]) {
      b[op] = (...args: unknown[]) => {
        query.calls.push({ op, args });
        return b;
      };
    }
    b.then = (resolve: (r: unknown) => unknown) => {
      const select = query.calls.find((c) => c.op === "select");
      const head = (select?.args[1] as { head?: boolean } | undefined)?.head;
      const filters = query.calls
        .filter((c) => c.op === "eq")
        .map((c) => `${String(c.args[0])}=${String(c.args[1])}`)
        .join(",");
      const key = filters ? `${table}[${filters}]` : table;
      return Promise.resolve(
        head
          ? { count: state.counts[key] ?? 0, data: null, error: null }
          : { data: state.rows[table] ?? null, error: null },
      ).then(resolve);
    };
    return b;
  }
  return { state, client: { from: (table: string) => builder(table) } };
});

vi.mock("~/lib/supabase", () => ({ getSupabase: () => fake.client }));

describe("getDashboard", () => {
  beforeEach(() => {
    fake.state.queries = [];
    fake.state.counts = {
      "attractions[is_published=true]": 4,
      gallery_images: 0,
      "announcements[is_published=true]": 2,
      "contact_messages[status=new]": 3,
      "page_sections[is_sample=true]": 2,
      "attractions[is_sample=true]": 3,
      "gallery_images[is_sample=true]": 2,
      testimonials: 0,
    };
    fake.state.rows = {
      site_settings: settings(),
      recent_content_updates: [
        {
          source: "faqs",
          id: "f1",
          title: "Is there parking?",
          updated_at: STAMP,
        },
      ],
    };
  });

  it("returns the four counts, the recent updates and what is missing", async () => {
    const result = await getDashboard();
    expect(result.counts).toEqual({
      publishedAttractions: 4,
      galleryImages: 0,
      publishedAnnouncements: 2,
      newMessages: 3,
    });
    expect(result.recent).toEqual([
      {
        source: "faqs",
        id: "f1",
        title: "Is there parking?",
        updatedAt: STAMP,
      },
    ]);
    expect(result.missing).toEqual([
      "Phone number",
      "Email address",
      "Opening hours",
      "Social media links",
      "Google Maps listing link",
      "Guest reviews",
      "Park photos",
      "7 sample items still to confirm",
    ]);
  });

  it("counts only published reviews and photos as present, but keeps the photo tile total", async () => {
    fake.state.counts["gallery_images"] = 5;
    fake.state.counts["testimonials"] = 3;
    // None of them are on the website yet.
    const hidden = await getDashboard();
    expect(hidden.counts.galleryImages).toBe(5);
    expect(hidden.missing).toEqual(
      expect.arrayContaining(["Guest reviews", "Park photos"]),
    );

    fake.state.counts["gallery_images[is_published=true]"] = 1;
    fake.state.counts["testimonials[is_published=true]"] = 1;
    const shown = await getDashboard();
    expect(shown.counts.galleryImages).toBe(5);
    expect(shown.missing).not.toContain("Guest reviews");
    expect(shown.missing).not.toContain("Park photos");
  });

  it("counts with a head request that returns no rows", async () => {
    await getDashboard();
    const counting = fake.state.queries.filter((q) =>
      q.calls.some((c) => c.op === "select" && c.args[1] !== undefined),
    );
    expect(counting.length).toBeGreaterThanOrEqual(4);
    for (const q of counting) {
      const select = q.calls.find((c) => c.op === "select");
      expect(select?.args).toEqual(["id", { count: "exact", head: true }]);
    }
  });
});
