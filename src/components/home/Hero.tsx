import { ArrowRight, MapPin } from "lucide-react";
import type { CSSProperties } from "react";
import { Button } from "../common/Button";
import { ResponsiveImage } from "../common/ResponsiveImage";
import type { PageSection } from "../../types/content";
import { HeroIllustration } from "./HeroIllustration";

type HeroProps = { section: PageSection | null };

const FALLBACK_HEADING = "Find Your Peace in Nature.";

/** Splits "Find Your Peace in Nature." into the ivory and gold lines. */
function splitHeading(heading: string): [string, string | null] {
  const at = heading.indexOf(" in ");
  if (at <= 0) return [heading, null];
  return [heading.slice(0, at), heading.slice(at + 1)];
}

/** Staggered entrance; CSS drops it entirely under reduced motion. */
function rise(delayMs: number): {
  className: string;
  style: CSSProperties;
} {
  return {
    className: "motion-safe:animate-rise",
    style: { animationDelay: `${delayMs}ms` },
  };
}

/**
 * Full-bleed opening band under the transparent header. Shows the hero photo
 * when there is one, otherwise an illustrated landscape; a dark scrim from the
 * left and bottom keeps the header and heading legible on either.
 */
export function Hero({ section }: HeroProps) {
  const [lead, accent] = splitHeading(section?.heading ?? FALLBACK_HEADING);
  const body = section?.body;
  const image = section?.image ?? null;

  return (
    <section
      data-surface="dark"
      aria-labelledby="hero-title"
      className="relative isolate flex h-[100svh] min-h-[560px] flex-col overflow-hidden bg-forest-900 text-ivory-50 lg:h-[88vh]"
    >
      <div className="absolute inset-0 -z-10">
        {image ? (
          <ResponsiveImage asset={image} sizes="100vw" priority />
        ) : (
          <HeroIllustration />
        )}
        {/* Scrim: top for the header, left and bottom for the copy. */}
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-40 bg-linear-to-b from-forest-900/70 to-transparent"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-linear-to-r from-forest-900/90 via-forest-900/55 to-forest-900/0 md:via-forest-900/45"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-linear-to-t from-forest-900/85 via-forest-900/10 via-45% to-transparent"
        />
      </div>

      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col justify-center px-5 pt-24 pb-6 sm:px-8 lg:pt-20">
        <div className="max-w-3xl">
          <div
            className={`flex items-center gap-4 ${rise(0).className}`}
            style={rise(0).style}
          >
            <span className="inline-flex items-center gap-2 rounded-full bg-forest-900/55 px-4 py-1.5 text-sm font-medium text-ivory-50 ring-1 ring-gold-500/45 backdrop-blur-sm">
              <MapPin aria-hidden="true" className="size-4 text-gold-500" />
              Kawayan, Biliran, Philippines
            </span>
            <span
              aria-hidden="true"
              className="hidden h-px w-28 bg-gold-500/70 sm:block"
            />
          </div>

          <h1
            id="hero-title"
            className={`mt-6 font-serif text-[clamp(2.5rem,1.4rem+4.6vw,5.5rem)] leading-[1.03] font-bold tracking-[-0.01em] text-balance text-ivory-50 [text-shadow:0_2px_28px_rgb(15_42_33/0.35)] ${rise(90).className}`}
            style={rise(90).style}
          >
            {accent ? (
              <>
                {lead} <br />
                <span className="text-gold-500">{accent}</span>
              </>
            ) : (
              lead
            )}
          </h1>

          {body ? (
            <p
              className={`mt-5 max-w-xl font-serif text-lg leading-relaxed text-ivory-50/90 italic md:text-2xl md:leading-snug ${rise(180).className}`}
              style={rise(180).style}
            >
              {body}
            </p>
          ) : null}

          <div
            className={`mt-8 flex flex-wrap gap-3 sm:gap-4 ${rise(260).className}`}
            style={rise(260).style}
          >
            <Button to="/discover" variant="gold" icon={ArrowRight}>
              Explore the Park
            </Button>
            <Button to="/visit" variant="outline-light">
              Plan Your Visit
            </Button>
          </div>
        </div>
      </div>

      <a
        href="#welcome"
        className="mb-5 flex min-h-11 flex-col items-center gap-1.5 self-center rounded-full px-4 py-1 text-xs font-medium tracking-wide text-ivory-50/85 transition-colors hover:text-gold-500"
      >
        <svg
          aria-hidden="true"
          focusable="false"
          viewBox="0 0 24 36"
          className="h-8 w-auto"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
        >
          <rect x="2" y="2" width="20" height="32" rx="10" />
          <line
            x1="12"
            y1="9"
            x2="12"
            y2="14"
            strokeLinecap="round"
            className="motion-safe:animate-scroll-cue"
          />
        </svg>
        Scroll Down
      </a>
    </section>
  );
}
