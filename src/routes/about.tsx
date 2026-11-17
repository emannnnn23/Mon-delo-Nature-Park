import { placeholders } from "~/content/placeholders";
import { buildMeta, SITE_URL } from "~/lib/meta";

export function meta() {
  return buildMeta({
    title: "About the Park",
    description: "About Mondelos Nature Park in Kawayan, Biliran.",
    path: "/about",
    siteUrl: SITE_URL,
  });
}

export function loader() {
  return { sections: placeholders.sections.about };
}

export default function About() {
  return (
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="font-serif text-4xl text-forest-900">About the Park</h1>
    </main>
  );
}
