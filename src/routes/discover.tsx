import { placeholders } from "~/content/placeholders";
import { buildMeta, SITE_URL } from "~/lib/meta";

export function meta() {
  return buildMeta({
    title: "Discover the Park",
    description:
      "Explore the attractions and experiences at Mondelos Nature Park.",
    path: "/discover",
    siteUrl: SITE_URL,
  });
}

export function loader() {
  return { attractions: placeholders.attractions };
}

export default function Discover() {
  return (
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="font-serif text-4xl text-forest-900">Discover the Park</h1>
    </main>
  );
}
