export type PublicEnv = {
  supabaseUrl: string;
  supabaseAnonKey: string;
};

type EnvSource = Record<string, string | undefined>;

const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost"]);

function assertHttps(rawUrl: string): void {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error("VITE_SUPABASE_URL must be an https URL");
  }
  const isLocalHttp = url.protocol === "http:" && LOCAL_HOSTS.has(url.hostname);
  if (url.protocol !== "https:" && !isLocalHttp) {
    throw new Error("VITE_SUPABASE_URL must be an https URL");
  }
}

/**
 * Reads the public Supabase settings. Returns null when either value is
 * missing or empty so callers can render without a backend.
 */
export function getPublicEnv(
  source: EnvSource = import.meta.env as EnvSource,
): PublicEnv | null {
  const supabaseUrl = source.VITE_SUPABASE_URL?.trim();
  const supabaseAnonKey = source.VITE_SUPABASE_ANON_KEY?.trim();
  if (!supabaseUrl || !supabaseAnonKey) return null;

  assertHttps(supabaseUrl);
  return { supabaseUrl, supabaseAnonKey };
}
