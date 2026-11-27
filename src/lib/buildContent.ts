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
  return { ...loadEnv(buildMode(), process.cwd(), "VITE_"), ...process.env };
}

// React Router's config loader exposes Vite's mode as `import.meta.env.MODE`
// (it loads no `.env` values itself). Limitation: a custom `--mode` reaches
// only some of the build's config loads (the others see "production"), so
// for a custom mode put the Supabase vars in the process env, not in an
// `.env.[mode]` file.
function buildMode(): string {
  return (
    (import.meta.env as Partial<ImportMetaEnv> | undefined)?.MODE ??
    (process.env.NODE_ENV === "development" ? "development" : "production")
  );
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

// --- one slug list per build -------------------------------------------------
//
// src/routes.ts picks the detail module and react-router.config.ts lists the
// pages to pre-render; both must come from the same slug list. When they load
// in one module runner they share this memoised promise. The module routes.ts
// registered is also kept on globalThis, so a pre-render list read in another
// runner is still checked against it.

const REGISTERED_DETAIL_MODULE = Symbol.for("mondelos.registeredDetailModule");
type BuildGlobal = { [REGISTERED_DETAIL_MODULE]?: string };

let slugsForBuild: Promise<string[]> | undefined;

/** The build's slug list, read from Supabase once per module runner. */
function buildSlugs(): Promise<string[]> {
  slugsForBuild ??= listSlugsForBuild();
  return slugsForBuild;
}

/** For src/routes.ts: the detail module to register, remembered for the guard. */
export async function registerDetailRouteModule(): Promise<string> {
  const file = detailRouteModule(await buildSlugs());
  (globalThis as BuildGlobal)[REGISTERED_DETAIL_MODULE] = file;
  return file;
}

/** For the pre-render list: the slugs, checked against the registered module. */
export async function prerenderSlugs(): Promise<string[]> {
  const slugs = await buildSlugs();
  assertSlugsMatchDetailModule(
    (globalThis as BuildGlobal)[REGISTERED_DETAIL_MODULE],
    slugs,
  );
  return slugs;
}

/**
 * Fails the build when the pre-render list no longer fits the detail module
 * src/routes.ts registered (an attraction was published or unpublished
 * between the two reads). `registered` is undefined only when src/routes.ts
 * was not evaluated in this process, and then there is nothing to compare.
 */
export function assertSlugsMatchDetailModule(
  registered: string | undefined,
  slugs: readonly string[],
): void {
  if (registered === undefined) return;
  const expected = detailRouteModule(slugs);
  if (registered !== expected) {
    throw new Error(
      `Published attractions changed during the build — rerun the build. ` +
        `src/routes.ts registered ${registered}, but the pre-render list has ` +
        `${slugs.length} attraction slug(s), which needs ${expected}.`,
    );
  }
}
