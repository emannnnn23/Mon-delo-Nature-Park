import { placeholders } from "~/content/placeholders";
import { buildMeta, defaultShareImage, SITE_URL } from "~/lib/meta";
import { loadForBuild, loadForClient } from "~/lib/routeData";
import type { ContactSubmit } from "~/components/forms/ContactForm";
import { VisitPage } from "~/pages/VisitPage";

import type { Route } from "./+types/visit";

export function meta({ matches }: Route.MetaArgs) {
  return buildMeta({
    title: "Visit Us",
    description: "Plan your visit to Mondelos Nature Park in Kawayan, Biliran.",
    path: "/visit",
    image: defaultShareImage(matches),
    siteUrl: SITE_URL,
  });
}

// Shared by both loaders (`clientLoader` must never call the build-stripped
// `loader`). `import()` keeps supabase-js out of the initial page chunks.
async function liveVisit() {
  const { getSiteChrome, getVisitContent } = await import("~/services/content");
  const [{ sections, faqs }, { settings }] = await Promise.all([
    getVisitContent(),
    getSiteChrome(),
  ]);
  return { sections, faqs, settings };
}

export function loader() {
  return loadForBuild(liveVisit, {
    sections: placeholders.sections.visit,
    faqs: placeholders.faqs,
    settings: placeholders.settings,
  });
}

export function clientLoader({ serverLoader }: Route.ClientLoaderArgs) {
  return loadForClient(liveVisit, () => serverLoader());
}
clientLoader.hydrate = true as const;

// Loaded on submit so supabase-js stays out of the initial public chunks.
const sendContactMessage: ContactSubmit = async (input) => {
  const { submitContactMessage } = await import("~/services/contact");
  return submitContactMessage(input);
};

export default function Visit({ loaderData }: Route.ComponentProps) {
  return <VisitPage {...loaderData} onSubmit={sendContactMessage} />;
}
