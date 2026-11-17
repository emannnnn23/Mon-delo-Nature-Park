import { publicMediaUrl } from "../../lib/supabase";
import type { MediaAsset } from "../../types/content";
import { buildSrcSet, pickFallbackSrc } from "../../utils/imageVariants";
import { PlaceholderImage } from "./PlaceholderImage";

type ResponsiveImageProps = {
  asset: MediaAsset | null;
  /** The `sizes` attribute: how wide the image renders at each breakpoint. */
  sizes: string;
  /** Above-the-fold image: loads eagerly with high fetch priority. */
  priority?: boolean;
  className?: string;
};

/**
 * Renders a media asset with srcset, intrinsic size (no layout shift) and its
 * focal point. A null asset renders the placeholder tile instead.
 */
export function ResponsiveImage({
  asset,
  sizes,
  priority = false,
  className = "",
}: ResponsiveImageProps) {
  if (!asset) return <PlaceholderImage className={className} />;

  return (
    <img
      src={publicMediaUrl(pickFallbackSrc(asset.variants))}
      srcSet={buildSrcSet(asset.variants, publicMediaUrl)}
      sizes={sizes}
      alt={asset.alt}
      width={asset.width}
      height={asset.height}
      loading={priority ? undefined : "lazy"}
      fetchPriority={priority ? "high" : undefined}
      decoding="async"
      style={{ objectPosition: `${asset.focalX}% ${asset.focalY}%` }}
      className={`h-full w-full object-cover ${className}`.trim()}
    />
  );
}
