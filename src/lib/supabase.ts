import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types/database";
import { getPublicEnv } from "./env";

let client: SupabaseClient<Database> | null = null;

/**
 * Lazy singleton for the Supabase client. Returns null when the public env is
 * not configured so the site can still render without a backend. Never call
 * this at import time.
 */
export function getSupabase(): SupabaseClient<Database> | null {
  if (client) return client;
  const env = getPublicEnv();
  if (!env) return null;
  client = createClient<Database>(env.supabaseUrl, env.supabaseAnonKey);
  return client;
}

/**
 * Public URL of a file in the `media` storage bucket. When the env is missing
 * (tests, previews without a backend) it returns the same path without a host,
 * so the result is always a well-formed relative URL and never throws.
 */
export function publicMediaUrl(path: string): string {
  const base = getPublicEnv()?.supabaseUrl.replace(/\/+$/, "") ?? "";
  return `${base}/storage/v1/object/public/media/${path}`;
}
