import type { SupabaseClient } from "@supabase/supabase-js";
import type { HomePageProps } from "../lib/homeContent";
import {
  findSection,
  MAX_FEATURED_ATTRACTIONS,
  MAX_GALLERY_IMAGES,
  selectHomeContent,
} from "../lib/homeContent";
import { getPublicSupabase } from "../lib/publicClient";
import type {
  Announcement,
  Attraction,
  Faq,
  GalleryCategory,
  GalleryImage,
  PageKey,
  PageSection,
  SiteSettings,
} from "../types/content";
import type { Database } from "../types/database";
import { isWithinWindow } from "../utils/dates";
import {
  toAnnouncement,
  toAttraction,
  toFaq,
  toGalleryImage,
  toPageSection,
  toSettings,
  toTestimonial,
  type AttractionInput,
  type GalleryImageInput,
  type PageSectionInput,
  type SettingsInput,
} from "./mappers";
import type { Row } from "../types/db-helpers";

type Client = SupabaseClient<Database>;

export type DiscoverContent = {
  intro: PageSection | null;
  attractions: Attraction[];
  experiences: Attraction[];
};

/**
 * A failure to read public content. `message` is safe to show; the raw
 * Supabase error is kept in `cause` and logged, never put in the message.
 */
export class ContentError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message, { cause });
    this.name = "ContentError";
  }
}

const READ_FAILED = "The site content could not be loaded.";

function resolveClient(client?: Client): Client {
  const resolved = client ?? getPublicSupabase();
  if (!resolved) {
    throw new ContentError("The site content is not available right now.");
  }
  return resolved;
}

type Reply = { data: unknown; error: unknown };

/** Awaits a query and returns its data, or throws a ContentError. */
async function read<T>(query: PromiseLike<Reply>, what: string): Promise<T> {
  let reply: Reply;
  try {
    reply = await query;
  } catch (cause) {
    console.error(`[content] ${what}: request failed`, cause);
    throw new ContentError(READ_FAILED, cause);
  }
  if (reply.error) {
    console.error(`[content] ${what}:`, reply.error);
    throw new ContentError(READ_FAILED, reply.error);
  }
  return reply.data as T;
}

const rows = async <T>(query: PromiseLike<Reply>, what: string) =>
  (await read<T[] | null>(query, what)) ?? [];

// The embedded media for each table, named after the foreign keys.
const COVER = "cover:media!attractions_cover_media_id_fkey(*)";
const ATTRACTION_IMAGES =
  "images:attraction_images(id, caption, sort_order, created_at, image:media!attraction_images_media_id_fkey(*))";
const ATTRACTION_SELECT = `*, ${COVER}, ${ATTRACTION_IMAGES}`;
const SECTION_SELECT = "*, image:media!page_sections_media_id_fkey(*)";
const SETTINGS_SELECT =
  "*, default_og:media!site_settings_default_og_media_id_fkey(*)";
const GALLERY_IMAGE_SELECT =
  "*, image:media!gallery_images_media_id_fkey(*), category:gallery_categories!gallery_images_category_id_fkey(id, is_published)";

// The ordering every list uses; `sort_order` first, `created_at` breaks ties.
function ordered<
  Q extends {
    order: (column: string, options: { ascending: boolean }) => Q;
  },
>(query: Q): Q {
  return query
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
}

// --- queries -----------------------------------------------------------------

async function fetchSettings(client: Client): Promise<SiteSettings> {
  const row = await read<SettingsInput | null>(
    client
      .from("site_settings")
      .select(SETTINGS_SELECT)
      .eq("singleton", true)
      .maybeSingle(),
    "settings",
  );
  if (!row) {
    console.error("[content] settings: no settings row");
    throw new ContentError(READ_FAILED);
  }
  return toSettings(row);
}

