import { placeholders } from "~/content/placeholders";
import { buildMeta, SITE_URL } from "~/lib/meta";
import { VisitPage } from "~/pages/VisitPage";

import type { Route } from "./+types/visit";

export function meta() {
  return buildMeta({
    title: "Visit Us",
    description: "Plan your visit to Mondelos Nature Park in Kawayan, Biliran.",
    path: "/visit",
    siteUrl: SITE_URL,
  });
}

// Build-time loader (ruling P2-R9). Phase 4 swaps placeholders for Supabase.
export function loader() {
  return {
    sections: placeholders.sections.visit,
    faqs: placeholders.faqs,
    settings: placeholders.settings,
  };
}

export default function Visit({ loaderData }: Route.ComponentProps) {
  return <VisitPage {...loaderData} />;
}
