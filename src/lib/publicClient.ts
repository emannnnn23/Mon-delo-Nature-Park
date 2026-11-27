import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types/database";
import { getPublicEnv } from "./env";

let client: SupabaseClient<Database> | null = null;

/**
 * Lazy singleton for the client that reads the public site. It never keeps a
 * session, so a signed-in admin's token can never turn a public page into a
 * view of drafts. Returns null when the public env is not configured. Never
 * call this at import time.
 */
export function getPublicSupabase(): SupabaseClient<Database> | null {
  if (client) return client;
  const env = getPublicEnv();
  if (!env) return null;
  client = createClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storageKey: "mondelos-public",
    },
  });
  return client;
}
