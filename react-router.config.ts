import type { Config } from "@react-router/dev/config";

import { placeholders } from "./src/content/placeholders";

const attractionSlugs = placeholders.attractions
  .filter((a) => a.kind === "attraction")
  .map((a) => a.slug);

export default {
  appDirectory: "src",
  ssr: false,
  // `/` must be listed so the SPA fallback is written as __spa-fallback.html.
  prerender: [
    "/",
    "/discover",
    "/gallery",
    "/about",
    "/visit",
    "/404",
    ...attractionSlugs.map((slug) => `/discover/${slug}`),
  ],
} satisfies Config;
