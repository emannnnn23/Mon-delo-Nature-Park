import type { RouteConfigEntry } from "@react-router/dev/routes";

import config from "../../../react-router.config";
import routes from "../../routes";

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
      "admin/media",
      "admin/*",
    ]);
  });

  it("puts the login page outside the guarded layout and the public one", () => {
    const login = config_.find((e) => e.file === "routes/admin/login.tsx");
    expect(login?.path).toBe("admin/login");
    expect(paths(adminLayout?.children ?? [])).not.toContain("admin/login");
    expect(paths(publicLayout?.children ?? [])).not.toContain("admin/login");
  });
});

describe("react-router.config prerender", () => {
  it("lists no admin path (admin is client-only)", () => {
    const { prerender } = config;
    expect(Array.isArray(prerender)).toBe(true);
    const list = prerender as string[];
    expect(list.length).toBeGreaterThan(0);
    expect(list.filter((p) => p.startsWith("/admin"))).toEqual([]);
  });
});
