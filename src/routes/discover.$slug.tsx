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

// Shared by both loaders. `clientLoader` must not call `loader`: the build
// strips `loader` from the client bundle.
function attractionData(slug: string | undefined) {
  const attraction = findAttraction(slug);
  if (!attraction) throw data(null, { status: 404 });
  return { attraction };
}

// Build-time loader (ruling P2-R9). Phase 4 swaps placeholders for Supabase.
export function loader({ params }: Route.LoaderArgs) {
  return attractionData(params.slug);
}

// A slug that was not prerendered (an unknown one, or one published after the
// build) is served the SPA fallback with no `.data` file to fetch, so the
// browser answers it here: the attraction, or a 404 for the ErrorBoundary.
// Same data as the loader, so hydrating a prerendered page changes nothing.
export function clientLoader({ params }: Route.ClientLoaderArgs) {
  return attractionData(params.slug);
}
clientLoader.hydrate = true as const;

export default function DiscoverDetail({ loaderData }: Route.ComponentProps) {
  return <AttractionPage attraction={loaderData.attraction} />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  if (isRouteErrorResponse(error) && error.status === 404) {
    return <NotFoundContent />;
  }
  return <ErrorContent />;
}
