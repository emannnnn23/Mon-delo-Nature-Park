import type { Config } from "@react-router/dev/config";

import { prerenderSlugs } from "./src/lib/buildContent";

export default {
  appDirectory: "src",
  ssr: false,
  // `/` must be listed so the SPA fallback is written as __spa-fallback.html.
  // Attraction pages are the published slugs at build time; a slug published
  // later is answered in the browser by the detail route's clientLoader.
  // prerenderSlugs() fails the build if the list no longer fits the detail
  // module src/routes.ts registered.
  prerender: async () => [
    "/",
    "/discover",
    "/gallery",
    "/about",
    "/visit",
    "/404",
    ...(await prerenderSlugs()).map((slug) => `/discover/${slug}`),
  ],
} satisfies Config;
