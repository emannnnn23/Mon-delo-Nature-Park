import { placeholders } from "~/content/placeholders";
import { buildMeta, defaultShareImage, SITE_URL } from "~/lib/meta";
import { loadForBuild, loadForClient } from "~/lib/routeData";
import { AboutPage } from "~/pages/AboutPage";

import type { Route } from "./+types/about";

export function meta({ matches }: Route.MetaArgs) {
  return buildMeta({
    title: "About the Park",
    description: "About Mondelos Nature Park in Kawayan, Biliran.",
    path: "/about",
    image: defaultShareImage(matches),
    siteUrl: SITE_URL,
  });
}

// Shared by both loaders (`clientLoader` must never call the build-stripped
// `loader`). `import()` keeps supabase-js out of the initial page chunks.
async function liveAbout() {
  const { getAboutContent, listPublishedAttractionSlugs } =
    await import("~/services/content");
  const [{ sections }, slugs] = await Promise.all([
    getAboutContent(),
    listPublishedAttractionSlugs(),
  ]);
  return { sections, hasAttractions: slugs.length > 0 };
}

export function loader() {
  return loadForBuild(liveAbout, {
    sections: placeholders.sections.about,
    hasAttractions: placeholders.attractions.some(
      (a) => a.kind === "attraction",
    ),
  });
}

export function clientLoader({ serverLoader }: Route.ClientLoaderArgs) {
  return loadForClient(liveAbout, () => serverLoader());
}
clientLoader.hydrate = true as const;

export default function About({ loaderData }: Route.ComponentProps) {
  return <AboutPage {...loaderData} />;
}
