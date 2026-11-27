import { existsSync } from "node:fs";
import { join } from "node:path";

import { placeholders } from "~/content/placeholders";

const listPublishedAttractionSlugs = vi.hoisted(() => vi.fn());
vi.mock("../services/content", () => ({ listPublishedAttractionSlugs }));

const createPublicSupabase = vi.hoisted(() => vi.fn(() => ({ fake: true })));
vi.mock("./publicClient", () => ({ createPublicSupabase }));

import {
  assertSlugsMatchDetailModule,
  DETAIL_ROUTE_LIVE,
  DETAIL_ROUTE_PRERENDERED,
  detailRouteModule,
  listSlugsForBuild,
} from "./buildContent";

const placeholderSlugs = placeholders.attractions
  .filter((a) => a.kind === "attraction")
  .map((a) => a.slug);

describe("detailRouteModule", () => {
  // Ruling R13: a route module with a `loader` must match a prerendered path,
  // so with no published slugs the clientLoader-only module is registered.
  it("picks the clientLoader-only module when there are no slugs", () => {
    expect(detailRouteModule([])).toBe(DETAIL_ROUTE_LIVE);
  });

  it("picks the loader + clientLoader module when slugs exist", () => {
    expect(detailRouteModule(["falls"])).toBe(DETAIL_ROUTE_PRERENDERED);
  });

  it("names route files that exist", () => {
    for (const file of [DETAIL_ROUTE_LIVE, DETAIL_ROUTE_PRERENDERED]) {
      expect(existsSync(join(process.cwd(), "src", file))).toBe(true);
    }
  });
});

describe("assertSlugsMatchDetailModule", () => {
  const CHANGED = /published attractions changed during the build — rerun/i;

  it("passes when the slugs fit the registered module", () => {
    expect(() =>
      assertSlugsMatchDetailModule(DETAIL_ROUTE_PRERENDERED, ["falls"]),
    ).not.toThrow();
    expect(() =>
      assertSlugsMatchDetailModule(DETAIL_ROUTE_LIVE, []),
    ).not.toThrow();
  });

  it("fails when slugs appeared after the clientLoader-only module was registered", () => {
    expect(() =>
      assertSlugsMatchDetailModule(DETAIL_ROUTE_LIVE, ["falls"]),
    ).toThrow(CHANGED);
  });

  it("fails when every slug vanished after the loader module was registered", () => {
    expect(() =>
      assertSlugsMatchDetailModule(DETAIL_ROUTE_PRERENDERED, []),
    ).toThrow(CHANGED);
  });

  it("has nothing to compare when src/routes.ts was not evaluated", () => {
    expect(() => assertSlugsMatchDetailModule(undefined, [])).not.toThrow();
  });
});

describe("registerDetailRouteModule / prerenderSlugs", () => {
  const KEY = Symbol.for("mondelos.registeredDetailModule");
  const store = globalThis as { [KEY]?: string };

  beforeEach(() => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "anon");
    vi.resetModules();
    listPublishedAttractionSlugs.mockReset();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    store[KEY] = undefined;
  });

  it("reads the slugs once for both the route config and the pre-render list", async () => {
    listPublishedAttractionSlugs.mockResolvedValue(["falls"]);
    const fresh = await import("./buildContent");
    await expect(fresh.registerDetailRouteModule()).resolves.toBe(
      DETAIL_ROUTE_PRERENDERED,
    );
    await expect(fresh.prerenderSlugs()).resolves.toEqual(["falls"]);
    expect(listPublishedAttractionSlugs).toHaveBeenCalledTimes(1);
  });

  it("fails the pre-render list read in another runner when it no longer fits", async () => {
    // src/routes.ts registered the clientLoader-only module in one runner...
    listPublishedAttractionSlugs.mockResolvedValueOnce([]);
    const routesRunner = await import("./buildContent");
    await routesRunner.registerDetailRouteModule();
    // ...and the config, in a fresh module instance, now sees a slug.
    vi.resetModules();
    listPublishedAttractionSlugs.mockResolvedValueOnce(["falls"]);
    const configRunner = await import("./buildContent");
    await expect(configRunner.prerenderSlugs()).rejects.toThrow(
      /rerun the build/,
    );
  });
});

describe("listSlugsForBuild", () => {
  let warn: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    listPublishedAttractionSlugs.mockReset();
    createPublicSupabase.mockClear();
  });
  afterEach(() => warn.mockRestore());

  it("lists the published slugs with a client built from the given env", async () => {
    listPublishedAttractionSlugs.mockResolvedValue(["falls", "pool"]);
    await expect(
      listSlugsForBuild({
        VITE_SUPABASE_URL: "https://example.supabase.co",
        VITE_SUPABASE_ANON_KEY: "anon",
      }),
    ).resolves.toEqual(["falls", "pool"]);
    expect(createPublicSupabase).toHaveBeenCalledWith({
      supabaseUrl: "https://example.supabase.co",
      supabaseAnonKey: "anon",
    });
    expect(listPublishedAttractionSlugs).toHaveBeenCalledWith({ fake: true });
  });

  it("keeps an empty published list empty (zero-slug build)", async () => {
    listPublishedAttractionSlugs.mockResolvedValue([]);
    await expect(
      listSlugsForBuild({
        VITE_SUPABASE_URL: "https://example.supabase.co",
        VITE_SUPABASE_ANON_KEY: "anon",
      }),
    ).resolves.toEqual([]);
  });

  it("falls back to the placeholder slugs without a Supabase env", async () => {
    await expect(listSlugsForBuild({})).resolves.toEqual(placeholderSlugs);
    expect(listPublishedAttractionSlugs).not.toHaveBeenCalled();
  });

  it("fails a production build without a Supabase env", async () => {
    await expect(
      listSlugsForBuild({ VERCEL_ENV: "production" }),
    ).rejects.toThrow(/refusing to ship placeholder/);
  });
});
