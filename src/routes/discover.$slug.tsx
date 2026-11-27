import type {
  ClientLoaderFunctionArgs,
  LoaderFunctionArgs,
} from "react-router";

import { placeholders } from "~/content/placeholders";
import { loadForBuild } from "~/lib/routeData";

import {
  clientAttractionData,
  fetchAttractionData,
  notFound,
  type AttractionData,
} from "./discover.$slug.shared";

// The detail module for a build with published slugs: each one is
// pre-rendered from `loader`, then refreshed by `clientLoader`.
// `discover.$slug.live.tsx` is its clientLoader-only twin (ruling R13).
export { default, ErrorBoundary, meta } from "./discover.$slug.shared";

// Placeholder fallback for a local or preview build without Supabase.
// Experiences have no detail page, so only attractions are matched.
function placeholderData(slug: string): AttractionData | null {
  const attraction = placeholders.attractions.find(
    (a) => a.kind === "attraction" && a.slug === slug,
  );
  return attraction ? { attraction } : null;
}

export async function loader({ params }: LoaderFunctionArgs) {
  const slug = params.slug ?? "";
  return (
    (await loadForBuild(
      () => fetchAttractionData(slug),
      placeholderData(slug),
    )) ?? notFound()
  );
}

// `serverLoader()` returns the build-time snapshot of a pre-rendered slug and
// is used only when the live fetch fails. For a slug that was not
// pre-rendered it rejects, and the live error reaches the ErrorBoundary.
export function clientLoader({
  params,
  serverLoader,
}: ClientLoaderFunctionArgs) {
  return clientAttractionData(params.slug, () => serverLoader<typeof loader>());
}
clientLoader.hydrate = true as const;
