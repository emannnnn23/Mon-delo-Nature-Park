import { placeholders } from "~/content/placeholders";
import { buildMeta, SITE_URL } from "~/lib/meta";

export function meta() {
  return buildMeta({
    title: "Visit Us",
    description: "Plan your visit to Mondelos Nature Park in Kawayan, Biliran.",
    path: "/visit",
    siteUrl: SITE_URL,
  });
}

export function loader() {
  return {
    sections: placeholders.sections.visit,
    settings: placeholders.settings,
  };
}

export default function Visit() {
  return (
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="font-serif text-4xl text-forest-900">Visit Us</h1>
    </main>
  );
}
