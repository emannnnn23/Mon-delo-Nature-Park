import { getPublicEnv } from "./env";

/**
 * Public URL of a file in the `media` storage bucket. When the env is missing
 * (tests, previews without a backend) it returns the same path without a host,
 * so the result is always a well-formed relative URL and never throws.
 */
export function publicMediaUrl(path: string): string {
  const base = getPublicEnv()?.supabaseUrl.replace(/\/+$/, "") ?? "";
  return `${base}/storage/v1/object/public/media/${path}`;
}
