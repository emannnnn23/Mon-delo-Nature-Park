import { loadForBuild, loadForClient } from "./routeData";

const SUPABASE = {
  VITE_SUPABASE_URL: "https://x",
  VITE_SUPABASE_ANON_KEY: "k",
};

describe("loadForBuild", () => {
  let warn: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  });
  afterEach(() => warn.mockRestore());

  it("returns the fetched content when the fetch succeeds", async () => {
    await expect(
      loadForBuild(() => Promise.resolve("live"), "fallback", {
        VERCEL_ENV: "production",
        ...SUPABASE,
      }),
    ).resolves.toBe("live");
    expect(warn).not.toHaveBeenCalled();
  });

  it("refuses to ship placeholders when a production fetch fails", async () => {
    await expect(
      loadForBuild(() => Promise.reject(new Error("boom")), "fallback", {
        VERCEL_ENV: "production",
        ...SUPABASE,
      }),
    ).rejects.toThrow(/refusing to ship placeholder/);
  });

  it("refuses to build production without the Supabase env, without fetching", async () => {
    const fetcher = vi.fn(() => Promise.resolve("live"));
    await expect(
      loadForBuild(fetcher, "fallback", { VERCEL_ENV: "production" }),
    ).rejects.toThrow(
      "Production build: could not load content from Supabase — refusing to ship placeholder content.",
    );
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("falls back to placeholders with a warning outside production", async () => {
    await expect(
      loadForBuild(() => Promise.reject(new Error("boom")), "fallback", {
        VERCEL_ENV: "preview",
      }),
    ).resolves.toBe("fallback");
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("falls back when no VERCEL_ENV is set (local and CI builds)", async () => {
    await expect(
      loadForBuild(() => Promise.reject(new Error("boom")), "fallback", {}),
    ).resolves.toBe("fallback");
  });
});

describe("loadForClient", () => {
  let warn: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  });
  afterEach(() => warn.mockRestore());

  it("returns the live content without calling the fallback", async () => {
    const fallback = vi.fn(() => Promise.resolve("snapshot"));
    await expect(
      loadForClient(() => Promise.resolve("live"), fallback),
    ).resolves.toBe("live");
    expect(fallback).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
  });

  it("returns the fallback and warns once when the live fetch fails", async () => {
    await expect(
      loadForClient(
        () => Promise.reject(new Error("offline")),
        () => Promise.resolve("snapshot"),
      ),
    ).resolves.toBe("snapshot");
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("rethrows the original error when there is no fallback", async () => {
    const original = new Error("offline");
    await expect(loadForClient(() => Promise.reject(original))).rejects.toBe(
      original,
    );
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("rethrows the original error when the fallback also fails", async () => {
    const original = new Error("offline");
    await expect(
      loadForClient(
        () => Promise.reject(original),
        () => Promise.reject(new Error("no snapshot")),
      ),
    ).rejects.toBe(original);
    expect(warn).toHaveBeenCalledTimes(1);
  });
});
