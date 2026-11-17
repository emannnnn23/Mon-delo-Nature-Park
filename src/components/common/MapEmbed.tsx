type MapEmbedProps = {
  src: string | null;
  title: string;
  className?: string;
};

/** Only Google Maps embed URLs may be framed; anything else is dropped. */
const GOOGLE_MAPS_EMBED = /^https:\/\/www\.google\.com\/maps\/embed(?:[/?#]|$)/;

/**
 * Lazy Google Maps iframe, 4:3 on mobile and 16:9 from md. A null src, or one
 * that is not a Google Maps embed URL, renders nothing.
 */
export function MapEmbed({ src, title, className = "" }: MapEmbedProps) {
  if (!src || !GOOGLE_MAPS_EMBED.test(src)) return null;
  return (
    <div
      className={`relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-cream-100 md:aspect-video ${className}`.trim()}
    >
      <iframe
        src={src}
        title={title}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        allowFullScreen
        className="absolute inset-0 h-full w-full border-0"
      />
    </div>
  );
}
