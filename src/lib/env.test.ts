import { getPublicEnv } from "./env";

describe("getPublicEnv", () => {
  it("returns null when values are missing", () => {
    expect(getPublicEnv({})).toBeNull();
    expect(
      getPublicEnv({
        VITE_SUPABASE_URL: "https://x.supabase.co",
        VITE_SUPABASE_ANON_KEY: "",
      }),
    ).toBeNull();
  });

  it("returns parsed env", () => {
    expect(
      getPublicEnv({
        VITE_SUPABASE_URL: "https://x.supabase.co",
        VITE_SUPABASE_ANON_KEY: "k",
      }),
    ).toEqual({ supabaseUrl: "https://x.supabase.co", supabaseAnonKey: "k" });
  });

  it("allows local http, rejects other http", () => {
    expect(
      getPublicEnv({
        VITE_SUPABASE_URL: "http://127.0.0.1:54321",
        VITE_SUPABASE_ANON_KEY: "k",
      }),
    ).not.toBeNull();
    expect(() =>
      getPublicEnv({
        VITE_SUPABASE_URL: "http://evil.com",
        VITE_SUPABASE_ANON_KEY: "k",
      }),
    ).toThrow("VITE_SUPABASE_URL must be an https URL");
  });
});
