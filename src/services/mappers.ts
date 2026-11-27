import { ATTRACTION_ICONS } from "../types/content";
import type {
  Announcement,
  Attraction,
  AttractionIcon,
  AttractionKind,
  Faq,
  GalleryImage,
  MediaAsset,
  PageSection,
  SiteSettings,
  Testimonial,
} from "../types/content";
import type { Row } from "../types/db-helpers";

/**
 * Pure mappers from database rows (with their embedded media) to the domain
 * types the pages render. They do no I/O and never throw on odd data: a value
 * they cannot trust becomes null (or is left out) instead.
 */

/** A `numeric` column: PostgREST may send a number or a string. */
type NumericValue = number | string | null;

function toNumber(value: NumericValue | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

/** `variants` is jsonb: keep only `"<width>": "<path>"` pairs, widths as numbers. */
function toVariants(raw: unknown): Record<number, string> {
  const out: Record<number, string> = {};
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return out;
  for (const [key, path] of Object.entries(raw)) {
    const width = Number(key);
    if (
      Number.isInteger(width) &&
      width > 0 &&
      typeof path === "string" &&
      path !== ""
    ) {
      out[width] = path;
    }
  }
  return out;
}

export function toMediaAsset(row: Row<"media"> | null): MediaAsset | null {
  if (!row) return null;
  return {
    id: row.id,
    alt: row.alt_text,
    width: row.width,
    height: row.height,
    variants: toVariants(row.variants),
    focalX: row.focal_x,
    focalY: row.focal_y,
  };
}

export type SettingsInput = Omit<Row<"site_settings">, "google_rating"> & {
  google_rating: NumericValue;
  default_og: Row<"media"> | null;
};

export function toSettings(row: SettingsInput): SiteSettings {
  return {
    parkName: row.park_name,
    tagline: row.tagline,
    shortDescription: row.short_description,
    addressLine: row.address_line,
    plusCode: row.plus_code,
    latitude: toNumber(row.latitude),
    longitude: toNumber(row.longitude),
    mapsEmbedUrl: row.maps_embed_url,
    mapsListingUrl: row.maps_listing_url,
    phone: row.phone,
    email: row.email,
    openingHours: row.opening_hours,
    socials: {
      facebook: row.facebook_url,
      instagram: row.instagram_url,
      tiktok: row.tiktok_url,
      youtube: row.youtube_url,
    },
    googleRating: toNumber(row.google_rating),
    googleReviewCount: toNumber(row.google_review_count),
    defaultOgImage: toMediaAsset(row.default_og),
  };
}

export type PageSectionInput = Row<"page_sections"> & {
  image: Row<"media"> | null;
};

export function toPageSection(row: PageSectionInput): PageSection {
  return {
    key: row.key,
    eyebrow: row.eyebrow,
    heading: row.heading,
    body: row.body,
    ctaLabel: row.cta_label,
    ctaHref: row.cta_href,
    image: toMediaAsset(row.image),
    isSample: row.is_sample,
  };
}

export type AttractionInput = Row<"attractions"> & {
  cover: Row<"media"> | null;
  /** Already limited to a published parent and ordered by the query. */
  images?: {
    id: string;
    caption: string | null;
    image: Row<"media"> | null;
  }[];
};

function toIcon(value: string | null): AttractionIcon | null {
  return (ATTRACTION_ICONS as readonly string[]).includes(value ?? "")
    ? (value as AttractionIcon)
    : null;
}

function toKind(value: string): AttractionKind {
  return value === "experience" ? "experience" : "attraction";
}

export function toAttraction(row: AttractionInput): Attraction {
  const images: Attraction["images"] = [];
  for (const item of row.images ?? []) {
    const image = toMediaAsset(item.image);
    // The id is the attraction_images row, not the media asset.
    if (image) images.push({ id: item.id, image, caption: item.caption });
  }
  return {
    id: row.id,
    kind: toKind(row.kind),
    slug: row.slug,
    name: row.name,
    summary: row.summary,
    description: row.description,
    icon: toIcon(row.icon),
    cover: toMediaAsset(row.cover),
    images,
    isFeatured: row.is_featured,
    isSample: row.is_sample,
  };
}

export type GalleryImageInput = Row<"gallery_images"> & {
  image: Row<"media"> | null;
  /** The embedded category; null when there is none or it is not readable. */
  category: { id: string; is_published: boolean } | null;
};

/**
 * Null when the photo's media row is missing (nothing to show). A photo whose
 * category is unpublished keeps showing under All, with no category.
 */
export function toGalleryImage(row: GalleryImageInput): GalleryImage | null {
  const image = toMediaAsset(row.image);
  if (!image) return null;
  return {
    id: row.id,
    image,
    caption: row.caption,
    categoryId: row.category?.is_published ? row.category.id : null,
    isFeatured: row.is_featured,
    isSample: row.is_sample,
  };
}

function toSource(value: string): Testimonial["source"] {
  return value === "google" || value === "facebook" ? value : "direct";
}

export function toTestimonial(row: Row<"testimonials">): Testimonial {
  return {
    id: row.id,
    authorName: row.author_name,
    quote: row.quote,
    rating: toNumber(row.rating),
    source: toSource(row.source),
    sourceUrl: row.source_url,
    reviewDate: row.review_date,
  };
}

export function toAnnouncement(row: Row<"announcements">): Announcement {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    linkLabel: row.link_label,
    linkHref: row.link_href,
  };
}

export function toFaq(row: Row<"faqs">): Faq {
  return { id: row.id, question: row.question, answer: row.answer };
}
