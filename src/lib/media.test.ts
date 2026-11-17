import { mediaVariantUrl, publicMediaUrl } from "./media";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("publicMediaUrl", () => {
  it("returns a relative-safe path when env is missing", () => {
    vi.stubEnv("VITE_SUPABASE_URL", "");
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "");
    expect(publicMediaUrl("a/b.webp")).toBe(
      "/storage/v1/object/public/media/a/b.webp",
    );
  });

  it("prefixes the Supabase URL", () => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://x.supabase.co/");
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "anon");
    expect(publicMediaUrl("a/b.webp")).toBe(
      "https://x.supabase.co/storage/v1/object/public/media/a/b.webp",
    );
  });
});

describe("mediaVariantUrl", () => {
  it("resolves a bucket key through the Supabase URL", () => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://x.supabase.co");
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "anon");
    expect(mediaVariantUrl("a/b.webp")).toBe(
      "https://x.supabase.co/storage/v1/object/public/media/a/b.webp",
    );
  });

  it("passes site-absolute and https paths through unchanged", () => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://x.supabase.co");
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "anon");
    expect(mediaVariantUrl("/images/hero/a.webp")).toBe("/images/hero/a.webp");
    expect(mediaVariantUrl("https://cdn.example.com/a.webp")).toBe(
      "https://cdn.example.com/a.webp",
    );
  });
});
