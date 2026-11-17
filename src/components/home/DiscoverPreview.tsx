import { ArrowRight } from "lucide-react";
import { Link } from "react-router";
import {
  AttractionCard,
  type AttractionCardVariant,
} from "../attractions/AttractionCard";
import { Reveal } from "../common/Reveal";
import { SectionHeading } from "../common/SectionHeading";
import type { Attraction, PageSection } from "../../types/content";

type DiscoverPreviewProps = {
  section: PageSection | null;
  attractions: Attraction[];
};

type Layout = {
  list: string;
  item: (index: number) => string;
  variant: (index: number) => AttractionCardVariant;
  sizes: (index: number) => string;
};

/** Swipeable row on phones, a grid from `md`. */
const ROW =
  "-mx-5 flex snap-x snap-mandatory scroll-px-5 gap-4 overflow-x-auto scrollbar-none px-5 pt-1 pb-6 sm:-mx-8 sm:scroll-px-8 sm:px-8 md:mx-0 md:grid md:grid-cols-2 md:gap-6 md:overflow-visible md:px-0 md:pb-0";
const ROW_ITEM = "w-[85%] max-w-96 shrink-0 snap-start md:w-auto md:max-w-none";
const HALF = "(min-width: 768px) 50vw, 85vw";

/** One card: full width, image beside the text from `lg`. */
const SINGLE: Layout = {
  list: "mt-10 grid grid-cols-1",
  item: () => "",
  variant: () => "compact",
  sizes: () => "(min-width: 1024px) 560px, 100vw",
};

/** Two cards: two equal columns from `md`, no empty third column. */
const PAIR: Layout = {
  list: `mt-10 ${ROW}`,
  item: () => ROW_ITEM,
  variant: () => "default",
  sizes: () => `(min-width: 1024px) 600px, ${HALF}`,
};

/** Three cards: one large card beside two stacked ones on `lg`. */
const EDITORIAL: Layout = {
  list: `mt-10 ${ROW} lg:grid-cols-[1.25fr_1fr] lg:grid-rows-2`,
  item: (i) =>
    i === 0
      ? `${ROW_ITEM} md:col-span-2 lg:col-span-1 lg:row-span-2`
      : ROW_ITEM,
  variant: (i) => (i === 0 ? "feature" : "compact"),
  sizes: (i) =>
    i === 0
      ? "(min-width: 1024px) 680px, (min-width: 768px) 100vw, 85vw"
      : `(min-width: 1024px) 260px, ${HALF}`,
};

function layoutFor(count: number): Layout {
  if (count === 1) return SINGLE;
  if (count === 2) return PAIR;
  return EDITORIAL;
}

/**
 * Up to three featured attractions in an editorial layout: one large card
 * beside two stacked ones on `lg`; two share the row equally and one spans
 * it. Renders nothing when none are featured.
 */
export function DiscoverPreview({
  section,
  attractions,
}: DiscoverPreviewProps) {
  if (attractions.length === 0) return null;
  const layout = layoutFor(attractions.length);

  return (
    <section
      aria-labelledby="discover-title"
      className="bg-cream-100/55 py-16 md:py-24"
    >
      <Reveal className="mx-auto max-w-7xl px-5 sm:px-8">
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

        <ul className={layout.list}>
          {attractions.map((attraction, index) => (
            <li key={attraction.id} className={layout.item(index) || undefined}>
              <AttractionCard
                attraction={attraction}
                variant={layout.variant(index)}
                sizes={layout.sizes(index)}
              />
            </li>
          ))}
        </ul>
      </Reveal>
    </section>
  );
}
