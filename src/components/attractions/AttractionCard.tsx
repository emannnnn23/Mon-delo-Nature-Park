import { Link } from "react-router";
import { ResponsiveImage } from "../common/ResponsiveImage";
import { SampleTag } from "../common/SampleTag";
import type { Attraction } from "../../types/content";

export type AttractionCardVariant = "default" | "feature" | "compact";

type AttractionCardProps = {
  attraction: Attraction;
  /**
   * "feature" fills a tall grid cell with a larger title; "compact" lays the
   * image beside the text from `lg`. Both behave like "default" below `lg`.
   */
  variant?: AttractionCardVariant;
  sizes?: string;
  headingLevel?: "h2" | "h3";
};

const LAYOUT: Record<
  AttractionCardVariant,
  { card: string; media: string; title: string; placeholder?: string }
> = {
  default: {
    card: "flex-col",
    media: "aspect-[4/3]",
    title: "text-xl md:text-2xl",
  },
  feature: {
    card: "flex-col",
    media: "aspect-[4/3] lg:aspect-auto lg:min-h-80 lg:flex-1",
    title: "text-2xl md:text-3xl",
  },
  compact: {
    card: "flex-col lg:flex-row",
    media: "aspect-[4/3] lg:aspect-auto lg:w-[46%] lg:shrink-0",
    title: "text-xl md:text-2xl",
    // The side image is too narrow for the "Photo coming soon" pill.
    placeholder: "lg:[&>span]:hidden",
  },
};

/**
 * Card linking to an attraction's detail page. The title link stretches over
 * the whole card, so the card is one tab stop named by the attraction.
 */
export function AttractionCard({
  attraction,
  variant = "default",
  sizes = "(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 85vw",
  headingLevel: Heading = "h3",
}: AttractionCardProps) {
  const layout = LAYOUT[variant];
  return (
    <article
      className={`group relative flex h-full overflow-hidden rounded-lg bg-[#fdfbf6] shadow-[0_18px_40px_-24px_rgb(110_91_67/0.45)] ring-1 ring-earth-700/10 transition-shadow duration-300 hover:shadow-[0_24px_48px_-24px_rgb(110_91_67/0.6)] has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-forest-900 has-[a:focus-visible]:ring-offset-2 has-[a:focus-visible]:ring-offset-ivory-50 ${layout.card}`}
    >
      <div className={`relative overflow-hidden ${layout.media}`}>
        <div className="h-full transition-transform duration-700 ease-out group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100">
          <ResponsiveImage
            asset={attraction.cover}
            sizes={sizes}
            className={layout.placeholder}
          />
        </div>
      </div>
      <div className="flex min-w-0 flex-1 flex-col items-start gap-3 p-6 lg:p-7">
        {attraction.isSample ? <SampleTag /> : null}
        <Heading
          className={`max-w-full min-w-0 font-serif leading-tight font-semibold break-words text-forest-900 ${layout.title}`}
        >
          <Link
            to={`/discover/${attraction.slug}`}
            className="decoration-gold-500 decoration-2 underline-offset-4 group-hover:underline after:absolute after:inset-0 focus-visible:outline-none"
          >
            {attraction.name}
          </Link>
        </Heading>
        <p className="line-clamp-3 text-base leading-relaxed text-ink-600">
          {attraction.summary}
        </p>
      </div>
    </article>
  );
}
