import { placeholders } from "~/content/placeholders";
import { findSection } from "~/lib/homeContent";
import { buildMeta, defaultShareImage, SITE_URL } from "~/lib/meta";
import { loadForBuild, loadForClient } from "~/lib/routeData";
import { DiscoverPage } from "~/pages/DiscoverPage";

import type { Route } from "./+types/discover";

export function meta({ matches }: Route.MetaArgs) {
  return buildMeta({
    title: "Discover the Park",
    description:
      "Explore the attractions and experiences at Mondelos Nature Park.",
    path: "/discover",
    image: defaultShareImage(matches),
    siteUrl: SITE_URL,
  });
}

// Shared by both loaders (`clientLoader` must never call the build-stripped
// `loader`). `import()` keeps supabase-js out of the initial page chunks.
async function liveDiscover() {
  const { getDiscoverContent } = await import("~/services/content");
  return getDiscoverContent();
}

export function loader() {
  return loadForBuild(liveDiscover, {
    intro: findSection(placeholders.sections.home, "discover"),
    attractions: placeholders.attractions.filter(
      (a) => a.kind === "attraction",
    ),
    experiences: placeholders.attractions.filter(
      (a) => a.kind === "experience",
    ),
  });
}

export function clientLoader({ serverLoader }: Route.ClientLoaderArgs) {
  return loadForClient(liveDiscover, () => serverLoader());
}
clientLoader.hydrate = true as const;

export default function Discover({ loaderData }: Route.ComponentProps) {
  return <DiscoverPage {...loaderData} />;
}
