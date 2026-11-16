import { describe, expect, it } from "vitest";
import { ATTRACTION_ICONS } from "~/types/content";
import { placeholders } from "./placeholders";

describe("placeholders", () => {
  it("has no testimonials, faqs, announcement or gallery images", () => {
    expect(placeholders.testimonials).toEqual([]);
    expect(placeholders.faqs).toEqual([]);
    expect(placeholders.announcement).toBeNull();
    expect(placeholders.galleryImages).toEqual([]);
  });

  it("carries the real Google rating", () => {
    expect(placeholders.settings.googleRating).toBe(4.6);
    expect(placeholders.settings.googleReviewCount).toBe(70);
  });

  it("carries the real address and leaves unknown contact details null", () => {
    expect(placeholders.settings.addressLine).toBe(
      "M8GV+8GP, Balaring Road, Kawayan, Biliran, Philippines",
    );
    expect(placeholders.settings.phone).toBeNull();
    expect(placeholders.settings.email).toBeNull();
    expect(placeholders.settings.openingHours).toBeNull();
    expect(Object.values(placeholders.settings.socials)).toEqual([
      null,
      null,
      null,
      null,
    ]);
  });

  it("lists the four experiences with the seeded icons", () => {
    const experiences = placeholders.attractions.filter(
      (a) => a.kind === "experience",
    );
    expect(experiences.map((a) => [a.name, a.icon])).toEqual([
      ["Beautiful Gardens", "leaf"],
      ["Scenic Views", "mountain"],
      ["Dining", "utensils"],
      ["Relaxing Pool", "waves"],
    ]);
  });

  it("marks every attraction and experience as a sample", () => {
    expect(placeholders.attractions.length).toBeGreaterThanOrEqual(7);
    expect(placeholders.attractions.every((a) => a.isSample)).toBe(true);
  });

  it("has at least three featured attractions with valid slugs and icons", () => {
    const attractions = placeholders.attractions.filter(
      (a) => a.kind === "attraction",
    );
    expect(
      attractions.filter((a) => a.isFeatured).length,
    ).toBeGreaterThanOrEqual(3);
    for (const a of placeholders.attractions) {
      expect(a.slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      expect(a.summary.length).toBeGreaterThanOrEqual(1);
      expect(a.summary.length).toBeLessThanOrEqual(160);
      expect(a.cover).toBeNull();
      expect(a.images).toEqual([]);
      if (a.icon) expect(ATTRACTION_ICONS).toContain(a.icon);
    }
    for (const a of placeholders.attractions.filter(
      (x) => x.kind === "experience",
    )) {
      expect(a.icon).not.toBeNull();
    }
  });

  it("has the real home hero and intro", () => {
    const [hero, intro] = placeholders.sections.home;
    expect(hero?.key).toBe("hero");
    expect(hero?.heading).toBe("Find Your Peace in Nature.");
    expect(hero?.isSample).toBe(false);
    expect(intro?.key).toBe("intro");
    expect(intro?.isSample).toBe(false);
    expect(intro?.body).toBe(
      "Discover a peaceful escape surrounded by nature, beautiful landscapes, and unforgettable moments. Whether you're looking for a relaxing getaway, a scenic view, or meaningful time with family and friends, Mondelos Nature Park welcomes you.",
    );
  });

  it("marks about story, mission and vision as samples", () => {
    const about = placeholders.sections.about;
    for (const key of ["story", "mission", "vision"]) {
      expect(about.find((s) => s.key === key)?.isSample).toBe(true);
    }
  });

  it("has no images on any section and the three gallery categories", () => {
    for (const sections of Object.values(placeholders.sections)) {
      for (const s of sections) expect(s.image).toBeNull();
    }
    expect(placeholders.settings.defaultOgImage).toBeNull();
    expect(placeholders.galleryCategories.map((c) => [c.name, c.slug])).toEqual(
      [
        ["Landscapes", "landscapes"],
        ["Gardens", "gardens"],
        ["Facilities", "facilities"],
      ],
    );
  });
});
