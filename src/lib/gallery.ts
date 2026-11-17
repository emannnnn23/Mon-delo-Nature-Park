import type { GalleryCategory } from "../types/content";

/**
 * Maps the `?category=` value to a category id. Returns null, meaning "All",
 * for a missing or unknown slug.
 */
export function resolveCategory(
  param: string | null,
  categories: GalleryCategory[],
): string | null {
  if (!param) return null;
  return categories.find((category) => category.slug === param)?.id ?? null;
}
