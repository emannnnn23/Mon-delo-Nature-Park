import type { RouteConfigEntry } from "@react-router/dev/routes";

import config from "../../../react-router.config";
import routes from "../../routes";

// The route config and the pre-render list both read the published slugs at
// build time; pin them so this test never reaches Supabase.
vi.mock("../../lib/buildContent", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../../lib/buildContent")>();
  return {
    ...actual,
    registerDetailRouteModule: vi.fn(async () =>
      actual.detailRouteModule(["falls"]),
    ),
    prerenderSlugs: vi.fn(async () => ["falls"]),
  };
});

function paths(entries: RouteConfigEntry[]): string[] {
  return entries.flatMap((entry) => [
    ...(entry.path !== undefined ? [entry.path] : []),
    ...paths(entry.children ?? []),
  ]);
}

describe("src/routes.ts", () => {
  const config_ = routes as RouteConfigEntry[];
  const publicLayout = config_.find((e) => e.file === "routes/_public.tsx");
  const adminLayout = config_.find(
    (e) => e.file === "routes/admin/_layout.tsx",
  );

  it("keeps the admin out of the public layout", () => {
    expect(publicLayout).toBeDefined();
    expect(
      paths(publicLayout?.children ?? []).filter((p) => p.startsWith("admin")),
    ).toEqual([]);
  });

  it("puts the admin routes in their own guarded layout", () => {
    expect(adminLayout).toBeDefined();
    expect(adminLayout?.path).toBeUndefined();
    expect(paths(adminLayout?.children ?? [])).toEqual([
      "admin",
      "admin/pages/:page",
      "admin/attractions",
      "admin/attractions/:id",
      "admin/gallery",
      "admin/testimonials",
      "admin/announcements",
      "admin/faqs",
      "admin/messages",
      "admin/media",
      "admin/settings",
      "admin/*",
    ]);
  });

  it("registers the detail module with a loader when slugs exist", () => {
    const detail = publicLayout?.children?.find(
      (e) => e.path === "discover/:slug",
    );
    expect(detail?.file).toBe("routes/discover.$slug.tsx");
    expect(detail?.id).toBe("routes/discover.$slug");
  });

  it("puts the login page outside the guarded layout and the public one", () => {
    const login = config_.find((e) => e.file === "routes/admin/login.tsx");
    expect(login?.path).toBe("admin/login");
    expect(paths(adminLayout?.children ?? [])).not.toContain("admin/login");
    expect(paths(publicLayout?.children ?? [])).not.toContain("admin/login");
  });
});

describe("react-router.config prerender", () => {
  it("lists the public pages and the build-time slugs, and no admin path", async () => {
    const { prerender } = config;
    expect(typeof prerender).toBe("function");
    const list = await (prerender as () => Promise<string[]>)();
    expect(list).toEqual([
      "/",
      "/discover",
      "/gallery",
      "/about",
      "/visit",
      "/404",
      "/discover/falls",
    ]);
    expect(list.filter((p) => p.startsWith("/admin"))).toEqual([]);
  });
});
