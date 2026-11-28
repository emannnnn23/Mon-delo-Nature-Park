import type { MediaRow, SettingsRow } from "~/types/db-helpers";
import {
  toAnnouncement,
  toAttraction,
  toFaq,
  toGalleryImage,
  toMediaAsset,
  toPageSection,
  toSettings,
  toTestimonial,
} from "./mappers";

const mediaRow: MediaRow = {
  id: "m1",
  alt_text: "A garden path",
  width: 1600,
  height: 900,
  variants: { "960": "m1/960.webp", "480": "m1/480.webp" },
  focal_x: 30,
  focal_y: 60,
  storage_base_path: "m1",
  original_filename: null,
  created_at: "2026-11-01T00:00:00Z",
  updated_at: "2026-11-01T00:00:00Z",
};

const attractionRow = {
  id: "a1",
  kind: "attraction",
  slug: "falls",
  name: "Falls",
  summary: "A falls.",
  description: null,
  icon: "waves",
  cover_media_id: "m1",
  is_featured: true,
  is_published: true,
  sort_order: 1,
  is_sample: true,
  created_at: "2026-11-01T00:00:00Z",
  updated_at: "2026-11-01T00:00:00Z",
};

describe("toMediaAsset", () => {
  it("parses variant keys to numbers and maps the focal point", () => {
    expect(toMediaAsset(mediaRow)).toEqual({
      id: "m1",
      alt: "A garden path",
      width: 1600,
      height: 900,
      variants: { 480: "m1/480.webp", 960: "m1/960.webp" },
      focalX: 30,
      focalY: 60,
    });
  });

  it("returns null for a null row", () => {
    expect(toMediaAsset(null)).toBeNull();
  });

  it("drops variants that are not a numeric key with a string path", () => {
    const asset = toMediaAsset({
      ...mediaRow,
      variants: { "480": "a", full: "b", "960": 5, "1600": "c" },
    });
    expect(asset?.variants).toEqual({ 480: "a", 1600: "c" });
  });

  it("yields no variants when the jsonb is not an object", () => {
    expect(toMediaAsset({ ...mediaRow, variants: [] })?.variants).toEqual({});
    expect(toMediaAsset({ ...mediaRow, variants: "x" })?.variants).toEqual({});
  });
});

describe("toAttraction", () => {
  it("keeps a null cover null so the UI shows a placeholder", () => {
    const a = toAttraction({ ...attractionRow, cover: null, images: [] });
    expect(a.cover).toBeNull();
  });

  it("maps fields, cover and gallery images with the attraction_images id", () => {
    const a = toAttraction({
      ...attractionRow,
      cover: mediaRow,
      images: [
        { id: "ai1", caption: "Top", image: { ...mediaRow, id: "m2" } },
        { id: "ai2", caption: null, image: null },
      ],
    });
    expect(a).toMatchObject({
      id: "a1",
      kind: "attraction",
      slug: "falls",
      icon: "waves",
      isFeatured: true,
      isSample: true,
    });
    expect(a.cover?.id).toBe("m1");
    // A photo whose media row is missing cannot be shown, so it is dropped.
    expect(a.images).toHaveLength(1);
    expect(a.images[0]).toMatchObject({ id: "ai1", caption: "Top" });
    expect(a.images[0].image.id).toBe("m2");
  });

  it("treats an unknown icon as no icon and tolerates missing images", () => {
    const a = toAttraction({
      ...attractionRow,
      icon: "rocket",
      cover: null,
    });
    expect(a.icon).toBeNull();
    expect(a.images).toEqual([]);
  });
});

const settingsRow: SettingsRow = {
  id: "s",
  singleton: true,
  park_name: "Mondelos Nature Park",
  tagline: null,
  short_description: null,
  address_line: "Somewhere",
  plus_code: null,
  latitude: null,
  longitude: null,
  maps_embed_url: null,
  maps_listing_url: null,
  phone: null,
  email: null,
  opening_hours: null,
  facebook_url: "https://facebook.com/x",
  instagram_url: null,
  tiktok_url: null,
  youtube_url: null,
  google_rating: 4.6,
  google_review_count: 70,
  default_og_media_id: null,
  created_at: "2026-11-01T00:00:00Z",
  updated_at: "2026-11-01T00:00:00Z",
};

