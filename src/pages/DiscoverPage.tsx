import { AttractionCard } from "../components/attractions/AttractionCard";
import { ExperienceCard } from "../components/attractions/ExperienceCard";
import { PageHeader } from "../components/common/PageHeader";
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
      <PageHeader
        title={intro?.heading ?? "Discover the Park"}
        body={intro?.body}
      />

      {attractions.length === 0 && experiences.length === 0 ? (
        <div className="bg-ivory-50 py-14 md:py-20">
          <p className="mx-auto max-w-7xl px-5 text-center text-lg text-ink-600 sm:px-8">
            Attractions will be listed here soon.
          </p>
        </div>
      ) : null}

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
