/** Only Google Maps embed addresses may be framed on the website. */
const GOOGLE_MAPS_EMBED = /^https:\/\/www\.google\.com\/maps\/embed(?:[/?#]|$)/;

/** True for an https://www.google.com/maps/embed address, and nothing else. */
export function isGoogleEmbed(url: string | null | undefined): boolean {
  return typeof url === "string" && GOOGLE_MAPS_EMBED.test(url);
}
