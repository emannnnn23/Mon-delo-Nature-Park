import { AttractionCard } from "../components/attractions/AttractionCard";
import { ExperienceCard } from "../components/attractions/ExperienceCard";
import { SectionHeading } from "../components/common/SectionHeading";
import type { Attraction, PageSection } from "../types/content";

export type DiscoverPageProps = {
  intro: PageSection | null;
  attractions: Attraction[];
  experiences: Attraction[];
};

/**
 * Discover: a forest header band, the attractions as linked cards, then the
 * experiences. Each section is left out when it has nothing to show.
 */
export function DiscoverPage({
  intro,
  attractions,
  experiences,
}: DiscoverPageProps) {
  return (
    <>
      <header
        data-surface="dark"
        className="relative isolate overflow-hidden bg-forest-900 text-ivory-50"
      >
        {/* Low sun and ridge line, echoing the logo and the homepage hero. */}
        <svg
          aria-hidden="true"
          focusable="false"
          viewBox="0 0 1200 300"
          preserveAspectRatio="xMaxYMax slice"
          className="absolute inset-0 -z-10 h-full w-full"
        >
          <circle cx="930" cy="214" r="46" fill="#d6aa55" opacity="0.9" />
          <path
            d="M0 236 C160 196 280 192 420 220 S700 250 860 208 S1080 178 1200 206 V300 H0Z"
            fill="#244b3a"
          />
          <path
            d="M0 236 C160 196 280 192 420 220 S700 250 860 208 S1080 178 1200 206"
            fill="none"
            stroke="#d6aa55"
            strokeWidth="2"
            opacity="0.55"
          />
          <path
            d="M0 268 C220 238 420 250 640 266 S980 276 1200 250 V300 H0Z"
            fill="#10301f"
            opacity="0.7"
          />
        </svg>
        <div className="mx-auto max-w-7xl px-5 pt-14 pb-24 sm:px-8 md:pt-20 md:pb-32">
          <h1 className="max-w-3xl font-serif text-4xl leading-tight font-bold text-balance break-words md:text-6xl">
            {intro?.heading ?? "Discover the Park"}
          </h1>
          {intro?.body ? (
            <p className="mt-5 max-w-xl font-serif text-lg leading-relaxed text-ivory-50/90 italic md:text-xl">
              {intro.body}
            </p>
          ) : null}
        </div>
      </header>

      {attractions.length > 0 ? (
        <div className="bg-ivory-50 py-14 md:py-20">
          <div className="mx-auto max-w-7xl px-5 sm:px-8">
            <ul
              aria-label="Attractions"
              className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8 lg:grid-cols-3"
            >
              {attractions.map((attraction) => (
                <li key={attraction.id}>
                  <AttractionCard attraction={attraction} headingLevel="h2" />
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      {experiences.length > 0 ? (
        <section
          aria-labelledby="experiences-title"
          className="bg-cream-100/55 py-14 md:py-20"
        >
          <div className="mx-auto max-w-7xl px-5 sm:px-8">
            <SectionHeading id="experiences-title" title="Experiences" />
            <ul className="mt-10 grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 xl:grid-cols-4">
              {experiences.map((experience) => (
                <li key={experience.id}>
                  <ExperienceCard attraction={experience} />
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}
    </>
  );
}
