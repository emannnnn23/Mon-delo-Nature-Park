import type { PageKey } from "~/types/content";

export const PAGE_KEYS: readonly PageKey[] = ["home", "about", "visit"];

export function isPageKey(value: unknown): value is PageKey {
  return (
    typeof value === "string" &&
    (PAGE_KEYS as readonly string[]).includes(value)
  );
}

/** The page title shown at the top of each editor screen. */
export const PAGE_TITLES: Record<PageKey, string> = {
  home: "Homepage",
  about: "About page",
  visit: "Visit page",
};

/**
 * Human names for the sections the public site knows about, in the order they
 * appear on the page. A key missing from the database can be created from this
 * list with "Add section". The keys are the ones the public pages look up.
 */
export const SECTION_LABELS: Record<PageKey, Record<string, string>> = {
  home: {
    hero: "Top banner (hero)",
    intro: "Welcome introduction",
    discover: "Discover the park",
    gallery: "Photo gallery",
    testimonials: "Guest reviews",
    visit: "Visit us",
  },
  about: {
    intro: "Introduction",
    story: "Our story",
    mission: "Our mission",
    vision: "Our vision",
    surroundings: "Our surroundings",
  },
  visit: {
    intro: "Plan your visit",
    getting_here: "Getting here",
  },
};

/** One editable part of a section. `button` is the label and link together. */
export type SectionField = "eyebrow" | "heading" | "body" | "button" | "photo";

/**
 * The fields the public site actually shows for each section, so the owner is
 * only offered what has an effect. Other columns are never touched on save.
 */
export const SECTION_FIELDS: Record<PageKey, Record<string, SectionField[]>> = {
  home: {
    hero: ["heading", "body", "photo"],
    intro: ["eyebrow", "heading", "body", "button"],
    discover: ["heading", "body"],
    gallery: ["heading", "body"],
    testimonials: ["heading"],
    visit: ["heading", "body"],
  },
  about: {
    intro: ["heading", "body"],
    story: ["eyebrow", "heading", "body", "photo"],
    mission: ["eyebrow", "heading", "body", "photo"],
    vision: ["eyebrow", "heading", "body", "photo"],
    surroundings: ["eyebrow", "heading", "body", "photo"],
  },
  visit: {
    intro: ["heading", "body"],
    getting_here: ["heading", "body"],
  },
};

/** The offered fields of a section, or null when the site does not use it. */
export function fieldsFor(page: PageKey, key: string): SectionField[] | null {
  return SECTION_FIELDS[page][key] ?? null;
}

/**
 * Which kind of photo a section's image is. Only the home banner is shown
 * large, so its photo must be at least 800 px (`cover`); the about section
 * photos are shown smaller (`gallery`).
 */
export function imagePurposeFor(
  page: PageKey,
  key: string,
): "cover" | "gallery" {
  return page === "home" && key === "hero" ? "cover" : "gallery";
}

/** A readable name for a section: the known label, or the key tidied up. */
export function sectionLabel(page: PageKey, key: string): string {
  const known = SECTION_LABELS[page][key];
  if (known) return known;
  const words = key.replace(/[_-]+/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}
