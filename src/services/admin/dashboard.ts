import { getSupabase } from "~/lib/supabase";
import type { SettingsRow } from "~/types/db-helpers";

import { notConfiguredError, toFriendlyError } from "./errors";
import { getSettings } from "./settings";

export type DashboardData = {
  counts: {
    publishedAttractions: number;
    galleryImages: number;
    publishedAnnouncements: number;
    newMessages: number;
  };
  recent: { source: string; id: string; title: string; updatedAt: string }[];
  missing: string[];
};

/** Owner-facing names of the tables the `recent_content_updates` view reads. */
export const RECENT_LABELS: Record<string, string> = {
  page_sections: "Page section",
  attractions: "Attraction",
  gallery_images: "Gallery photo",
  gallery_categories: "Gallery category",
  testimonials: "Testimonial",
  announcements: "Announcement",
  faqs: "FAQ",
  site_settings: "Contact & settings",
};

const blank = (value: string | null) => value === null || value.trim() === "";

/**
 * What the owner still has to fill in, in a fixed order. Only things the site
 * leaves out when unknown (contact details, links, reviews, photos) and the
 * count of sample items still to confirm.
 */
export function computeMissing(
  settings: SettingsRow,
  sampleCount: number,
  testimonialCount: number,
  galleryCount: number,
): string[] {
  const missing: string[] = [];
  if (blank(settings.phone)) missing.push("Phone number");
  if (blank(settings.email)) missing.push("Email address");
  if (blank(settings.opening_hours)) missing.push("Opening hours");
  if (
    [
      settings.facebook_url,
      settings.instagram_url,
      settings.tiktok_url,
      settings.youtube_url,
    ].every(blank)
  ) {
    missing.push("Social media links");
  }
  if (blank(settings.maps_listing_url))
    missing.push("Google Maps listing link");
  if (testimonialCount === 0) missing.push("Guest reviews");
  if (galleryCount === 0) missing.push("Park photos");
  if (sampleCount > 0) {
    missing.push(`${sampleCount} sample items still to confirm`);
  }
  return missing;
}

type CountTable =
  | "attractions"
  | "gallery_images"
  | "announcements"
  | "contact_messages"
  | "page_sections"
  | "testimonials";

/** A row count without fetching rows. */
async function count(
  table: CountTable,
  filter?: [column: string, value: string | boolean],
): Promise<number> {
  const supabase = getSupabase();
  if (!supabase) throw notConfiguredError();
  const query = (
    supabase.from(table) as unknown as {
      select(
        columns: string,
        options: { count: "exact"; head: true },
      ): CountQuery;
    }
  ).select("id", { count: "exact", head: true });
  const { count: total, error } = await (filter
    ? query.eq(filter[0], filter[1])
    : query);
  if (error) throw toFriendlyError(error);
  return total ?? 0;
}

type CountResult = PromiseLike<{ count: number | null; error: unknown }>;
interface CountQuery extends CountResult {
  eq(column: string, value: string | boolean): CountResult;
}

/**
 * Everything the dashboard shows: four counts, the 10 most recent updates and
 * the list of what is still missing.
 */
export async function getDashboard(): Promise<DashboardData> {
  const supabase = getSupabase();
  if (!supabase) throw notConfiguredError();

  const [
    publishedAttractions,
    galleryImages,
    publishedAnnouncements,
    newMessages,
    sampleSections,
    sampleAttractions,
    sampleImages,
    testimonials,
    settings,
    recent,
  ] = await Promise.all([
    count("attractions", ["is_published", true]),
    count("gallery_images"),
    count("announcements", ["is_published", true]),
    count("contact_messages", ["status", "new"]),
    count("page_sections", ["is_sample", true]),
    count("attractions", ["is_sample", true]),
    count("gallery_images", ["is_sample", true]),
    count("testimonials"),
    getSettings(),
    supabase
      .from("recent_content_updates")
      .select("source, id, title, updated_at")
      .order("updated_at", { ascending: false })
      .limit(10),
  ]);

  if (recent.error) throw toFriendlyError(recent.error);

  return {
    counts: {
      publishedAttractions,
      galleryImages,
      publishedAnnouncements,
      newMessages,
    },
    recent: (recent.data ?? []).flatMap((row) =>
      row.source && row.id && row.title && row.updated_at
        ? [
            {
              source: row.source,
              id: row.id,
              title: row.title,
              updatedAt: row.updated_at,
            },
          ]
        : [],
    ),
    missing: computeMissing(
      settings,
      sampleSections + sampleAttractions + sampleImages,
      testimonials,
      galleryImages,
    ),
  };
}
