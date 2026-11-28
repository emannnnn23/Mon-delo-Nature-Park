import { ArrowRight } from "lucide-react";
import { Button } from "../common/Button";
import { SectionHeading } from "../common/SectionHeading";
import type { PageSection } from "../../types/content";

type IntroSectionProps = {
  section: PageSection | null;
  parkName: string;
  className?: string;
};

/** "Welcome to" block: park name, intro copy and an optional button. */
export function IntroSection({
  section,
  parkName,
  className = "",
}: IntroSectionProps) {
  // The owner clears the button's label or link to hide it: no fallback.
  const ctaHref = section?.ctaHref || null;
  const ctaLabel = section?.ctaLabel || null;
  return (
    <section id="welcome" className={`scroll-mt-24 ${className}`.trim()}>
      <SectionHeading
        eyebrow={section?.eyebrow ?? "WELCOME TO"}
        title={section?.heading ?? parkName}
        className="[&_h2]:text-[clamp(2rem,1.5rem+1.6vw,2.75rem)]"
      />
      {section?.body ? (
        <p className="mt-5 max-w-prose text-base leading-relaxed text-ink-600 md:text-lg">
          {section.body}
        </p>
      ) : null}
      {ctaHref && ctaLabel ? (
        <Button
          to={ctaHref}
          variant="outline-dark"
          icon={ArrowRight}
          className="mt-8"
        >
          {ctaLabel}
        </Button>
      ) : null}
    </section>
  );
}
