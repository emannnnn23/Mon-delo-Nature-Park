import { placeholders } from "~/content/placeholders";
import { buildMeta, SITE_URL } from "~/lib/meta";
import { AboutPage } from "~/pages/AboutPage";

import type { Route } from "./+types/about";

export function meta() {
  return buildMeta({
    title: "About the Park",
    description: "About Mondelos Nature Park in Kawayan, Biliran.",
    path: "/about",
    siteUrl: SITE_URL,
  });
}

// Build-time loader (ruling P2-R9). Phase 4 swaps placeholders for Supabase.
export function loader() {
  return { sections: placeholders.sections.about };
}

export default function About({ loaderData }: Route.ComponentProps) {
  return <AboutPage {...loaderData} />;
}
