import { data, isRouteErrorResponse } from "react-router";

import { placeholders } from "~/content/placeholders";
import { publicMediaUrl } from "~/lib/media";
import { buildMeta, SITE_URL } from "~/lib/meta";
import { AttractionPage } from "~/pages/AttractionPage";
import { ErrorContent } from "~/pages/ErrorPage";
import { NotFoundContent } from "~/pages/NotFoundPage";
import { pickFallbackSrc } from "~/utils/imageVariants";

import type { Route } from "./+types/discover.$slug";

// Experiences have no detail page and are not prerendered.
function findAttraction(slug: string | undefined) {
  return (
    placeholders.attractions.find(
      (a) => a.kind === "attraction" && a.slug === slug,
    ) ?? null
  );
}

export function meta({ params, loaderData }: Route.MetaArgs) {
  const attraction = loaderData?.attraction;
  const cover = attraction?.cover;
  return buildMeta({
    title: attraction?.name ?? "Page not found",
    description:
      attraction?.summary ??
      "This page could not be found at Mondelos Nature Park.",
    path: `/discover/${params.slug}`,
    image: cover ? publicMediaUrl(pickFallbackSrc(cover.variants, 1600)) : null,
    siteUrl: SITE_URL,
  });
}

// Build-time loader (ruling P2-R9). Phase 4 swaps placeholders for Supabase.
export function loader({ params }: Route.LoaderArgs) {
  const attraction = findAttraction(params.slug);
  if (!attraction) throw data(null, { status: 404 });
  return { attraction };
}

export default function DiscoverDetail({ loaderData }: Route.ComponentProps) {
  return <AttractionPage attraction={loaderData.attraction} />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  if (isRouteErrorResponse(error) && error.status === 404) {
    return <NotFoundContent />;
  }
  return <ErrorContent />;
}
