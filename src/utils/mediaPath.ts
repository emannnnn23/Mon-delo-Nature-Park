/** Widths (px) a photo is resized to, smallest first. */
export const VARIANT_WIDTHS = [480, 960, 1600, 2400] as const;

/**
 * Bucket key of one size of a photo, e.g. `2026/blue-lagoon-ab12cd-960.webp`.
 * It never starts with `/`: it is a key in the `media` bucket, not a site path.
 */
export function buildMediaPath({
  year,
  base,
  id,
  width,
  ext,
}: {
  year: number;
  base: string;
  id: string;
  width: number;
  ext: "webp" | "jpg";
}): string {
  return `${year}/${base}-${id}-${width}.${ext}`;
}

/**
 * The widths to produce for a photo `originalWidth` px wide: every standard
 * width that is not larger than the photo (never upscale). A photo narrower
 * than the smallest standard width gets one variant at its own width.
 */
export function planVariantWidths(originalWidth: number): number[] {
  const widths = VARIANT_WIDTHS.filter((w) => w <= originalWidth);
  return widths.length > 0 ? widths : [originalWidth];
}
