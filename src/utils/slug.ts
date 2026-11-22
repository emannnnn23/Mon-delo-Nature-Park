/**
 * Lowercase ASCII slug: diacritics stripped (NFKD), every run of other
 * characters becomes one `-`, trimmed. Returns `'image'` when nothing usable
 * is left (for example a name made only of symbols).
 */
export function slugify(input: string, maxLength = 60): string {
  const slug = input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, maxLength)
    .replace(/-+$/g, "");
  return slug === "" ? "image" : slug;
}

const ID_CHARS = "abcdefghijklmnopqrstuvwxyz0123456789";

/** 6 random characters from `[a-z0-9]`, from `crypto.getRandomValues`. */
export function shortId(): string {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  // 256 is not a multiple of 36, so the first characters are very slightly
  // more likely: irrelevant for a name suffix that only avoids collisions.
  return Array.from(bytes, (b) => ID_CHARS[b % ID_CHARS.length]).join("");
}

/**
 * Plain words from a file name, to pre-fill a photo description:
 * `"blue_lagoon-view.JPG"` becomes `"blue lagoon view"`. Empty when nothing
 * but an extension or symbols remain.
 */
export function wordsFromFilename(name: string): string {
  return name
    .replace(/\.[a-z0-9]{1,5}$/i, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}
