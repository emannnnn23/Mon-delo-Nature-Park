import { Mail, MapPin, Phone } from "lucide-react";
import { DirectionsButton, MapsCard } from "../common/MapsCard";
import { MapEmbed } from "../common/MapEmbed";
import { SectionHeading } from "../common/SectionHeading";
import type { PageSection, SiteSettings } from "../../types/content";

type VisitSectionProps = {
  section: PageSection | null;
  settings: SiteSettings;
};

const contactClass =
  "inline-flex min-h-11 items-center gap-3 text-ink-900 underline decoration-gold-500/0 decoration-2 underline-offset-4 transition-colors hover:decoration-gold-500";

/** Address, contact details and either the map or a Google Maps card. */
export function VisitSection({ section, settings }: VisitSectionProps) {
  const { addressLine, phone, email, mapsEmbedUrl } = settings;
  return (
    <section
      aria-labelledby="visit-title"
      className="bg-ivory-50 py-16 md:py-24"
    >
      <div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)] items-center gap-10 px-5 sm:px-8 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-16">
        <div className="flex flex-col items-start">
          <SectionHeading
            id="visit-title"
            title={section?.heading ?? "Visit Us"}
            subtitle={section?.body}
          />
          <address className="mt-6 flex flex-col gap-1 not-italic">
            <p className="flex items-start gap-3 py-2.5 text-ink-900">
              <MapPin
                aria-hidden="true"
                className="mt-0.5 size-5 shrink-0 text-earth-700"
              />
              <span>{addressLine}</span>
            </p>
            {phone ? (
              <a
                href={`tel:${phone.replace(/[^\d+]/g, "")}`}
                className={contactClass}
              >
                <Phone
                  aria-hidden="true"
                  className="size-5 shrink-0 text-earth-700"
                />
                {phone}
              </a>
            ) : null}
            {email ? (
              <a href={`mailto:${email}`} className={contactClass}>
                <Mail
                  aria-hidden="true"
                  className="size-5 shrink-0 text-earth-700"
                />
                {email}
              </a>
            ) : null}
          </address>
          {mapsEmbedUrl ? (
            <div className="mt-8">
              <DirectionsButton settings={settings} />
            </div>
          ) : null}
        </div>

        {mapsEmbedUrl ? (
          <MapEmbed
            src={mapsEmbedUrl}
            title={`Map showing ${settings.parkName}`}
            className="shadow-[0_24px_60px_-30px_rgb(24_63_50/0.5)]"
          />
        ) : (
          <MapsCard settings={settings} />
        )}
      </div>
    </section>
  );
}
