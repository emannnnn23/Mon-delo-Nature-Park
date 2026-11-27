// The parts of the attraction detail route shared by its two modules (ruling
// R13): `discover.$slug.tsx` (build-time `loader` + `clientLoader`, used when
// the build has published slugs) and `discover.$slug.live.tsx`
// (`clientLoader` only, used when it has none). `src/routes.ts` registers one
// of them. Neither module imports `./+types/...`: only the registered one
// would have generated types. Both re-export the component and the
// ErrorBoundary from here, and the framework only passes props to ones
// declared in the route module itself, so these read the route data through
// hooks instead.
import {
  data,
  isRouteErrorResponse,
  useLoaderData,
  useRouteError,
} from "react-router";

import { loadForClient } from "~/lib/routeData";
import { mediaVariantUrl } from "~/lib/media";
import { buildMeta, SITE_URL } from "~/lib/meta";
import { AttractionPage } from "~/pages/AttractionPage";
import { ErrorContent } from "~/pages/ErrorPage";
import { NotFoundContent } from "~/pages/NotFoundPage";
import type { Attraction } from "~/types/content";
import { pickFallbackSrc } from "~/utils/imageVariants";

export type AttractionData = { attraction: Attraction };

/**
 * The published attraction for `slug`, or null when there is none. Loaded
 * with `import()` so supabase-js stays out of the initial page chunks.
 */
export async function fetchAttractionData(
  slug: string,
): Promise<AttractionData | null> {
  const { getAttractionBySlug } = await import("~/services/content");
  const attraction = await getAttractionBySlug(slug);
  return attraction ? { attraction } : null;
}

export function notFound(): never {
  throw data(null, { status: 404 });
}

/**
 * The clientLoader body for both modules. A slug that was not pre-rendered
 * (an unknown one, or one published after the build) is served the SPA
 * fallback and answered here. An unpublished slug is a 404 even when a
 * snapshot exists; `snapshot` is used only when the live fetch fails.
 */
export async function clientAttractionData(
  slug: string | undefined,
  snapshot?: () => Promise<AttractionData>,
): Promise<AttractionData> {
  if (!slug) notFound();
  return (
    (await loadForClient(() => fetchAttractionData(slug), snapshot)) ??
    notFound()
  );
}

export function meta({
  params,
  loaderData,
}: {
  params: { slug?: string };
  loaderData?: AttractionData;
}) {
  const attraction = loaderData?.attraction;
  const cover = attraction?.cover;
  return buildMeta({
    title: attraction?.name ?? "Page not found",
    description:
      attraction?.summary ??
      "This page could not be found at Mondelos Nature Park.",
    path: `/discover/${params.slug}`,
    image: cover
      ? mediaVariantUrl(pickFallbackSrc(cover.variants, 1600))
      : null,
    siteUrl: SITE_URL,
  });
}

export default function DiscoverDetail() {
  const { attraction } = useLoaderData<AttractionData>();
  return <AttractionPage attraction={attraction} />;
}

export function ErrorBoundary() {
  const error = useRouteError();
  if (isRouteErrorResponse(error) && error.status === 404) {
    return <NotFoundContent />;
  }
  return <ErrorContent />;
}
