import { placeholders } from "~/content/placeholders";
import { buildMeta, SITE_URL } from "~/lib/meta";

export function meta() {
  return buildMeta({
    title: "Gallery",
    description: "Photos of Mondelos Nature Park in Kawayan, Biliran.",
    path: "/gallery",
    siteUrl: SITE_URL,
  });
}

export function clientLoader() {
  return {
    categories: placeholders.galleryCategories,
    images: placeholders.galleryImages,
  };
}

export default function Gallery() {
  return (
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="font-serif text-4xl text-forest-900">Gallery</h1>
    </main>
  );
}
