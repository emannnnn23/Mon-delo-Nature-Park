// The one place the site's default public URL lives. Both the page meta
// (src/lib/meta.ts) and the build script that writes robots.txt and
// sitemap.xml read it, so they can never disagree.
export const DEFAULT_SITE_URL = "https://mondelos-nature-park.vercel.app";

/** The configured URL (VITE_SITE_URL) or the default, without trailing slashes. */
export function resolveSiteUrl(configured) {
  const value =
    typeof configured === "string" && configured.trim()
      ? configured.trim()
      : DEFAULT_SITE_URL;
  return value.replace(/\/+$/, "");
}
