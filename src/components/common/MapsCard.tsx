import { ArrowRight } from "lucide-react";

import { addressWithoutPlusCode, directionsUrl } from "../../lib/directions";
import type { SiteSettings } from "../../types/content";
import { Button } from "./Button";

export function DirectionsButton({ settings }: { settings: SiteSettings }) {
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

/**
 * Shown in place of the map while no embed URL is set (ruling P2-R3): address,
 * plus code and Get Directions over a faint trail-map motif.
 */
export function MapsCard({
  settings,
  headingLevel: Heading = "h3",
}: {
  settings: SiteSettings;
  headingLevel?: "h2" | "h3";
}) {
  // The plus code has its own line, so it is not repeated in the address.
  const street = addressWithoutPlusCode(
    settings.addressLine,
    settings.plusCode,
  );
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
        preserveAspectRatio="xMaxYMin slice"
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

      <Heading className="font-serif text-2xl font-semibold md:text-3xl">
        Find us on Google Maps
      </Heading>
      {settings.plusCode ? (
        <p className="mt-4 flex flex-wrap items-baseline gap-x-3">
          <span className="text-sm text-ivory-50/75">Plus code</span>
          <span className="font-serif text-2xl tracking-wide text-gold-500">
            {settings.plusCode}
          </span>
        </p>
      ) : null}
      {street ? (
        <p className="mt-2 max-w-sm leading-relaxed text-ivory-50/85">
          {street}
        </p>
      ) : null}
      <div className="mt-6">
        <DirectionsButton settings={settings} />
      </div>
    </div>
  );
}
