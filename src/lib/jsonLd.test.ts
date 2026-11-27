import { placeholders } from "~/content/placeholders";
import type { SiteSettings } from "~/types/content";

import { serializeJsonLd, touristAttractionJsonLd } from "./jsonLd";

const settings = placeholders.settings;
const withSettings = (patch: Partial<SiteSettings>): SiteSettings => ({
  ...settings,
  ...patch,
});

describe("touristAttractionJsonLd", () => {
  it("describes the park with a Kawayan, Biliran address and no invented street", () => {
    const ld = touristAttractionJsonLd(settings, "https://x.ph/");
    expect(ld).toMatchObject({
      "@context": "https://schema.org",
      "@type": "TouristAttraction",
      name: "Mondelos Nature Park",
      url: "https://x.ph/",
      address: {
        "@type": "PostalAddress",
        streetAddress: "M8GV+8GP, Balaring Road",
        addressLocality: "Kawayan",
        addressRegion: "Biliran",
        addressCountry: "PH",
      },
    });
  });

  it("never marks up the rating aggregated from another site", () => {
    const ld = touristAttractionJsonLd(settings, "https://x.ph");
    expect(settings.googleRating).toBe(4.6);
    expect(settings.googleReviewCount).toBe(70);
    expect(ld).not.toHaveProperty("aggregateRating");
    expect(JSON.stringify(ld)).not.toContain("4.6");
  });

  it("includes geo only when both coordinates are set", () => {
    expect(
      touristAttractionJsonLd(settings, "https://x.ph"),
    ).not.toHaveProperty("geo");
    expect(
      touristAttractionJsonLd(
        withSettings({ latitude: 11.6, longitude: 124.4 }),
        "https://x.ph",
      ),
    ).toMatchObject({
      geo: { "@type": "GeoCoordinates", latitude: 11.6, longitude: 124.4 },
    });
    expect(
      touristAttractionJsonLd(withSettings({ latitude: 11.6 }), "https://x.ph"),
    ).not.toHaveProperty("geo");
  });

  it("lists only the social links that are set", () => {
    expect(
      touristAttractionJsonLd(settings, "https://x.ph"),
    ).not.toHaveProperty("sameAs");
    const ld = touristAttractionJsonLd(
      withSettings({
        socials: {
          facebook: "https://facebook.com/mondelos",
          instagram: null,
          tiktok: "https://tiktok.com/@mondelos",
          youtube: null,
        },
      }),
      "https://x.ph",
    ) as { sameAs: string[] };
    expect(ld.sameAs).toEqual([
      "https://facebook.com/mondelos",
      "https://tiktok.com/@mondelos",
    ]);
  });

  it("omits empty optional values", () => {
    const ld = touristAttractionJsonLd(
      withSettings({ shortDescription: "  ", addressLine: " " }),
      "https://x.ph",
    );
    expect(ld).not.toHaveProperty("description");
    expect(ld.address).not.toHaveProperty("streetAddress");
  });
});

describe("serializeJsonLd", () => {
  it("escapes < so CMS text cannot close the script tag", () => {
    const text = serializeJsonLd({
      name: "</script><script>alert(1)</script>",
    });
    expect(text).not.toContain("<");
    expect(text).toContain("\\u003c/script>");
    expect(JSON.parse(text)).toEqual({
      name: "</script><script>alert(1)</script>",
    });
  });
});
