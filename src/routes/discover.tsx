import { placeholders } from "~/content/placeholders";
import { findSection } from "~/lib/homeContent";
import { buildMeta, SITE_URL } from "~/lib/meta";
import { DiscoverPage } from "~/pages/DiscoverPage";

import type { Route } from "./+types/discover";

export function meta() {
  return buildMeta({
    title: "Discover the Park",
    description:
      "Explore the attractions and experiences at Mondelos Nature Park.",
    path: "/discover",
    siteUrl: SITE_URL,
  });
}

// Build-time loader (ruling P2-R9). Phase 4 swaps placeholders for Supabase.
export function loader() {
  return {
    intro: findSection(placeholders.sections.home, "discover"),
    attractions: placeholders.attractions.filter(
      (a) => a.kind === "attraction",
    ),
    experiences: placeholders.attractions.filter(
      (a) => a.kind === "experience",
    ),
  };
}

export default function Discover({ loaderData }: Route.ComponentProps) {
  return <DiscoverPage {...loaderData} />;
}
