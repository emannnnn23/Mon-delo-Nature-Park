import type { MetaDescriptor } from "react-router";

import { resolveSiteUrl } from "../../scripts/site-url.mjs";
import type { MediaAsset, SiteSettings } from "~/types/content";
import { pickFallbackSrc } from "~/utils/imageVariants";
import { mediaVariantUrl } from "./media";

// The default lives in scripts/site-url.mjs, shared with the build script that
// writes robots.txt and sitemap.xml.
export const SITE_URL: string = resolveSiteUrl(import.meta.env.VITE_SITE_URL);

export const SITE_NAME = "Mondelos Nature Park";
const HOME_TITLE = "Mondelos Nature Park — Kawayan, Biliran";

/** Share image (variant 1600) for a media asset, or null without one. */
export function shareImageUrl(asset: MediaAsset | null | undefined) {
  if (!asset) return null;
  const path = pickFallbackSrc(asset.variants, 1600);
  return path ? mediaVariantUrl(path) : null;
}

type MetaMatches = readonly ({ id: string; data?: unknown } | undefined)[];

/**
 * The park-wide default share image from the public layout's settings, for
 * pages with no image of their own. Null when the layout has no data or the
 * owner has not set one.
 */
export function defaultShareImage(matches: MetaMatches | undefined) {
  const layout = matches?.find((m) => m?.id === "routes/_public")?.data as
    { settings?: Pick<SiteSettings, "defaultOgImage"> } | undefined;
  return shareImageUrl(layout?.settings?.defaultOgImage);
}

export type BuildMetaInput = {
  title?: string;
  description: string;
  path: string;
  image?: string | null;
  siteUrl: string;
};

export function buildMeta({
  title,
  description,
  path,
  image,
  siteUrl,
}: BuildMetaInput): MetaDescriptor[] {
  const fullTitle = title ? `${title} · ${SITE_NAME}` : HOME_TITLE;
  const url = `${siteUrl.replace(/\/+$/, "")}${path}`;
  const meta: MetaDescriptor[] = [
    { title: fullTitle },
    { name: "description", content: description },
    { tagName: "link", rel: "canonical", href: url },
    { property: "og:title", content: fullTitle },
    { property: "og:description", content: description },
    { property: "og:url", content: url },
    { property: "og:type", content: "website" },
    { property: "og:locale", content: "en_PH" },
    { name: "twitter:card", content: "summary_large_image" },
  ];
  if (image) {
    // Crawlers need an absolute URL, so a site path such as `/images/x.jpg`
    // is resolved against the site here, for every caller.
    const absolute = image.startsWith("/")
      ? `${siteUrl.replace(/\/+$/, "")}${image}`
      : image;
    meta.push({ property: "og:image", content: absolute });
  }
  return meta;
}
