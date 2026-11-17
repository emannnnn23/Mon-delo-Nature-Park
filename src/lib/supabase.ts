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
