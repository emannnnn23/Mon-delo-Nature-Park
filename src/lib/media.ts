import { getPublicEnv } from "./env";

/**
 * Public URL of a file in the `media` storage bucket. When the env is missing
 * (tests, previews without a backend) it returns the same path without a host,
 * so the result is always a well-formed relative URL. It does throw when the
 * env is set to a URL that is neither https nor a local address
 * (`getPublicEnv` rejects it).
 */
export function publicMediaUrl(path: string): string {
  const base = getPublicEnv()?.supabaseUrl.replace(/\/+$/, "") ?? "";
  return `${base}/storage/v1/object/public/media/${path}`;
}

/**
 * URL for a media variant path. Paths that are already absolute (a site static
 * file such as `/images/...`, or a full `https://` URL) pass through unchanged;
 * anything else is a key in the `media` bucket.
 */
export function mediaVariantUrl(path: string): string {
  // `//host` and `/\host` are protocol-relative, so they are not site paths.
  if (/^\/[^/\\]/.test(path) || path.startsWith("https://")) return path;
  return publicMediaUrl(path);
}
