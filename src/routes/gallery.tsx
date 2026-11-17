import { placeholders } from "~/content/placeholders";
import { findSection } from "~/lib/homeContent";
import { buildMeta, SITE_URL } from "~/lib/meta";
import { GalleryPage } from "~/pages/GalleryPage";

import type { Route } from "./+types/gallery";

export function meta() {
  return buildMeta({
    title: "Gallery",
    description: "Photos of Mondelos Nature Park in Kawayan, Biliran.",
    path: "/gallery",
    siteUrl: SITE_URL,
  });
}

// Build-time loader (ruling P2-R9). Phase 4 swaps placeholders for Supabase.
export function loader() {
  return {
    intro: findSection(placeholders.sections.home, "gallery"),
    categories: placeholders.galleryCategories,
    images: placeholders.galleryImages,
  };
}

export default function Gallery({ loaderData }: Route.ComponentProps) {
  return <GalleryPage {...loaderData} />;
}
