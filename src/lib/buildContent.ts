// Build-time only: react-router.config.ts and src/routes.ts import this to
// decide what to pre-render. They run in Node through React Router's config
// loader, which has no `import.meta.env` and no `~/` alias, hence the
// relative imports and the explicit env. Never import this from a page.
import { loadEnv } from "vite";

import { placeholders } from "../content/placeholders";
import { listPublishedAttractionSlugs } from "../services/content";
import { getPublicEnv } from "./env";
import { createPublicSupabase } from "./publicClient";
import { loadForBuild } from "./routeData";

type EnvSource = Record<string, string | undefined>;

/** The detail module with a build-time `loader` (pre-rendered slugs). */
export const DETAIL_ROUTE_PRERENDERED = "routes/discover.$slug.tsx";
/** The detail module without a `loader`, for a build with no slugs. */
export const DETAIL_ROUTE_LIVE = "routes/discover.$slug.live.tsx";

/**
 * The env the build reads Supabase settings from: the `VITE_` values of the
 * `.env` files Vite would load, overridden by the real process env (which is
 * how Vercel provides them).
 */
export function buildEnv(): EnvSource {
  const mode =
    process.env.NODE_ENV === "development" ? "development" : "production";
  return { ...loadEnv(mode, process.cwd(), "VITE_"), ...process.env };
}

/**
 * Published attraction slugs to pre-render. Outside production a build
 * without Supabase falls back to the placeholder slugs.
 */
export function listSlugsForBuild(
  env: EnvSource = buildEnv(),
): Promise<string[]> {
  return loadForBuild(
    async () => {
      const publicEnv = getPublicEnv(env);
      if (!publicEnv) {
        throw new Error("VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY not set.");
      }
      return listPublishedAttractionSlugs(createPublicSupabase(publicEnv));
    },
    placeholders.attractions
      .filter((a) => a.kind === "attraction")
      .map((a) => a.slug),
    env,
  );
}

/**
 * Which detail module to register (ruling R13). A module that exports a
 * `loader` must match at least one pre-rendered path or the build fails, so
 * a build with no published slugs registers the clientLoader-only module.
 */
export function detailRouteModule(slugs: readonly string[]): string {
  return slugs.length > 0 ? DETAIL_ROUTE_PRERENDERED : DETAIL_ROUTE_LIVE;
}
