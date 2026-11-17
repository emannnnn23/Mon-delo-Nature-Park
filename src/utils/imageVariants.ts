type Variants = Record<number, string>;

function sortedWidths(variants: Variants): number[] {
  return Object.keys(variants)
    .map(Number)
    .sort((a, b) => a - b);
}

/** Builds a `srcset` value, widths ascending: `"<url> 480w, <url> 960w"`. */
export function buildSrcSet(
  variants: Variants,
  toUrl: (path: string) => string,
): string {
  return sortedWidths(variants)
    .map((width) => `${toUrl(variants[width])} ${width}w`)
    .join(", ");
}

/**
 * Picks the `src` for browsers that ignore `srcset`: the smallest variant at
 * or above `target`, otherwise the largest one. Returns "" for no variants.
 */
export function pickFallbackSrc(variants: Variants, target = 960): string {
  const widths = sortedWidths(variants);
  if (widths.length === 0) return "";
  const match = widths.find((width) => width >= target);
  return variants[match ?? widths[widths.length - 1]];
}
