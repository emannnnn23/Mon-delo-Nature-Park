import type {
  Announcement,
  Attraction,
  Faq,
  GalleryCategory,
  GalleryImage,
  PageKey,
  PageSection,
  SiteSettings,
  Testimonial,
} from "~/types/content";

/**
 * Typed placeholder content. Mirrors supabase/seed.sql (same names, slugs,
 * flags and copy) so the UI can be built and rendered without a database.
 * Every image field is null: the UI renders a PlaceholderImage instead.
 */

const SAMPLE_ATTRACTION_DESCRIPTION =
  "Sample text. This description will be replaced with confirmed details about the attraction.";

const settings: SiteSettings = {
  parkName: "Mondelos Nature Park",
  tagline: null,
  shortDescription: null,
  addressLine: "M8GV+8GP, Balaring Road, Kawayan, Biliran, Philippines",
  plusCode: "M8GV+8GP",
  latitude: null,
  longitude: null,
  mapsEmbedUrl: null,
  mapsListingUrl: null,
  phone: null,
  email: null,
  openingHours: null,
  socials: { facebook: null, instagram: null, tiktok: null, youtube: null },
  googleRating: 4.6,
  googleReviewCount: 70,
  defaultOgImage: null,
};

function section(
  key: string,
  heading: string | null,
  isSample: boolean,
  extra: Partial<
    Pick<PageSection, "eyebrow" | "body" | "ctaLabel" | "ctaHref">
  > = {},
): PageSection {
  return {
    key,
    eyebrow: null,
    heading,
    body: null,
    ctaLabel: null,
    ctaHref: null,
    image: null,
    isSample,
    ...extra,
  };
}

const sections: Record<PageKey, PageSection[]> = {
  home: [
    section("hero", "Find Your Peace in Nature.", false),
    section("intro", "Mondelos Nature Park", false, {
      eyebrow: "WELCOME TO",
      body: "Discover a peaceful escape surrounded by nature, beautiful landscapes, and unforgettable moments. Whether you're looking for a relaxing getaway, a scenic view, or meaningful time with family and friends, Mondelos Nature Park welcomes you.",
      ctaLabel: "Learn More",
      ctaHref: "/about",
    }),
    section("discover", "Discover the Park", false),
    section("gallery", "Our Gallery", false, {
      body: "Capture the beauty of Mondelos Nature Park.",
    }),
    section("testimonials", "What Our Guests Say", false),
    section("visit", "Visit Us", false),
  ],
  about: [
    section("intro", "About the Park", true, {
      body: "Sample text. A short introduction to the park will appear here once it is confirmed.",
    }),
    section("story", "Our Story", true, {
      body: "Sample text. The story of the park will appear here once it is confirmed.",
    }),
    section("mission", "Our Mission", true, {
      body: "Sample text. The park's mission will appear here once it is confirmed.",
    }),
    section("vision", "Our Vision", true, {
      body: "Sample text. The park's vision will appear here once it is confirmed.",
    }),
    section("surroundings", "Our Surroundings", true, {
      body: "Sample text. A description of the park's surroundings will appear here once it is confirmed.",
    }),
  ],
  visit: [
    section("intro", "Plan Your Visit", true, {
      body: "Sample text. Visitor information will appear here once it is confirmed.",
    }),
    section("getting_here", "Getting Here", true, {
      body: "Sample text. Directions to the park will appear here once they are confirmed.",
    }),
  ],
};

const attractions: Attraction[] = [
  {
    id: "00000000-0000-4000-8000-000000000101",
    kind: "experience",
    slug: "beautiful-gardens",
    name: "Beautiful Gardens",
    summary: "Stroll through lush gardens and vibrant blooms.",
    description: null,
    icon: "leaf",
    cover: null,
    images: [],
    isFeatured: false,
    isSample: true,
  },
  {
    id: "00000000-0000-4000-8000-000000000102",
    kind: "experience",
    slug: "scenic-views",
    name: "Scenic Views",
    summary: "Take in sweeping views of the surrounding landscape.",
    description: null,
    icon: "mountain",
    cover: null,
    images: [],
    isFeatured: false,
    isSample: true,
  },
  {
    id: "00000000-0000-4000-8000-000000000103",
    kind: "experience",
    slug: "dining",
    name: "Dining",
    summary: "Enjoy a meal in a relaxing garden setting.",
    description: null,
    icon: "utensils",
    cover: null,
    images: [],
    isFeatured: false,
    isSample: true,
  },
  {
    id: "00000000-0000-4000-8000-000000000104",
    kind: "experience",
    slug: "relaxing-pool",
    name: "Relaxing Pool",
    summary: "Unwind and refresh in the pool area.",
    description: null,
    icon: "waves",
    cover: null,
    images: [],
    isFeatured: false,
    isSample: true,
  },
  {
    id: "00000000-0000-4000-8000-000000000201",
    kind: "attraction",
    slug: "hilltop-viewpoint",
    name: "Hilltop Viewpoint",
    summary: "A place to pause and enjoy the view.",
    description: SAMPLE_ATTRACTION_DESCRIPTION,
    icon: "mountain",
    cover: null,
    images: [],
    isFeatured: true,
    isSample: true,
  },
  {
    id: "00000000-0000-4000-8000-000000000202",
    kind: "attraction",
    slug: "garden-walk",
    name: "Garden Walk",
    summary: "A leisurely walk among plants and flowers.",
    description: SAMPLE_ATTRACTION_DESCRIPTION,
    icon: "flower-2",
    cover: null,
    images: [],
    isFeatured: true,
    isSample: true,
  },
  {
    id: "00000000-0000-4000-8000-000000000203",
    kind: "attraction",
    slug: "picnic-grounds",
    name: "Picnic Grounds",
    summary: "An open space for sharing a meal outdoors.",
    description: SAMPLE_ATTRACTION_DESCRIPTION,
    icon: "trees",
    cover: null,
    images: [],
    isFeatured: true,
    isSample: true,
  },
  {
    id: "00000000-0000-4000-8000-000000000204",
    kind: "attraction",
    slug: "sunset-spot",
    name: "Sunset Spot",
    summary: "A quiet spot to end the day outdoors.",
    description: SAMPLE_ATTRACTION_DESCRIPTION,
    icon: "sunset",
    cover: null,
    images: [],
    isFeatured: false,
    isSample: true,
  },
];

const galleryCategories: GalleryCategory[] = [
  {
    id: "00000000-0000-4000-8000-000000000301",
    name: "Landscapes",
    slug: "landscapes",
  },
  {
    id: "00000000-0000-4000-8000-000000000302",
    name: "Gardens",
    slug: "gardens",
  },
  {
    id: "00000000-0000-4000-8000-000000000303",
    name: "Facilities",
    slug: "facilities",
  },
];

const galleryImages: GalleryImage[] = [];
const testimonials: Testimonial[] = [];
const faqs: Faq[] = [];
const announcement: Announcement | null = null;

export const placeholders: {
  settings: SiteSettings;
  sections: Record<PageKey, PageSection[]>;
  attractions: Attraction[];
  galleryCategories: GalleryCategory[];
  galleryImages: GalleryImage[];
  testimonials: Testimonial[];
  announcement: Announcement | null;
  faqs: Faq[];
} = {
  settings,
  sections,
  attractions,
  galleryCategories,
  galleryImages,
  testimonials,
  announcement,
  faqs,
};
