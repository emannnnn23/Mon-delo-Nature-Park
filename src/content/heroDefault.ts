import type { MediaAsset } from "../types/content";

/**
 * The park's default hero photo, shipped as static files in
 * `public/images/hero/`. The homepage Hero shows it until a hero image is set
 * in the CMS. The focal point keeps the bay in view when a phone crops the
 * wide frame.
 */
export const HERO_DEFAULT_IMAGE: MediaAsset = {
  id: "static-hero-bay",
  alt: "Hilltop view over a turquoise bay and palm-covered hills",
  width: 1947,
  height: 808,
  variants: {
    480: "/images/hero/hero-bay-480.webp",
    960: "/images/hero/hero-bay-960.webp",
    1600: "/images/hero/hero-bay-1600.webp",
    1947: "/images/hero/hero-bay-1947.webp",
  },
  focalX: 58,
  focalY: 55,
};
