import type { MetaDescriptor } from "react-router";

import { resolveSiteUrl } from "../../scripts/site-url.mjs";

// The default lives in scripts/site-url.mjs, shared with the build script that
// writes robots.txt and sitemap.xml.
export const SITE_URL: string = resolveSiteUrl(import.meta.env.VITE_SITE_URL);

export const SITE_NAME = "Mondelos Nature Park";
const HOME_TITLE = "Mondelos Nature Park — Kawayan, Biliran";

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
  if (image) meta.push({ property: "og:image", content: image });
  return meta;
}
