import { HERO_DEFAULT_IMAGE } from "~/content/heroDefault";
import { placeholders } from "~/content/placeholders";
import { homeMetaDescription, selectHomeContent } from "~/lib/homeContent";
import { mediaVariantUrl } from "~/lib/media";
import { buildMeta, SITE_URL } from "~/lib/meta";
import { buildSrcSet } from "~/utils/imageVariants";
import { HomePage } from "~/pages/HomePage";

import type { Route } from "./+types/home";

export function meta({ loaderData }: Route.MetaArgs) {
  return buildMeta({
    description: homeMetaDescription(loaderData?.sections ?? []),
    path: "/",
    siteUrl: SITE_URL,
  });
}

/**
 * Preload the default hero photo so the LCP image starts downloading with the
 * HTML, not after the bundle runs. Matches the Hero's `sizes="100vw"`.
 */
export const links: Route.LinksFunction = () => [
  {
    rel: "preload",
    as: "image",
    imageSrcSet: buildSrcSet(HERO_DEFAULT_IMAGE.variants, mediaVariantUrl),
    imageSizes: "100vw",
    type: "image/webp",
    fetchPriority: "high",
  },
];

// Build-time loader (ruling P2-R9). Phase 4 swaps placeholders for Supabase.
export function loader() {
  return selectHomeContent({
    settings: placeholders.settings,
    sections: placeholders.sections.home,
    attractions: placeholders.attractions,
    galleryImages: placeholders.galleryImages,
    testimonials: placeholders.testimonials,
  });
}

export default function Home({ loaderData }: Route.ComponentProps) {
  return <HomePage {...loaderData} />;
}
