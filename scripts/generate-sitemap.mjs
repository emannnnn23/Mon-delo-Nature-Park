// Writes sitemap.xml and robots.txt into the static build.
//
//   node scripts/generate-sitemap.mjs [buildDir=build/client] [siteUrl=$VITE_SITE_URL]
//
// robots.txt is generated here, not shipped from public/, so its Sitemap line
// always matches the site URL the page meta uses (see site-url.mjs).
import { readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

import { loadEnv } from "vite";

import { resolveSiteUrl } from "./site-url.mjs";

/** Pages that must never be listed, whatever the build produced. */
function isExcluded(segments) {
  const first = segments[0];
  return first === "404" || first === "__spa-fallback" || first === "admin";
}

function findIndexPages(dir, found = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) findIndexPages(full, found);
    else if (name === "index.html") found.push(full);
  }
  return found;
}

/**
 * Public paths of the pre-rendered pages under `buildDir`: `/` for the home
 * page, `/discover` style (no trailing slash) for the rest, sorted.
 */
export function sitemapPaths(buildDir) {
  const paths = [];
  for (const file of findIndexPages(buildDir)) {
    const segments = relative(buildDir, join(file, ".."))
      .split(sep)
      .filter(Boolean);
    if (isExcluded(segments)) continue;
    paths.push(segments.length ? `/${segments.join("/")}` : "/");
  }
  return paths.sort();
}

function escapeXml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** `lastmod` is a YYYY-MM-DD date. The home path "/" keeps its slash. */
export function buildSitemap(paths, siteUrl, lastmod) {
  const base = siteUrl.replace(/\/+$/, "");
  const entries = paths.map(
    (path) =>
      `  <url>\n    <loc>${escapeXml(base + path)}</loc>\n    <lastmod>${lastmod}</lastmod>\n  </url>`,
  );
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join("\n")}\n</urlset>\n`;
}

export function buildRobots(siteUrl) {
  const base = siteUrl.replace(/\/+$/, "");
  return `User-agent: *\nDisallow: /admin\n\nSitemap: ${base}/sitemap.xml\n`;
}

/**
 * The site URL to write into the sitemap and robots.txt. A production deploy
 * must have one configured: the vercel.app default would put the wrong host
 * in every canonical link and in the sitemap, and search engines would index
 * it. Other builds (local, preview, CI) may use the default.
 */
export function siteUrlForBuild({ configured, vercelEnv }) {
  const hasConfigured = typeof configured === "string" && configured.trim();
  if (vercelEnv === "production" && !hasConfigured) {
    throw new Error(
      "VITE_SITE_URL is not set. A production build needs the public site URL (for example https://www.example.com): set VITE_SITE_URL in the Vercel project's environment variables and build again.",
    );
  }
  return resolveSiteUrl(configured);
}

function main() {
  const buildDir = process.argv[2] ?? "build/client";
  const env = loadEnv("production", process.cwd(), "VITE_");
  let siteUrl;
  try {
    siteUrl = siteUrlForBuild({
      configured: process.argv[3] ?? env.VITE_SITE_URL,
      vercelEnv: process.env.VERCEL_ENV,
    });
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
  const lastmod = new Date().toISOString().slice(0, 10);

  const paths = sitemapPaths(buildDir);
  writeFileSync(
    join(buildDir, "sitemap.xml"),
    buildSitemap(paths, siteUrl, lastmod),
  );
  writeFileSync(join(buildDir, "robots.txt"), buildRobots(siteUrl));
  console.log(`sitemap.xml: ${paths.length} pages, robots.txt: ${siteUrl}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
