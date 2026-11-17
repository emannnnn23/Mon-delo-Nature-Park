import { ArrowLeft } from "lucide-react";
import { Button } from "../components/common/Button";
import { ResponsiveImage } from "../components/common/ResponsiveImage";
import { SampleTag } from "../components/common/SampleTag";
import { HeroIllustration } from "../components/home/HeroIllustration";
import type { Attraction } from "../types/content";
import { splitParagraphs } from "../utils/text";

export type AttractionPageProps = { attraction: Attraction };

/**
 * One attraction: a 60vh hero (cover photo, or the illustrated landscape when
 * there is none), the description as paragraphs, any further photos, and a way
 * back to Discover. Description is rendered as text, never as HTML.
 */
export function AttractionPage({ attraction }: AttractionPageProps) {
  const paragraphs = splitParagraphs(attraction.description);
  const { images } = attraction;

  return (
    <>
      <header
        data-surface="dark"
        className="relative isolate flex min-h-[60vh] items-end overflow-hidden bg-forest-900 text-ivory-50"
      >
        <div className="absolute inset-0 -z-10">
          {attraction.cover ? (
            <ResponsiveImage asset={attraction.cover} sizes="100vw" priority />
          ) : (
            <HeroIllustration />
          )}
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-linear-to-t from-forest-900/90 via-forest-900/40 via-55% to-forest-900/10"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-linear-to-r from-forest-900/70 to-transparent"
          />
        </div>
        <div className="mx-auto w-full max-w-7xl px-5 pt-16 pb-10 sm:px-8 md:pb-14">
          {attraction.isSample ? <SampleTag className="mb-4" /> : null}
          <h1 className="max-w-4xl font-serif text-4xl leading-tight font-bold text-balance break-words text-ivory-50 [text-shadow:0_2px_28px_rgb(15_42_33/0.35)] md:text-6xl">
            {attraction.name}
          </h1>
          <p className="mt-4 max-w-2xl font-serif text-lg leading-relaxed text-ivory-50/90 italic md:text-xl">
            {attraction.summary}
          </p>
        </div>
      </header>

      <div className="bg-ivory-50 py-12 md:py-16">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          {paragraphs.length > 0 ? (
            <div className="max-w-prose space-y-5 text-lg leading-[1.75] text-ink-900">
              {paragraphs.map((text, index) => (
                <p key={index} className="break-words whitespace-pre-line">
                  {text}
                </p>
              ))}
            </div>
          ) : null}

          {images.length > 0 ? (
            <section
              aria-labelledby="attraction-photos"
              className={paragraphs.length > 0 ? "mt-14" : ""}
            >
              <h2
                id="attraction-photos"
                className="font-serif text-2xl font-bold text-forest-900 md:text-3xl"
              >
                More photos
              </h2>
              <ul
                aria-label="More photos"
                className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
              >
                {images.map(({ image, caption }) => (
                  <li key={image.id}>
                    <figure>
                      <div className="aspect-[4/3] overflow-hidden rounded-lg ring-1 ring-earth-700/10">
                        <ResponsiveImage
                          asset={image}
                          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                        />
                      </div>
                      {caption ? (
                        <figcaption className="mt-2 text-sm leading-relaxed text-ink-600">
                          {caption}
                        </figcaption>
                      ) : null}
                    </figure>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <div
            className={
              paragraphs.length > 0 || images.length > 0 ? "mt-14" : ""
            }
          >
            <Button to="/discover" variant="outline-dark">
              <ArrowLeft aria-hidden="true" className="size-4" />
              Back to Discover
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
