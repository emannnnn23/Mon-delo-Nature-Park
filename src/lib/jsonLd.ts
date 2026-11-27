import type { SiteSettings } from "~/types/content";

type JsonLd = Record<string, unknown>;

const LOCALITY_SUFFIX = /[\s,]*Kawayan[\s,]+Biliran(?:[\s,]+Philippines)?\s*$/i;

function clean(value: string | null | undefined): string | null {
  const text = value?.trim();
  return text ? text : null;
}

/**
 * The street part of the address line: the settings hold one free-text line
 * ending in the town, province and country, which the PostalAddress already
 * carries as separate fields. Nothing is added that the line does not say.
 */
function streetFrom(addressLine: string): string | null {
  return clean(addressLine.replace(LOCALITY_SUFFIX, ""));
}

/**
 * schema.org TouristAttraction for the park. Keys whose value is unknown are
 * left out. There is deliberately no `aggregateRating`: the rating shown on
 * the site comes from Google Maps reviews, and Google's review-snippet
 * guidelines do not allow marking up ratings aggregated from another site.
 */
export function touristAttractionJsonLd(
  settings: SiteSettings,
  siteUrl: string,
): JsonLd {
  const street = streetFrom(settings.addressLine);
  const description = clean(settings.shortDescription);
  const sameAs = Object.values(settings.socials).filter(
    (link): link is string => clean(link) !== null,
  );

  return {
    "@context": "https://schema.org",
    "@type": "TouristAttraction",
    name: settings.parkName,
    ...(description ? { description } : {}),
    url: siteUrl,
    address: {
      "@type": "PostalAddress",
      ...(street ? { streetAddress: street } : {}),
      addressLocality: "Kawayan",
      addressRegion: "Biliran",
      addressCountry: "PH",
    },
    ...(settings.latitude !== null && settings.longitude !== null
      ? {
          geo: {
            "@type": "GeoCoordinates",
            latitude: settings.latitude,
            longitude: settings.longitude,
          },
        }
      : {}),
    ...(sameAs.length > 0 ? { sameAs } : {}),
  };
}

/**
 * JSON for a `<script type="application/ld+json">` body. `<` is escaped so
 * CMS text such as `</script>` cannot end the tag early; the escape is still
 * valid JSON, so parsers read the original text back.
 */
export function serializeJsonLd(data: JsonLd): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
