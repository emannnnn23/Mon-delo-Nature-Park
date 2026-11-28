import type { MediaAsset } from "~/types/content";
import { buildMeta, defaultShareImage, shareImageUrl } from "./meta";

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

  it("strips trailing slashes from siteUrl before joining", () => {
    const meta = buildMeta({ ...base, siteUrl: "https://x.ph/" });
    expect(meta).toContainEqual({
      property: "og:url",
      content: "https://x.ph/gallery",
    });
    const home = buildMeta({ ...base, path: "/", siteUrl: "https://x.ph//" });
    expect(home).toContainEqual({
      tagName: "link",
      rel: "canonical",
      href: "https://x.ph/",
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

  it("turns a site path into an absolute og:image URL", () => {
    const meta = buildMeta({
      ...base,
      siteUrl: "https://x.ph/",
      image: "/images/hero.jpg",
    });
    expect(meta).toContainEqual({
      property: "og:image",
      content: "https://x.ph/images/hero.jpg",
    });
  });
});

const asset = (id: string): MediaAsset => ({
  id,
  alt: id,
  width: 1600,
  height: 1000,
  variants: { 480: `${id}-480.webp`, 1600: `${id}-1600.webp` },
  focalX: 50,
  focalY: 50,
});

describe("shareImageUrl", () => {
  it("uses the 1600 variant and is null without an asset or variants", () => {
    expect(shareImageUrl(asset("a"))).toMatch(/a-1600\.webp$/);
    expect(shareImageUrl(null)).toBeNull();
    expect(shareImageUrl({ ...asset("a"), variants: {} })).toBeNull();
  });
});

describe("defaultShareImage", () => {
  const layout = (defaultOgImage: MediaAsset | null) => ({
    id: "routes/_public",
    data: { settings: { defaultOgImage } },
  });

  it("reads the default image from the public layout's settings", () => {
    expect(
      defaultShareImage([{ id: "root" }, layout(asset("d")), undefined]),
    ).toMatch(/d-1600\.webp$/);
  });

  it("is null when the layout has no data or no default image", () => {
    expect(defaultShareImage(undefined)).toBeNull();
    expect(defaultShareImage([{ id: "routes/_public" }])).toBeNull();
    expect(defaultShareImage([layout(null)])).toBeNull();
  });
});