async function fetchAnnouncement(
  client: Client,
  now: Date,
): Promise<Announcement | null> {
  const iso = now.toISOString();
  const data = await rows<Row<"announcements">>(
    client
      .from("announcements")
      .select("*")
      .eq("is_published", true)
      .lte("starts_at", iso)
      .or(`ends_at.is.null,ends_at.gt.${iso}`)
      .order("starts_at", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(1),
    "announcement",
  );
  const live = data.find((a) => isWithinWindow(a.starts_at, a.ends_at, now));
  return live ? toAnnouncement(live) : null;
}

async function fetchSections(
  client: Client,
  page: PageKey,
  key?: string,
): Promise<PageSection[]> {
  let query = client
    .from("page_sections")
    .select(SECTION_SELECT)
    .eq("page", page)
    .eq("is_published", true);
  if (key !== undefined) query = query.eq("key", key);
  const data = await rows<PageSectionInput>(ordered(query), `${page} sections`);
  return data.map(toPageSection);
}

type AttractionQuery = ReturnType<typeof baseAttractions>;

/**
 * Published attractions of one kind (or both). A published parent is what
 * exposes its photos: they are embedded under it, so a draft attraction's
 * images are never selected.
 */
async function fetchAttractions(
  client: Client,
  kind?: "attraction" | "experience",
  refine: (query: AttractionQuery) => AttractionQuery = (q) => q,
): Promise<Attraction[]> {
  let query = baseAttractions(client);
  if (kind) query = query.eq("kind", kind);
  const data = await rows<AttractionInput>(
    refine(query),
    kind ? `${kind} list` : "attractions",
  );
  return data.map(toAttraction);
}

function baseAttractions(client: Client) {
  return ordered(
    client
      .from("attractions")
      .select(ATTRACTION_SELECT)
      .eq("is_published", true),
  )
    .order("sort_order", { referencedTable: "attraction_images" })
    .order("created_at", { referencedTable: "attraction_images" });
}

async function fetchGalleryImages(
  client: Client,
  featuredOnly: boolean,
): Promise<GalleryImage[]> {
  let query = client
    .from("gallery_images")
    .select(GALLERY_IMAGE_SELECT)
    .eq("is_published", true);
  if (featuredOnly) {
    query = query.eq("is_featured", true);
  }
  query = ordered(query);
  if (featuredOnly) query = query.limit(MAX_GALLERY_IMAGES);
  const data = await rows<GalleryImageInput>(query, "gallery images");
  return data.flatMap((row) => toGalleryImage(row) ?? []);
}

// --- public API --------------------------------------------------------------

export async function getSiteChrome(
  client?: Client,
  now: Date = new Date(),
): Promise<{ settings: SiteSettings; announcement: Announcement | null }> {
  const c = resolveClient(client);
  const [settings, announcement] = await Promise.all([
    fetchSettings(c),
    fetchAnnouncement(c, now),
  ]);
  return { settings, announcement };
}

export async function getHomeContent(client?: Client): Promise<HomePageProps> {
  const c = resolveClient(client);
  const [
    settings,
    sections,
    experiences,
    featured,
    galleryImages,
    testimonials,
  ] = await Promise.all([
    fetchSettings(c),
    fetchSections(c, "home"),
    fetchAttractions(c, "experience"),
    fetchAttractions(c, "attraction", (q) =>
      q.eq("is_featured", true).limit(MAX_FEATURED_ATTRACTIONS),
    ),
    fetchGalleryImages(c, true),
    rows<Row<"testimonials">>(
      ordered(c.from("testimonials").select("*").eq("is_published", true)),
      "testimonials",
    ),
  ]);
  return selectHomeContent({
    settings,
    sections,
    attractions: [...experiences, ...featured],
    galleryImages,
    testimonials: testimonials.map(toTestimonial),
  });
}

export async function getDiscoverContent(
  client?: Client,
): Promise<DiscoverContent> {
  const c = resolveClient(client);
  const [sections, attractions] = await Promise.all([
    fetchSections(c, "home", "discover"),
    fetchAttractions(c),
  ]);
  return {
    intro: findSection(sections, "discover"),
    attractions: attractions.filter((a) => a.kind === "attraction"),
    experiences: attractions.filter((a) => a.kind === "experience"),
  };
}

export async function getAttractionBySlug(
  slug: string,
  client?: Client,
): Promise<Attraction | null> {
  const c = resolveClient(client);
  // Experiences have no detail page, so only attractions are looked up.
  const row = await read<AttractionInput | null>(
    c
      .from("attractions")
      .select(ATTRACTION_SELECT)
      .eq("slug", slug)
      .eq("kind", "attraction")
      .eq("is_published", true)
      .order("sort_order", { referencedTable: "attraction_images" })
      .order("created_at", { referencedTable: "attraction_images" })
      .maybeSingle(),
    "attraction",
  );
  return row ? toAttraction(row) : null;
}

export async function listPublishedAttractionSlugs(
  client?: Client,
): Promise<string[]> {
  const c = resolveClient(client);
  const data = await rows<{ slug: string }>(
    ordered(
      c
        .from("attractions")
        .select("slug")
        .eq("kind", "attraction")
        .eq("is_published", true),
    ),
    "attraction slugs",
  );
  return data.map((r) => r.slug);
}

export async function getGalleryContent(client?: Client): Promise<{
  intro: PageSection | null;
  categories: GalleryCategory[];
  images: GalleryImage[];
}> {
  const c = resolveClient(client);
  const [sections, categories, images] = await Promise.all([
    fetchSections(c, "home", "gallery"),
    rows<Row<"gallery_categories">>(
      ordered(
        c.from("gallery_categories").select("*").eq("is_published", true),
      ),
      "gallery categories",
    ),
    fetchGalleryImages(c, false),
  ]);
  return {
    intro: findSection(sections, "gallery"),
    categories: categories.map((r) => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
    })),
    images,
  };
}

export async function getAboutContent(
  client?: Client,
): Promise<{ sections: PageSection[] }> {
  return { sections: await fetchSections(resolveClient(client), "about") };
}

export async function getVisitContent(
  client?: Client,
): Promise<{ sections: PageSection[]; faqs: Faq[] }> {
  const c = resolveClient(client);
  const [sections, faqs] = await Promise.all([
    fetchSections(c, "visit"),
    rows<Row<"faqs">>(
      ordered(c.from("faqs").select("*").eq("is_published", true)),
      "faqs",
    ),
  ]);
  return { sections, faqs: faqs.map(toFaq) };
}