describe("toSettings", () => {
  it("maps columns, socials and a null default image", () => {
    const s = toSettings({ ...settingsRow, default_og: null });
    expect(s.parkName).toBe("Mondelos Nature Park");
    expect(s.addressLine).toBe("Somewhere");
    expect(s.socials).toEqual({
      facebook: "https://facebook.com/x",
      instagram: null,
      tiktok: null,
      youtube: null,
    });
    expect(s.googleRating).toBe(4.6);
    expect(s.defaultOgImage).toBeNull();
  });

  it("turns a numeric string rating into a number and keeps null", () => {
    const asString = {
      ...settingsRow,
      google_rating: "4.6" as unknown as number,
      default_og: mediaRow,
    };
    const s = toSettings(asString);
    expect(s.googleRating).toBe(4.6);
    expect(s.defaultOgImage?.id).toBe("m1");
    expect(
      toSettings({ ...settingsRow, google_rating: null, default_og: null })
        .googleRating,
    ).toBeNull();
  });

  it("maps a garbage rating to null rather than NaN", () => {
    const s = toSettings({
      ...settingsRow,
      google_rating: "n/a" as unknown as number,
      default_og: null,
    });
    expect(s.googleRating).toBeNull();
  });
});

describe("toPageSection", () => {
  it("maps columns and the embedded image", () => {
    const s = toPageSection({
      id: "p",
      page: "home",
      key: "intro",
      eyebrow: "E",
      heading: "H",
      body: "B",
      cta_label: "Go",
      cta_href: "/about",
      media_id: "m1",
      is_published: true,
      sort_order: 0,
      is_sample: true,
      created_at: "x",
      updated_at: "x",
      image: mediaRow,
    });
    expect(s).toMatchObject({
      key: "intro",
      eyebrow: "E",
      heading: "H",
      body: "B",
      ctaLabel: "Go",
      ctaHref: "/about",
      isSample: true,
    });
    expect(s.image?.id).toBe("m1");
  });
});

describe("toGalleryImage", () => {
  const row = {
    id: "g1",
    media_id: "m1",
    category_id: "c1",
    caption: "Cap",
    is_featured: true,
    is_published: true,
    is_sample: false,
    sort_order: 0,
    created_at: "x",
    updated_at: "x",
    image: mediaRow,
  };

  it("keeps the category when it is published", () => {
    const g = toGalleryImage({
      ...row,
      category: { id: "c1", is_published: true },
    });
    expect(g).toMatchObject({
      id: "g1",
      caption: "Cap",
      categoryId: "c1",
      isFeatured: true,
      isSample: false,
    });
  });

  it("drops an unpublished or hidden category (P4-R7)", () => {
    const unpublished = toGalleryImage({
      ...row,
      category: { id: "c1", is_published: false },
    });
    expect(unpublished?.categoryId).toBeNull();
    expect(toGalleryImage({ ...row, category: null })?.categoryId).toBeNull();
  });

  it("returns null when the media row is missing", () => {
    expect(toGalleryImage({ ...row, category: null, image: null })).toBeNull();
  });
});

describe("toTestimonial / toAnnouncement / toFaq", () => {
  it("maps a testimonial", () => {
    expect(
      toTestimonial({
        id: "t",
        author_name: "Ana",
        quote: "Lovely",
        rating: 5,
        source: "google",
        source_url: "https://g.co/x",
        review_date: "2026-10-01",
        is_published: true,
        sort_order: 0,
        created_at: "x",
        updated_at: "x",
      }),
    ).toEqual({
      id: "t",
      authorName: "Ana",
      quote: "Lovely",
      rating: 5,
      source: "google",
      sourceUrl: "https://g.co/x",
      reviewDate: "2026-10-01",
    });
  });

  it("maps an announcement", () => {
    expect(
      toAnnouncement({
        id: "n",
        title: "Closed",
        body: null,
        link_label: "More",
        link_href: "/visit",
        starts_at: "x",
        ends_at: null,
        is_published: true,
        created_at: "x",
        updated_at: "x",
      }),
    ).toEqual({
      id: "n",
      title: "Closed",
      body: null,
      linkLabel: "More",
      linkHref: "/visit",
    });
  });

  it("maps a faq", () => {
    expect(
      toFaq({
        id: "f",
        question: "Q?",
        answer: "A.",
        is_published: true,
        sort_order: 0,
        created_at: "x",
        updated_at: "x",
      }),
    ).toEqual({ id: "f", question: "Q?", answer: "A." });
  });
});
