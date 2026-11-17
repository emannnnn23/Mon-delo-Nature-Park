import { placeholders } from "~/content/placeholders";
import { buildMeta, SITE_URL } from "~/lib/meta";

import type { Route } from "./+types/discover.$slug";

function findAttraction(slug: string | undefined) {
  return placeholders.attractions.find((a) => a.slug === slug) ?? null;
}

export function meta({ params }: Route.MetaArgs) {
  const attraction = findAttraction(params.slug);
  return buildMeta({
    title: attraction?.name ?? "Page not found",
    description:
      attraction?.summary ??
      "This page could not be found at Mondelos Nature Park.",
    path: `/discover/${params.slug}`,
    siteUrl: SITE_URL,
  });
}

export function clientLoader({ params }: Route.ClientLoaderArgs) {
  return { attraction: findAttraction(params.slug) };
}

export default function DiscoverDetail({ loaderData }: Route.ComponentProps) {
  const { attraction } = loaderData;
  return (
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="font-serif text-4xl text-forest-900">
        {attraction?.name ?? "Page not found"}
      </h1>
    </main>
  );
}
