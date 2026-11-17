import {
  type RouteConfig,
  index,
  layout,
  route,
} from "@react-router/dev/routes";

export default [
  layout("routes/_public.tsx", [
    index("routes/home.tsx"),
    route("discover", "routes/discover.tsx"),
    route("discover/:slug", "routes/discover.$slug.tsx"),
    route("gallery", "routes/gallery.tsx"),
    route("about", "routes/about.tsx"),
    route("visit", "routes/visit.tsx"),
    route("404", "routes/not-found.tsx"),
    route("*", "routes/not-found.tsx", { id: "catch-all" }),
  ]),
] satisfies RouteConfig;
