/** Shown near any category choice: what a hidden category means publicly. */
export const HIDDEN_CATEGORY_HINT =
  "Photos in a hidden category still appear under All on the public gallery.";

/** A category's name as the owner sees it in a list: hidden ones say so. */
export function categoryLabel(category: {
  name: string;
  is_published: boolean;
}): string {
  return category.is_published ? category.name : `${category.name} (hidden)`;
}
