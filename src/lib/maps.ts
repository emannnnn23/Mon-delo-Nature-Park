/** Only Google Maps embed addresses may be framed on the website. */
const GOOGLE_MAPS_EMBED = /^https:\/\/www\.google\.com\/maps\/embed(?:[/?#]|$)/;

const IFRAME_SRC = /<iframe\b[^>]*?\bsrc\s*=\s*(["'])(.*?)\1/i;

/**
 * Google Maps' "Embed a map" gives an HTML snippet. Owners paste the whole
 * snippet; this keeps only the map address inside it (with `&amp;` turned
 * back into `&`). A plain address is returned trimmed, and anything else is
 * returned trimmed and unchanged so validation can explain what is wrong.
 */
export function extractMapEmbedUrl(input: string): string {
  const value = input.trim();
  const match = IFRAME_SRC.exec(value);
  return match ? match[2].replace(/&amp;/g, "&").trim() : value;
}

/** True for an https://www.google.com/maps/embed address, and nothing else. */
export function isGoogleEmbed(url: string | null | undefined): boolean {
  return typeof url === "string" && GOOGLE_MAPS_EMBED.test(url);
}
