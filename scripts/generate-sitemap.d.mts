export function sitemapPaths(buildDir: string): string[];
export function buildSitemap(
  paths: string[],
  siteUrl: string,
  lastmod: string,
): string;
export function buildRobots(siteUrl: string): string;
export function siteUrlForBuild(options: {
  configured: string | undefined;
  vercelEnv: string | undefined;
}): string;
