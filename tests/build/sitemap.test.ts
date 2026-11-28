import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  buildRobots,
  buildSitemap,
  siteUrlForBuild,
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

describe("siteUrlForBuild", () => {
  it("uses the configured URL, in production too", () => {
    expect(
      siteUrlForBuild({ configured: "https://x.ph/", vercelEnv: "production" }),
    ).toBe("https://x.ph");
  });

  it("falls back to the default outside production", () => {
    for (const vercelEnv of [undefined, "preview", "development"]) {
      expect(siteUrlForBuild({ configured: undefined, vercelEnv })).toBe(
        DEFAULT_SITE_URL,
      );
    }
  });

  it("refuses a production build with no site URL", () => {
    for (const configured of [undefined, "", "   "]) {
      expect(() =>
        siteUrlForBuild({ configured, vercelEnv: "production" }),
      ).toThrow(/VITE_SITE_URL/);
    }
  });
});

describe("generate-sitemap.mjs", () => {
  const script = join(process.cwd(), "scripts", "generate-sitemap.mjs");
  // Run from an empty folder so no .env file of the repo is read.
  const run = (env: Record<string, string>, args: string[] = []) => {
    const root = mkdtempSync(join(tmpdir(), "sitemap-run-"));
    writeFileSync(join(root, "index.html"), "<html></html>");
    const clean = { ...process.env };
    delete clean.VITE_SITE_URL;
    delete clean.VERCEL_ENV;
    return spawnSync("node", [script, root, ...args], {
      cwd: root,
      env: { ...clean, ...env },
      encoding: "utf8",
    });
  };

  it("exits non-zero with a clear message on a production build without VITE_SITE_URL", () => {
    const result = run({ VERCEL_ENV: "production" });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("VITE_SITE_URL is not set");
  });

  it("succeeds on a production build with VITE_SITE_URL or a URL argument", () => {
    expect(
      run({ VERCEL_ENV: "production", VITE_SITE_URL: "https://x.ph" }).status,
    ).toBe(0);
    expect(run({ VERCEL_ENV: "production" }, ["https://y.ph"]).status).toBe(0);
  });

  it("succeeds on a preview build without VITE_SITE_URL", () => {
    expect(run({ VERCEL_ENV: "preview" }).status).toBe(0);
  });
});
