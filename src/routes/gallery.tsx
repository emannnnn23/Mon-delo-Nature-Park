import { placeholders } from "~/content/placeholders";
import { findSection } from "~/lib/homeContent";
import { buildMeta, defaultShareImage, SITE_URL } from "~/lib/meta";
import { loadForBuild, loadForClient } from "~/lib/routeData";
import { GalleryPage } from "~/pages/GalleryPage";

import type { Route } from "./+types/gallery";

export function meta({ matches }: Route.MetaArgs) {
  return buildMeta({
    title: "Gallery",
    description: "Photos of Mondelos Nature Park in Kawayan, Biliran.",
    path: "/gallery",
    image: defaultShareImage(matches),
    siteUrl: SITE_URL,
  });
}

// Shared by both loaders (`clientLoader` must never call the build-stripped
// `loader`). `import()` keeps supabase-js out of the initial page chunks.
async function liveGallery() {
  const { getGalleryContent } = await import("~/services/content");
  return getGalleryContent();
}

export function loader() {
  return loadForBuild(liveGallery, {
    intro: findSection(placeholders.sections.home, "gallery"),
    categories: placeholders.galleryCategories,
    images: placeholders.galleryImages,
  });
}

export function clientLoader({ serverLoader }: Route.ClientLoaderArgs) {
  return loadForClient(liveGallery, () => serverLoader());
}
clientLoader.hydrate = true as const;

export default function Gallery({ loaderData }: Route.ComponentProps) {
  return <GalleryPage {...loaderData} />;
}
