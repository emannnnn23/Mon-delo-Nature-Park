export const DEFAULT_SUPABASE_URL: string;
export function supabaseWsUrl(supabaseUrl: string): string;
export function buildCsp(options: {
  scriptHashes: string[];
  supabaseUrl: string;
}): string;
export function injectCsp(html: string, supabaseUrl: string): string;
export function injectCspInDir(buildDir: string, supabaseUrl: string): number;
