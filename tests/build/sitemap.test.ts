import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  buildRobots,
  buildSitemap,
  sitemapPaths,
} from "../../scripts/generate-sitemap.mjs";
import { DEFAULT_SITE_URL, resolveSiteUrl } from "../../scripts/site-url.mjs";

function page(root: string, dir: string) {
  const full = join(root, dir);
  mkdirSync(full, { recursive: true });
  writeFileSync(join(full, "index.html"), "<html></html>");
}

describe("sitemap script", () => {
  it("lists index pages, leaving out 404, admin and the SPA fallback", () => {
    const root = mkdtempSync(join(tmpdir(), "sitemap-"));
    writeFileSync(join(root, "index.html"), "<html></html>");
    writeFileSync(join(root, "__spa-fallback.html"), "<html></html>");
    for (const dir of ["gallery", "discover/garden-walk", "404", "admin/media"])
      page(root, dir);
    expect(sitemapPaths(root)).toEqual(["/", "/discover/garden-walk", "/gallery"]);
  });

  it("writes the home entry with a slash, the others without, and escapes XML", () => {
    const xml = buildSitemap(["/", "/a&b"], "https://x.ph/", "2026-11-27");
    expect(xml).toContain("<loc>https://x.ph/</loc>");
    expect(xml).toContain("<loc>https://x.ph/a&amp;b</loc>");
    expect(xml).toContain("<lastmod>2026-11-27</lastmod>");
  });

  it("points robots.txt at the same site URL", () => {
    expect(buildRobots("https://x.ph/")).toBe(
      "User-agent: *\nDisallow: /admin\n\nSitemap: https://x.ph/sitemap.xml\n",
    );
  });

  it("falls back to the default site URL and trims trailing slashes", () => {
    expect(resolveSiteUrl(undefined)).toBe(DEFAULT_SITE_URL);
    expect(resolveSiteUrl("")).toBe(DEFAULT_SITE_URL);
    expect(resolveSiteUrl("https://x.ph//")).toBe("https://x.ph");
  });
});
