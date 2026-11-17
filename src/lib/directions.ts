import type { SiteSettings } from "../types/content";

/**
 * Google Maps directions link. A plus code needs the town and province to
 * resolve, so it is sent with them; otherwise the address line is used.
 */
export function directionsUrl(settings: SiteSettings): string {
  const destination = settings.plusCode
    ? `${settings.plusCode} Kawayan, Biliran`
    : settings.addressLine;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
}

/**
 * The address line without a leading plus code (and its comma), for places
 * that already show the plus code on its own. Returns the line unchanged when
 * there is no plus code or the line does not start with it.
 */
export function addressWithoutPlusCode(
  addressLine: string,
  plusCode: string | null,
): string {
  if (!plusCode || !addressLine.startsWith(plusCode)) return addressLine;
  return addressLine.slice(plusCode.length).replace(/^[\s,]+/, "");
}
