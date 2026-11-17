import { placeholders } from "~/content/placeholders";
import { buildMeta, SITE_URL } from "~/lib/meta";

export function meta() {
  return [
    ...buildMeta({
      title: "Page not found",
      description: "This page could not be found at Mondelos Nature Park.",
      path: "/404",
      siteUrl: SITE_URL,
    }),
    { name: "robots", content: "noindex" },
  ];
}

export function clientLoader() {
  return { attractions: placeholders.attractions };
}

export default function NotFound() {
  return (
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="font-serif text-4xl text-forest-900">Page not found</h1>
    </main>
  );
}
