import { useState } from "react";
import { Lightbox } from "../common/Lightbox";
import { ResponsiveImage } from "../common/ResponsiveImage";
import type { GalleryImage } from "../../types/content";

type GalleryGridProps = { images: GalleryImage[] };

/**
 * Photos in CSS columns (2 on phones, 3 from md, 4 from xl), each one a
 * button that opens the lightbox on that photo, with its caption below.
 */
export function GalleryGrid({ images }: GalleryGridProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <>
      <ul
        aria-label="Photos"
        className="columns-2 gap-3 sm:gap-4 md:columns-3 xl:columns-4"
      >
        {images.map(({ id, image, caption }, index) => (
          <li key={id} className="mb-3 break-inside-avoid sm:mb-4">
            <figure>
              <button
                type="button"
                onClick={(event) => {
                  // Safari does not focus a button on click; do it so focus
                  // can return here when the viewer closes.
                  event.currentTarget.focus();
                  setOpenIndex(index);
                }}
                className="block min-h-11 w-full cursor-zoom-in overflow-hidden rounded-lg ring-1 ring-earth-700/10"
                style={{ aspectRatio: `${image.width} / ${image.height}` }}
              >
                <ResponsiveImage
                  asset={image}
                  sizes="(min-width:1280px) 25vw, (min-width:768px) 33vw, 50vw"
                />
              </button>
              {caption ? (
                <figcaption className="mt-2 text-sm leading-relaxed text-ink-600">
                  {caption}
                </figcaption>
              ) : null}
            </figure>
          </li>
        ))}
      </ul>
      <Lightbox
        items={images}
        index={openIndex}
        onClose={() => setOpenIndex(null)}
        onIndexChange={setOpenIndex}
      />
    </>
  );
}
