export type MediaAsset = {
  id: string;
  alt: string;
  width: number;
  height: number;
  variants: Record<number, string>;
  focalX: number;
  focalY: number;
};

export type SiteSettings = {
  parkName: string;
  tagline: string | null;
  shortDescription: string | null;
  addressLine: string;
  plusCode: string | null;
  latitude: number | null;
  longitude: number | null;
  mapsEmbedUrl: string | null;
  mapsListingUrl: string | null;
  phone: string | null;
  email: string | null;
  openingHours: string | null;
  socials: {
    facebook: string | null;
    instagram: string | null;
    tiktok: string | null;
    youtube: string | null;
  };
  googleRating: number | null;
  googleReviewCount: number | null;
  defaultOgImage: MediaAsset | null;
};

export type PageKey = "home" | "about" | "visit";

export type PageSection = {
  key: string;
  eyebrow: string | null;
  heading: string | null;
  body: string | null;
  ctaLabel: string | null;
  ctaHref: string | null;
  image: MediaAsset | null;
  isSample: boolean;
};

export const ATTRACTION_ICONS = [
  "leaf",
  "mountain",
  "utensils",
  "waves",
  "tent",
  "trees",
  "sunset",
  "camera",
  "users",
  "flower-2",
  "bed-double",
  "coffee",
] as const;

export type AttractionIcon = (typeof ATTRACTION_ICONS)[number];

export type AttractionKind = "attraction" | "experience";

export type Attraction = {
  id: string;
  kind: AttractionKind;
  slug: string;
  name: string;
  summary: string;
  description: string | null;
  icon: AttractionIcon | null;
  cover: MediaAsset | null;
  /** Extra photos; `id` is the attraction_images row, not the media asset. */
  images: { id: string; image: MediaAsset; caption: string | null }[];
  isFeatured: boolean;
  isSample: boolean;
};

export type GalleryCategory = { id: string; name: string; slug: string };

export type GalleryImage = {
  id: string;
  image: MediaAsset;
  caption: string | null;
  categoryId: string | null;
  isFeatured: boolean;
  isSample: boolean;
};

export type Testimonial = {
  id: string;
  authorName: string;
  quote: string;
  rating: number | null;
  source: "google" | "facebook" | "direct";
  sourceUrl: string | null;
  reviewDate: string | null;
};

export type Announcement = {
  id: string;
  title: string;
  body: string | null;
  linkLabel: string | null;
  linkHref: string | null;
};

export type Faq = { id: string; question: string; answer: string };
