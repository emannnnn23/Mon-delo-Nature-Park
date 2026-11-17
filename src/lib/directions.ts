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
