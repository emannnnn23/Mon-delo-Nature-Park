import { ArrowRight, ArrowUpRight } from "lucide-react";
import { useState } from "react";
import { Button } from "../common/Button";
import { LeafDecor } from "../common/LeafDecor";
import { Lightbox } from "../common/Lightbox";
import { PlaceholderImage } from "../common/PlaceholderImage";
import { ResponsiveImage } from "../common/ResponsiveImage";
import type {
  GalleryImage,
  PageSection,
  SiteSettings,
  Testimonial,
} from "../../types/content";
import { GoogleRating } from "./GoogleRating";
import { TestimonialSlider } from "./TestimonialSlider";

type GalleryTestimonialsBandProps = {
  gallerySection: PageSection | null;
  testimonialsSection: PageSection | null;
  galleryImages: GalleryImage[];
  testimonials: Testimonial[];
  settings: SiteSettings;
};

const MOSAIC_AREAS = ["a", "b", "c", "d", "e"] as const;

/** Grid areas on `lg`: one large tile on the left, four small ones beside it. */
const AREA_CLASS: Record<(typeof MOSAIC_AREAS)[number], string> = {
  a: "col-span-2 aspect-[16/10] lg:col-span-1 lg:aspect-auto lg:[grid-area:a]",
  b: "aspect-[4/3] lg:aspect-auto lg:[grid-area:b]",
  c: "aspect-[4/3] lg:aspect-auto lg:[grid-area:c]",
  d: "aspect-[4/3] lg:aspect-auto lg:[grid-area:d]",
  e: "aspect-[4/3] lg:aspect-auto lg:[grid-area:e]",
};

const MOSAIC_GRID =
  "grid grid-cols-2 gap-2.5 sm:gap-3 lg:h-72 lg:grid-cols-[1.45fr_1fr_1.15fr] lg:grid-rows-2 lg:[grid-template-areas:'a_b_c'_'a_d_e']";

function Mosaic({ images }: { images: GalleryImage[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  if (images.length === 0) {
    // No photos yet: five quiet tiles, announced once as a single image.
    return (
      <div
        role="img"
        aria-label="Gallery photos coming soon"
        className={MOSAIC_GRID}
      >
        {MOSAIC_AREAS.map((area) => (
          <div
            key={area}
            className={`overflow-hidden rounded-md ${AREA_CLASS[area]}`}
          >
            <PlaceholderImage
              label="Gallery photos coming soon"
              className={
                area === "a" ? "xl:[&>span]:hidden" : "[&>span]:hidden"
              }
            />
          </div>
        ))}
      </div>
    );
  }

  const full = images.length >= MOSAIC_AREAS.length;
  return (
    <>
      <ul className={full ? MOSAIC_GRID : "grid grid-cols-2 gap-3"}>
        {images.slice(0, MOSAIC_AREAS.length).map((item, i) => (
          <li
            key={item.id}
            className={`overflow-hidden rounded-md ${
              full ? AREA_CLASS[MOSAIC_AREAS[i]] : "aspect-[4/3]"
            }`}
          >
            <button
              type="button"
              onClick={(event) => {
                // Safari does not focus a button on click; do it so focus
                // can return here when the viewer closes.
                event.currentTarget.focus();
                setOpenIndex(i);
              }}
              className="block h-full w-full cursor-zoom-in"
            >
              <ResponsiveImage
                asset={item.image}
                sizes={
                  i === 0
                    ? "(min-width: 1024px) 300px, 100vw"
                    : "(min-width: 1024px) 200px, 50vw"
                }
              />
            </button>
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

/**
 * Green band pairing the gallery preview with what guests say. Side by side
 * from `lg`, stacked below. Testimonials are only ever real, admin-entered
 * reviews; without any, the band shows the Google rating alone.
 */
export function GalleryTestimonialsBand({
  gallerySection,
  testimonialsSection,
  galleryImages,
  testimonials,
  settings,
}: GalleryTestimonialsBandProps) {
  const { googleRating, googleReviewCount, mapsListingUrl } = settings;

  return (
    <div
      data-surface="dark"
      className="relative isolate overflow-hidden bg-forest-900 py-16 text-ivory-50 md:py-20"
    >
      <LeafDecor position="left" surface="dark" className="-z-10" />
      <LeafDecor position="right" surface="dark" className="-z-10" />

      <div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)] gap-14 px-5 sm:px-8 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:gap-0">
        <section
          aria-labelledby="gallery-title"
          className="grid grid-cols-[minmax(0,1fr)] items-center gap-8 lg:pr-12 xl:grid-cols-[13rem_minmax(0,1fr)] xl:gap-10"
        >
          <div className="flex flex-col items-start">
            <div className="flex w-full items-center gap-4">
              <h2
                id="gallery-title"
                className="font-serif text-3xl leading-tight font-bold md:text-4xl"
              >
                {gallerySection?.heading ?? "Our Gallery"}
              </h2>
              <span
                aria-hidden="true"
                className="h-px max-w-24 flex-1 bg-gold-500/70 xl:hidden"
              />
            </div>
            {gallerySection?.body ? (
              <p className="mt-3 leading-relaxed text-ivory-50/85">
                {gallerySection.body}
              </p>
            ) : null}
            <Button
              to="/gallery"
              variant="outline-light"
              icon={ArrowRight}
              className="mt-6"
            >
              View Gallery
            </Button>
          </div>
          <Mosaic images={galleryImages} />
        </section>

        <section
          aria-labelledby="reviews-title"
          className="flex flex-col items-center justify-center gap-5 border-t border-ivory-50/15 pt-12 text-center lg:border-t-0 lg:border-l lg:border-gold-500/35 lg:pt-0 lg:pl-12"
        >
          <h2
            id="reviews-title"
            className="font-serif text-3xl leading-tight font-bold md:text-[2rem]"
          >
            {testimonialsSection?.heading ?? "What Our Guests Say"}
          </h2>
          {googleRating !== null ? (
            <GoogleRating
              rating={googleRating}
              reviewCount={googleReviewCount}
            />
          ) : null}
          {testimonials.length > 0 ? (
            <TestimonialSlider testimonials={testimonials} />
          ) : mapsListingUrl ? (
            <Button
              href={mapsListingUrl}
              target="_blank"
              rel="noopener noreferrer"
              variant="outline-light"
              icon={ArrowUpRight}
              className="mt-1"
            >
              Read reviews on Google
            </Button>
          ) : null}
        </section>
      </div>
    </div>
  );
}
