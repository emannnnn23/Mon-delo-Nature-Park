import { placeholders } from "~/content/placeholders";
import { homeMetaDescription, selectHomeContent } from "~/lib/homeContent";
import { buildMeta, SITE_URL } from "~/lib/meta";
import { HomePage } from "~/pages/HomePage";

import type { Route } from "./+types/home";

export function meta({ loaderData }: Route.MetaArgs) {
  return buildMeta({
    description: homeMetaDescription(loaderData?.sections ?? []),
    path: "/",
    siteUrl: SITE_URL,
  });
}

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
