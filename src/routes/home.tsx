import { placeholders } from "~/content/placeholders";
import { buildMeta, SITE_URL } from "~/lib/meta";

export function meta() {
  return buildMeta({
    description: "Mondelos Nature Park in Kawayan, Biliran, Philippines.",
    path: "/",
    siteUrl: SITE_URL,
  });
}

export function clientLoader() {
  return { sections: placeholders.sections.home };
}

export default function Home() {
  return (
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="font-serif text-4xl text-forest-900">
        Find Your Peace in Nature.
      </h1>
    </main>
  );
}
