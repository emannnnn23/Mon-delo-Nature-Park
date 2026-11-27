import type { SiteSettings } from "~/types/content";
import { SITE_NAME } from "./meta";

/**
 * The chrome the public error boundary falls back to when the layout's own
 * data could not be loaded (offline, and no pre-rendered snapshot for the
 * path). Client-safe, and deliberately not the placeholder content: it holds
 * the park's name and nothing else, so no contact detail, address, hours,
 * link or rating is ever invented or shown stale.
 */
export const FALLBACK_SETTINGS: SiteSettings = {
  parkName: SITE_NAME,
  tagline: null,
  shortDescription: null,
  addressLine: "",
  plusCode: null,
  latitude: null,
  longitude: null,
  mapsEmbedUrl: null,
  mapsListingUrl: null,
  phone: null,
  email: null,
  openingHours: null,
  socials: { facebook: null, instagram: null, tiktok: null, youtube: null },
  googleRating: null,
  googleReviewCount: null,
  defaultOgImage: null,
};
