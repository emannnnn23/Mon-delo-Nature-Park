const createClient = vi.hoisted(() => vi.fn(() => ({ marker: "client" })));
vi.mock("@supabase/supabase-js", () => ({ createClient }));

describe("getPublicSupabase", () => {
  beforeEach(() => {
    vi.resetModules();
    createClient.mockClear();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns null when env is missing", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "");
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "");
    const { getPublicSupabase } = await import("./publicClient");
    expect(getPublicSupabase()).toBeNull();
    expect(createClient).not.toHaveBeenCalled();
  });

  it("creates one session-less client and reuses it", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "anon-key");
    const { getPublicSupabase } = await import("./publicClient");
    const first = getPublicSupabase();
    expect(getPublicSupabase()).toBe(first);
    expect(createClient).toHaveBeenCalledTimes(1);
    expect(createClient).toHaveBeenCalledWith(
      "https://example.supabase.co",
      "anon-key",
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
          storageKey: "mondelos-public",
        },
      },
    );
  });
});
