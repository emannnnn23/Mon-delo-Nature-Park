import { LeafDecor } from "../components/common/LeafDecor";
import { DiscoverPreview } from "../components/home/DiscoverPreview";
import { ExperienceCards } from "../components/home/ExperienceCards";
import { GalleryTestimonialsBand } from "../components/home/GalleryTestimonialsBand";
import { Hero } from "../components/home/Hero";
import { IntroSection } from "../components/home/IntroSection";
import { VisitSection } from "../components/home/VisitSection";
import { findSection, type HomePageProps } from "../lib/homeContent";

export type { HomePageProps };

/** The homepage, in the order of the visual reference (spec §5.1). */
export function HomePage({
  settings,
  sections,
  experiences,
  featuredAttractions,
  galleryImages,
  testimonials,
}: HomePageProps) {
  const hasExperiences = experiences.length > 0;
  return (
    <>
      <Hero section={findSection(sections, "hero")} />

      <div className="relative isolate overflow-hidden bg-ivory-50 py-16 md:py-24">
        <LeafDecor position="left" className="-z-10" />
        <LeafDecor position="right" className="-z-10" />
        <div
          className={`mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)] gap-12 px-5 sm:px-8 ${
            hasExperiences
              ? "xl:grid-cols-[17rem_minmax(0,1fr)] xl:items-center xl:gap-14"
              : ""
          }`}
        >
          <IntroSection
            section={findSection(sections, "intro")}
            parkName={settings.parkName}
          />
          <ExperienceCards experiences={experiences} />
        </div>
      </div>

      <DiscoverPreview
        section={findSection(sections, "discover")}
        attractions={featuredAttractions}
      />

      <GalleryTestimonialsBand
        gallerySection={findSection(sections, "gallery")}
        testimonialsSection={findSection(sections, "testimonials")}
        galleryImages={galleryImages}
        testimonials={testimonials}
        settings={settings}
      />

      <VisitSection
        section={findSection(sections, "visit")}
        settings={settings}
      />
    </>
  );
}
