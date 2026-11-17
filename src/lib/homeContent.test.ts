import { placeholders } from "../content/placeholders";
import type { Attraction, GalleryImage } from "../types/content";
import { homeMetaDescription, selectHomeContent } from "./homeContent";

function source() {
  return {
    settings: placeholders.settings,
    sections: placeholders.sections.home,
    attractions: placeholders.attractions,
    galleryImages: placeholders.galleryImages,
    testimonials: placeholders.testimonials,
  };
}

function galleryImage(id: string, isFeatured: boolean): GalleryImage {
  return {
    id,
    image: {
      id: `m-${id}`,
      alt: id,
      width: 800,
      height: 600,
      variants: { 480: `${id}/480.webp` },
      focalX: 50,
      focalY: 50,
    },
    caption: null,
    categoryId: null,
    isFeatured,
    isSample: false,
  };
}

describe("selectHomeContent", () => {
  it("passes settings, sections and testimonials through", () => {
    const content = selectHomeContent(source());
    expect(content.settings).toBe(placeholders.settings);
    expect(content.sections).toBe(placeholders.sections.home);
    expect(content.testimonials).toBe(placeholders.testimonials);
  });

  it("selects experiences by kind", () => {
    const { experiences } = selectHomeContent(source());
    expect(experiences.map((a) => a.slug)).toEqual([
      "beautiful-gardens",
      "scenic-views",
      "dining",
      "relaxing-pool",
    ]);
  });

  it("selects at most three featured attractions, never experiences", () => {
    const extra: Attraction = {
      ...placeholders.attractions[4],
      id: "x",
      slug: "extra",
      isFeatured: true,
    };
    const featuredExperience: Attraction = {
      ...placeholders.attractions[0],
      id: "y",
      isFeatured: true,
    };
    const { featuredAttractions } = selectHomeContent({
      ...source(),
      attractions: [
        featuredExperience,
        ...placeholders.attractions.slice(4),
        extra,
      ],
    });
    expect(featuredAttractions.map((a) => a.slug)).toEqual([
      "hilltop-viewpoint",
      "garden-walk",
      "picnic-grounds",
    ]);
  });

  it("selects at most five featured gallery images", () => {
    const images = [
      galleryImage("a", true),
      galleryImage("b", false),
      ...["c", "d", "e", "f", "g"].map((id) => galleryImage(id, true)),
    ];
    const { galleryImages } = selectHomeContent({
      ...source(),
      galleryImages: images,
    });
    expect(galleryImages.map((g) => g.id)).toEqual(["a", "c", "d", "e", "f"]);
  });
});

describe("homeMetaDescription", () => {
  it("uses the intro body, cut at a word boundary within 155 characters", () => {
    const description = homeMetaDescription(placeholders.sections.home);
    expect(description.length).toBeLessThanOrEqual(155);
    expect(description.startsWith("Discover a peaceful escape")).toBe(true);
    expect(description.endsWith("…")).toBe(true);
    expect(description).not.toMatch(/\s…$/);
  });

  it("keeps a short intro body whole", () => {
    const description = homeMetaDescription([
      { ...placeholders.sections.home[1], body: "A calm place." },
    ]);
    expect(description).toBe("A calm place.");
  });

  it("falls back when there is no intro body", () => {
    expect(homeMetaDescription([])).toBe(
      "Mondelos Nature Park in Kawayan, Biliran, Philippines.",
    );
  });
});
