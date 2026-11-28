import type { ClientLoaderFunctionArgs } from "react-router";

import { clientAttractionData } from "./discover.$slug.shared";

// The detail module for a build with no published slugs (ruling R13). A
// module that exports `loader` must match a pre-rendered path or the build
// fails, so this twin of `discover.$slug.tsx` has only a `clientLoader`, and
// every attraction page is answered in the browser.
export { default, ErrorBoundary, meta } from "./discover.$slug.shared";

export function clientLoader({ params }: ClientLoaderFunctionArgs) {
  return clientAttractionData(params.slug);
}
clientLoader.hydrate = true as const;
