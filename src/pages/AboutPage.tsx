import { ArrowRight } from "lucide-react";

import { Button } from "../components/common/Button";
import { PageHeader } from "../components/common/PageHeader";
import { ResponsiveImage } from "../components/common/ResponsiveImage";
import { SampleTag } from "../components/common/SampleTag";
import type { PageSection } from "../types/content";
import { splitParagraphs } from "../utils/text";

export type AboutPageProps = {
  sections: PageSection[];
};

const PAGE_TITLE = "About the Park";

/** Display order. Anything else in the data is not shown on this page. */
const ORDER = ["intro", "story", "mission", "vision", "surroundings"] as const;

/** Neutral structural labels, used only when a section has no heading. */
const FALLBACK_LABEL: Record<string, string> = {
  story: "Our Story",
  mission: "Our Mission",
  vision: "Our Vision",
  surroundings: "Natural Surroundings",
};

function Body({ text }: { text: string | null }) {
  const paragraphs = splitParagraphs(text);
  if (paragraphs.length === 0) return null;
  return (
    <div className="max-w-prose space-y-5 text-base leading-relaxed text-ink-600 md:text-lg">
      {paragraphs.map((paragraph, i) => (
        <p key={i}>{paragraph}</p>
      ))}
    </div>
  );
}

/**
 * About: a forest header band, an introduction, then story, mission, vision
 * and surroundings in turn, each only when the park has provided it.
 */
export function AboutPage({ sections }: AboutPageProps) {
  const byKey = new Map(sections.map((s) => [s.key, s]));
  const intro = byKey.get("intro") ?? null;
  const rest = ORDER.filter((key) => key !== "intro")
    .map((key) => byKey.get(key))
    .filter((s): s is PageSection => s !== undefined);

  // The h1 already says "About the Park"; an intro heading that repeats it
  // would only echo it.
  const introHeading =
    intro?.heading && intro.heading !== PAGE_TITLE ? intro.heading : null;

  return (
    <>
      <PageHeader title={PAGE_TITLE} />

      {intro ? (
        <section
          aria-label={introHeading ? undefined : "Introduction"}
          aria-labelledby={introHeading ? "about-intro" : undefined}
          className="bg-ivory-50 py-14 md:py-20"
        >
          <div className="mx-auto max-w-7xl px-5 sm:px-8">
            <div className="max-w-3xl border-l-2 border-gold-500 pl-6 md:pl-8">
              {intro.isSample ? <SampleTag className="mb-4" /> : null}
              {introHeading ? (
                <h2
                  id="about-intro"
                  className="mb-4 font-serif text-3xl leading-tight font-bold text-forest-900 md:text-4xl"
                >
                  {introHeading}
                </h2>
              ) : null}
              <Body text={intro.body} />
            </div>
          </div>
        </section>
      ) : null}

      {rest.map((section, index) => {
        const id = `about-${section.key}`;
        const heading = section.heading ?? FALLBACK_LABEL[section.key];
        return (
          <section
            key={section.key}
            aria-labelledby={id}
            className={`py-14 md:py-20 ${
              index % 2 === 0 ? "bg-cream-100/55" : "bg-ivory-50"
            }`}
          >
            <div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)] gap-6 px-5 sm:px-8 lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)] lg:gap-16">
              <div className="flex flex-col items-start gap-3">
                {section.eyebrow ? (
                  <p className="text-sm font-medium tracking-[0.22em] text-earth-700 uppercase">
                    {section.eyebrow}
                  </p>
                ) : null}
                <h2
                  id={id}
                  className="font-serif text-3xl leading-tight font-bold text-balance text-forest-900 md:text-4xl"
                >
                  {heading}
                </h2>
                {section.isSample ? <SampleTag /> : null}
              </div>
              <div className="flex flex-col gap-8">
                <Body text={section.body} />
                {section.image ? (
                  <div className="aspect-[3/2] overflow-hidden rounded-2xl bg-cream-100">
                    <ResponsiveImage
                      asset={section.image}
                      sizes="(min-width: 1024px) 60vw, 100vw"
                    />
                  </div>
                ) : null}
              </div>
            </div>
          </section>
        );
      })}

      <section
        aria-labelledby="about-highlights"
        data-surface="dark"
        className="bg-forest-900 py-14 text-ivory-50 md:py-20"
      >
        <div className="mx-auto flex max-w-7xl flex-col items-start gap-6 px-5 sm:px-8 md:flex-row md:items-center md:justify-between">
          <h2
            id="about-highlights"
            className="font-serif text-3xl leading-tight font-bold md:text-4xl"
          >
            Facilities and highlights
          </h2>
          <Button to="/discover" variant="gold" icon={ArrowRight}>
            Discover the Park
          </Button>
        </div>
      </section>
    </>
  );
}
