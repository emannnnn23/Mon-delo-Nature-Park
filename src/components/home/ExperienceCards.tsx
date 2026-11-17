import { useMediaQuery } from "../../hooks/useMediaQuery";
import { ExperienceCard } from "../attractions/ExperienceCard";
import type { Attraction } from "../../types/content";

type ExperienceCardsProps = {
  experiences: Attraction[];
  className?: string;
};

/**
 * The park's experiences as image cards: a swipeable row on phones, two
 * columns from `md`, four from `xl`. Renders nothing when there are none.
 */
export function ExperienceCards({
  experiences,
  className = "",
}: ExperienceCardsProps) {
  // From md the row is a static grid, so it needs no tab stop of its own.
  const isGrid = useMediaQuery("(min-width: 48rem)");
  if (experiences.length === 0) return null;
  return (
    <section aria-labelledby="experiences-title" className={className}>
      <h2 id="experiences-title" className="sr-only">
        Experiences
      </h2>
      <ul
        aria-label="Experiences"
        // Focusable so the phone scroll row (no links inside) can be scrolled by keyboard.
        tabIndex={isGrid ? undefined : 0}
        className="-mx-5 scrollbar-none flex snap-x snap-mandatory scroll-px-5 gap-4 overflow-x-auto px-5 pt-1 pb-6 sm:-mx-8 sm:scroll-px-8 sm:px-8 md:mx-0 md:grid md:grid-cols-2 md:gap-6 md:overflow-visible md:px-0 md:pb-0 xl:grid-cols-4 xl:gap-5"
      >
        {experiences.map((experience) => (
          <li
            key={experience.id}
            className="w-[78%] max-w-80 shrink-0 snap-start md:w-auto md:max-w-none"
          >
            <ExperienceCard attraction={experience} />
          </li>
        ))}
      </ul>
    </section>
  );
}
