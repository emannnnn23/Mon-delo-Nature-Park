import { getSupabase, publicMediaUrl } from "./supabase";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("supabase helpers without env", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_SUPABASE_URL", "");
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "");
  });

  it("getSupabase returns null when env is missing", () => {
    expect(getSupabase()).toBeNull();
  });

  it("publicMediaUrl returns a relative-safe path when env is missing", () => {
    expect(publicMediaUrl("a/b.webp")).toBe(
      "/storage/v1/object/public/media/a/b.webp",
    );
  });
});

describe("publicMediaUrl with env", () => {
  it("prefixes the Supabase URL", () => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://x.supabase.co/");
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "anon");
    expect(publicMediaUrl("a/b.webp")).toBe(
      "https://x.supabase.co/storage/v1/object/public/media/a/b.webp",
    );
  });
});
