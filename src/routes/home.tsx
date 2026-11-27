import { placeholders } from "~/content/placeholders";
import { homeMetaDescription, selectHomeContent } from "~/lib/homeContent";
import { serializeJsonLd, touristAttractionJsonLd } from "~/lib/jsonLd";
import { buildMeta, SITE_URL } from "~/lib/meta";
import { loadForBuild, loadForClient } from "~/lib/routeData";
import { HomePage } from "~/pages/HomePage";

import type { Route } from "./+types/home";

export function meta({ loaderData }: Route.MetaArgs) {
  return buildMeta({
    description: homeMetaDescription(loaderData?.sections ?? []),
    path: "/",
    siteUrl: SITE_URL,
  });
}

// The hero image needs no `links` preload: React hoists one for the
// fetchpriority="high" <img> in the prerendered HTML, and it follows whichever
// image the hero shows, so a CMS hero image is never shadowed by a static one.

// Shared by both loaders (`clientLoader` must never call the build-stripped
// `loader`). `import()` keeps supabase-js out of the initial page chunks.
async function liveHome() {
  const { getHomeContent } = await import("~/services/content");
  return getHomeContent();
}

export function loader() {
  return loadForBuild(
    liveHome,
    selectHomeContent({
      settings: placeholders.settings,
      sections: placeholders.sections.home,
      attractions: placeholders.attractions,
      galleryImages: placeholders.galleryImages,
      testimonials: placeholders.testimonials,
    }),
  );
}

export function clientLoader({ serverLoader }: Route.ClientLoaderArgs) {
  return loadForClient(liveHome, () => serverLoader());
}
clientLoader.hydrate = true as const;

export default function Home({ loaderData }: Route.ComponentProps) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd(
            touristAttractionJsonLd(loaderData.settings, `${SITE_URL}/`),
          ),
        }}
      />
      <HomePage {...loaderData} />
    </>
  );
}
