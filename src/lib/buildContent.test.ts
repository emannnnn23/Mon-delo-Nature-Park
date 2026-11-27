import { existsSync } from "node:fs";
import { join } from "node:path";

import { placeholders } from "~/content/placeholders";

const listPublishedAttractionSlugs = vi.hoisted(() => vi.fn());
vi.mock("../services/content", () => ({ listPublishedAttractionSlugs }));

const createPublicSupabase = vi.hoisted(() => vi.fn(() => ({ fake: true })));
vi.mock("./publicClient", () => ({ createPublicSupabase }));

import {
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
