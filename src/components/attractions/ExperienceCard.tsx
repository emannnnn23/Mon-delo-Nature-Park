import { ResponsiveImage } from "../common/ResponsiveImage";
import { SampleTag } from "../common/SampleTag";
import type { Attraction } from "../../types/content";
import { iconMap } from "./iconMap";

type ExperienceCardProps = {
  attraction: Attraction;
  /** Heading level of the card title. */
  headingLevel?: "h3" | "h4";
};

/**
 * Image card for an experience: a round forest badge with the experience icon
 * sits on the image's bottom edge, above a serif title and a two-line summary.
 */
export function ExperienceCard({
  attraction,
  headingLevel: Heading = "h3",
}: ExperienceCardProps) {
  const Icon = attraction.icon ? iconMap[attraction.icon] : null;
  return (
    <article className="flex h-full flex-col rounded-lg bg-[#fdfbf6] shadow-[0_18px_40px_-24px_rgb(110_91_67/0.45)] ring-1 ring-earth-700/10">
      <div className="relative aspect-[16/10] shrink-0">
        <div className="h-full overflow-hidden rounded-t-lg">
          <ResponsiveImage
            asset={attraction.cover}
            sizes="(min-width: 1280px) 220px, (min-width: 768px) 45vw, 78vw"
            className="xl:[&>span]:hidden"
          />
        </div>
        {attraction.isSample ? (
          <SampleTag className="absolute top-3 left-3" />
        ) : null}
        {Icon ? (
          <span
            aria-hidden="true"
            className="absolute bottom-0 left-1/2 flex size-12 -translate-x-1/2 translate-y-1/2 items-center justify-center rounded-full bg-forest-900 text-ivory-50 ring-4 ring-[#fdfbf6]"
          >
            <Icon className="size-5" strokeWidth={1.75} />
          </span>
        ) : null}
      </div>
      <div
        className={`flex flex-1 flex-col items-center px-4 pb-6 text-center ${
          Icon ? "pt-9" : "pt-5"
        }`}
      >
        <Heading className="font-serif text-xl leading-snug font-semibold break-words text-forest-900 xl:text-lg">
          {attraction.name}
        </Heading>
        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-ink-600">
          {attraction.summary}
        </p>
      </div>
    </article>
  );
}
