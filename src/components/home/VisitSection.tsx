import { ArrowRight, Mail, MapPin, Phone } from "lucide-react";
import { Button } from "../common/Button";
import { MapEmbed } from "../common/MapEmbed";
import { SectionHeading } from "../common/SectionHeading";
import type { PageSection, SiteSettings } from "../../types/content";

type VisitSectionProps = {
  section: PageSection | null;
  settings: SiteSettings;
};

export function directionsUrl(settings: SiteSettings): string {
  const destination = settings.plusCode ?? settings.addressLine;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
}

function DirectionsButton({ settings }: { settings: SiteSettings }) {
  return (
    <Button
      href={directionsUrl(settings)}
      target="_blank"
      rel="noopener noreferrer"
      variant="gold"
      icon={ArrowRight}
    >
      Get Directions
    </Button>
  );
}

/** Shown in place of the map while no embed URL is set (ruling P2-R3). */
function MapsCard({ settings }: { settings: SiteSettings }) {
  return (
    <div
      data-surface="dark"
      className="relative isolate flex min-h-80 flex-col justify-end overflow-hidden rounded-2xl bg-forest-900 p-7 pt-44 text-ivory-50 sm:p-10 sm:pt-44 md:min-h-96 lg:pt-10"
    >
      {/* Faint contour lines, like a trail map. */}
      <svg
        aria-hidden="true"
        focusable="false"
        viewBox="0 0 600 400"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 -z-10 h-full w-full"
      >
        <g fill="none" stroke="#f8f5ec" strokeOpacity="0.09" strokeWidth="1.5">
          {[60, 100, 140, 185, 235, 290, 350, 415].map((r, i) => (
            <ellipse
              key={r}
              cx="450"
              cy="110"
              rx={r * 1.25}
              ry={r * 0.82}
              transform={`rotate(${-14 + i * 3} 450 110)`}
            />
          ))}
        </g>
        <circle cx="450" cy="110" r="46" fill="#d6aa55" fillOpacity="0.16" />
        <circle cx="450" cy="110" r="28" fill="#d6aa55" />
        <g
          transform="translate(432 92) scale(1.5)"
          fill="none"
          stroke="#262923"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" />
          <circle cx="12" cy="10" r="3" />
        </g>
      </svg>

      <h3 className="font-serif text-2xl font-semibold md:text-3xl">
        Find us on Google Maps
      </h3>
      {settings.plusCode ? (
        <p className="mt-4 flex flex-wrap items-baseline gap-x-3">
          <span className="text-sm text-ivory-50/75">Plus code</span>
          <span className="font-serif text-2xl tracking-wide text-gold-500">
            {settings.plusCode}
          </span>
        </p>
      ) : null}
      <p className="mt-2 max-w-sm leading-relaxed text-ivory-50/85">
        {settings.addressLine}
      </p>
      <div className="mt-6">
        <DirectionsButton settings={settings} />
      </div>
    </div>
  );
}

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
