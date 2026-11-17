import { buildMeta } from "./meta";

const base = { description: "d", path: "/gallery", siteUrl: "https://x.ph" };

describe("buildMeta", () => {
  it("builds the page title, og:url and canonical link", () => {
    const meta = buildMeta({ ...base, title: "Gallery" });
    expect(meta).toContainEqual({ title: "Gallery · Mondelos Nature Park" });
    expect(meta).toContainEqual({
      property: "og:url",
      content: "https://x.ph/gallery",
    });
    expect(meta).toContainEqual({
      tagName: "link",
      rel: "canonical",
      href: "https://x.ph/gallery",
    });
  });

  it("uses the home title when no title is given", () => {
    const meta = buildMeta({ ...base, path: "/" });
    expect(meta).toContainEqual({
      title: "Mondelos Nature Park — Kawayan, Biliran",
    });
    expect(meta).toContainEqual({
      property: "og:title",
      content: "Mondelos Nature Park — Kawayan, Biliran",
    });
  });

  it("returns description, og and twitter tags", () => {
    const meta = buildMeta({ ...base, title: "Gallery" });
    expect(meta).toContainEqual({ name: "description", content: "d" });
    expect(meta).toContainEqual({ property: "og:description", content: "d" });
    expect(meta).toContainEqual({ property: "og:type", content: "website" });
    expect(meta).toContainEqual({ property: "og:locale", content: "en_PH" });
    expect(meta).toContainEqual({
      name: "twitter:card",
      content: "summary_large_image",
    });
  });

  it("omits og:image without an image and includes it with one", () => {
    const without = buildMeta({ ...base, image: null });
    expect(
      without.some((m) => "property" in m && m.property === "og:image"),
    ).toBe(false);
    const withImage = buildMeta({ ...base, image: "https://x.ph/a.jpg" });
    expect(withImage).toContainEqual({
      property: "og:image",
      content: "https://x.ph/a.jpg",
    });
  });
});
