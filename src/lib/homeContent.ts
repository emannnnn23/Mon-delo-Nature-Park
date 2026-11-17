import type {
  Attraction,
  GalleryImage,
  PageSection,
  SiteSettings,
  Testimonial,
} from "../types/content";

export type HomePageProps = {
  settings: SiteSettings;
  sections: PageSection[];
  experiences: Attraction[];
  featuredAttractions: Attraction[];
  galleryImages: GalleryImage[];
  testimonials: Testimonial[];
};

/** Published content the homepage draws from (home sections only). */
export type HomeContentSource = {
  settings: SiteSettings;
  sections: PageSection[];
  attractions: Attraction[];
  galleryImages: GalleryImage[];
  testimonials: Testimonial[];
};

const MAX_FEATURED_ATTRACTIONS = 3;
const MAX_GALLERY_IMAGES = 5;
const MAX_META_DESCRIPTION = 155;
const FALLBACK_DESCRIPTION =
  "Mondelos Nature Park in Kawayan, Biliran, Philippines.";

/** Picks what the homepage shows from the published content. */
export function selectHomeContent(source: HomeContentSource): HomePageProps {
  return {
    settings: source.settings,
    sections: source.sections,
    experiences: source.attractions.filter((a) => a.kind === "experience"),
    featuredAttractions: source.attractions
      .filter((a) => a.kind === "attraction" && a.isFeatured)
      .slice(0, MAX_FEATURED_ATTRACTIONS),
    galleryImages: source.galleryImages
      .filter((g) => g.isFeatured)
      .slice(0, MAX_GALLERY_IMAGES),
    testimonials: source.testimonials,
  };
}

/** Finds a section by key, or null. */
export function findSection(
  sections: PageSection[],
  key: string,
): PageSection | null {
  return sections.find((s) => s.key === key) ?? null;
}

/** Cuts text to `max` characters at a word boundary, adding an ellipsis. */
export function truncateText(text: string, max: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  const head = lastSpace > 0 ? cut.slice(0, lastSpace) : cut;
  return `${head.replace(/[\s,;:.]+$/, "")}…`;
}

/** Meta description for the homepage: the intro body, at most 155 characters. */
export function homeMetaDescription(sections: PageSection[]): string {
  const body = findSection(sections, "intro")?.body;
  return body ? truncateText(body, MAX_META_DESCRIPTION) : FALLBACK_DESCRIPTION;
}
