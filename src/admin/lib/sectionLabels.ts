/** The pages whose sections the owner edits in the admin. */
export type PageKey = "home" | "about" | "visit";

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

/**
 * Which kind of photo a section's image is. The big banner and introduction
 * photos are shown large, so they must be at least 800 px (`cover`); the rest
 * are shown smaller (`gallery`).
 */
export function imagePurposeFor(key: string): "cover" | "gallery" {
  return key === "hero" || key === "intro" ? "cover" : "gallery";
}

/** A readable name for a section: the known label, or the key tidied up. */
export function sectionLabel(page: PageKey, key: string): string {
  const known = SECTION_LABELS[page][key];
  if (known) return known;
  const words = key.replace(/[_-]+/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}
