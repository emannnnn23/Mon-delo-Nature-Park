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
  // Admin: client-only (clientLoader, never loader), outside the public layout
  // and not in the prerender list. The login page sits outside the guarded
  // layout. Later tasks add the section routes inside it.
  route("admin/login", "routes/admin/login.tsx"),
  layout("routes/admin/_layout.tsx", [
    route("admin", "routes/admin/dashboard.tsx"),
    route("admin/pages/:page", "routes/admin/pages.$page.tsx"),
    route("admin/attractions", "routes/admin/attractions.tsx"),
    route("admin/attractions/:id", "routes/admin/attractions.$id.tsx"),
    route("admin/gallery", "routes/admin/gallery.tsx"),
    route("admin/media", "routes/admin/media.tsx"),
    route("admin/*", "routes/admin/not-found.tsx"),
  ]),
] satisfies RouteConfig;
