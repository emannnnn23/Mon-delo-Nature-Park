import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types/database";
import { getPublicEnv, type PublicEnv } from "./env";

let client: SupabaseClient<Database> | null = null;

/**
 * A client that reads the public site and never keeps a session, so a
 * signed-in admin's token can never turn a public page into a view of drafts.
 * The build uses it directly with the env it resolved itself; pages use
 * `getPublicSupabase()`.
 */
export function createPublicSupabase(env: PublicEnv): SupabaseClient<Database> {
  return createClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storageKey: "mondelos-public",
    },
  });
}

/**
 * Lazy singleton of the public client, configured from `import.meta.env`.
 * Returns null when the public env is not configured. Never call this at
 * import time.
 */
export function getPublicSupabase(): SupabaseClient<Database> | null {
  if (client) return client;
  const env = getPublicEnv();
  if (!env) return null;
  client = createPublicSupabase(env);
  return client;
}
