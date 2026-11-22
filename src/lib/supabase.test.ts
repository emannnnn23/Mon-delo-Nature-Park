import { getSupabase } from "./supabase";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getSupabase", () => {
  it("returns null when env is missing", () => {
    vi.stubEnv("VITE_SUPABASE_URL", "");
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "");
    expect(getSupabase()).toBeNull();
  });
});
