import { ArrowRight } from "lucide-react";
import { Link } from "react-router";
import {
  AttractionCard,
  type AttractionCardVariant,
} from "../attractions/AttractionCard";
import { SectionHeading } from "../common/SectionHeading";
import type { Attraction, PageSection } from "../../types/content";

type DiscoverPreviewProps = {
  section: PageSection | null;
  attractions: Attraction[];
};

function variantFor(index: number, count: number): AttractionCardVariant {
  if (count < 3) return "default";
  return index === 0 ? "feature" : "compact";
}

/**
 * Up to three featured attractions in an editorial layout: one large card
 * beside two stacked ones on `lg`. Renders nothing when none are featured.
 */
export function DiscoverPreview({
  section,
  attractions,
}: DiscoverPreviewProps) {
  if (attractions.length === 0) return null;
  const editorial = attractions.length >= 3;

  return (
    <section
      aria-labelledby="discover-title"
      className="bg-cream-100/55 py-16 md:py-24"
    >
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-4">
          <SectionHeading
            id="discover-title"
            title={section?.heading ?? "Discover the Park"}
            subtitle={section?.body}
          />
          <Link
            to="/discover"
            className="group inline-flex min-h-11 items-center gap-2 font-semibold text-forest-900 underline decoration-gold-500 decoration-2 underline-offset-[6px] hover:decoration-forest-900"
          >
            See all attractions
            <ArrowRight
              aria-hidden="true"
              className="size-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
            />
          </Link>
        </div>

        <ul
          className={`-mx-5 mt-10 flex snap-x snap-mandatory scroll-px-5 gap-4 overflow-x-auto px-5 pt-1 pb-6 sm:-mx-8 sm:scroll-px-8 sm:px-8 md:mx-0 md:grid md:grid-cols-2 md:gap-6 md:overflow-visible md:px-0 md:pb-0 ${
            editorial
              ? "lg:grid-cols-[1.25fr_1fr] lg:grid-rows-2"
              : "lg:grid-cols-3"
          }`}
        >
          {attractions.map((attraction, index) => (
            <li
              key={attraction.id}
              className={`w-[85%] max-w-96 shrink-0 snap-start md:w-auto md:max-w-none ${
                editorial && index === 0
                  ? "md:col-span-2 lg:col-span-1 lg:row-span-2"
                  : ""
              }`}
            >
              <AttractionCard
                attraction={attraction}
                variant={variantFor(index, attractions.length)}
                sizes={
                  editorial && index === 0
                    ? "(min-width: 1024px) 680px, (min-width: 768px) 100vw, 85vw"
                    : "(min-width: 1024px) 260px, (min-width: 768px) 50vw, 85vw"
                }
              />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
