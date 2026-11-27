import { getPublicEnv } from "./env";

type EnvSource = Record<string, string | undefined>;

const REFUSE_PLACEHOLDERS =
  "Production build: could not load content from Supabase — refusing to ship placeholder content. ";

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Build-time content for a route `loader` (and the pre-render list).
 *
 * A production build (`VERCEL_ENV === "production"`) must publish real
 * content, so a missing Supabase env or any failed fetch fails the build.
 * Every other build (local, preview, CI) warns and uses `fallback`, the
 * placeholder content. Keep `fallback` to build-time code: it is the only
 * place placeholders may reach a page.
 */
export async function loadForBuild<T>(
  fetcher: () => Promise<T>,
  fallback: T,
  env: EnvSource = process.env,
): Promise<T> {
  const production = env.VERCEL_ENV === "production";
  if (production) {
    let configured: boolean;
    try {
      configured = getPublicEnv(env) !== null;
    } catch (error) {
      throw new Error(REFUSE_PLACEHOLDERS + messageOf(error), { cause: error });
    }
    if (!configured) {
      throw new Error(
        REFUSE_PLACEHOLDERS +
          "VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set.",
      );
    }
  }
  try {
    return await fetcher();
  } catch (error) {
    if (production) {
      throw new Error(REFUSE_PLACEHOLDERS + messageOf(error), { cause: error });
    }
    console.warn(`[build] Using placeholder content: ${messageOf(error)}`);
    return fallback;
  }
}

/**
 * Live content for a route `clientLoader`. When the live fetch fails it warns
 * once and returns `fallback()` (the route's build-time snapshot, through
 * `serverLoader()`). With no fallback, or when the fallback fails too (a page
 * that was not pre-rendered has no snapshot), the original error is rethrown
 * for the route's ErrorBoundary.
 */
export async function loadForClient<T>(
  fetcher: () => Promise<T>,
  fallback?: () => Promise<T>,
): Promise<T> {
  try {
    return await fetcher();
  } catch (error) {
    console.warn("[content] Live content could not be loaded.", error);
    if (!fallback) throw error;
    try {
      return await fallback();
    } catch {
      throw error;
    }
  }
}
