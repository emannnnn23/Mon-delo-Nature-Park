import { buildMeta, SITE_URL } from "~/lib/meta";
import { NotFoundContent } from "~/pages/NotFoundPage";

export function meta() {
  return [
    ...buildMeta({
      title: "Page not found",
      description: "This page could not be found at Mondelos Nature Park.",
      path: "/404",
      siteUrl: SITE_URL,
    }),
    { name: "robots", content: "noindex" },
  ];
}

// No loader: this module backs both `/404` (pre-rendered) and the catch-all
// route, which no pre-render path matches. React Router rejects a `loader` on
// a route that is never pre-rendered when `ssr: false`.
export default function NotFound() {
  return <NotFoundContent />;
}
