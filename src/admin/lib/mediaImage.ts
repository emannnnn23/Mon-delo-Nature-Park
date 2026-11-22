import { mediaVariantUrl } from "~/lib/media";
import { pickFallbackSrc } from "~/utils/imageVariants";
import type { MediaRow } from "~/types/db-helpers";

/** The `variants` column as `{ width: bucket key }`, ignoring anything odd. */
function variantMap(variants: MediaRow["variants"]): Record<number, string> {
  const out: Record<number, string> = {};
  if (typeof variants !== "object" || variants === null) return out;
  if (Array.isArray(variants)) return out;
  for (const [width, path] of Object.entries(variants)) {
    const n = Number(width);
    if (Number.isFinite(n) && typeof path === "string") out[n] = path;
  }
  return out;
}

/**
 * URL of the smallest variant at or above `target` px (the largest if none is
 * that big), for thumbnails and previews. Empty string when there are none.
 */
export function mediaPreviewUrl(
  media: Pick<MediaRow, "variants">,
  target = 480,
): string {
  const path = pickFallbackSrc(variantMap(media.variants), target);
  return path === "" ? "" : mediaVariantUrl(path);
}
