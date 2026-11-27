import { Outlet, useLocation } from "react-router";
import { PublicLayout } from "~/components/layout/PublicLayout";
import { placeholders } from "~/content/placeholders";
import { loadForBuild, loadForClient } from "~/lib/routeData";
import type { Route } from "./+types/_public";

// Read once per build for the prerendered pages; the hydration pass reads it
// again, so the two agree unless a visit straddles New Year.
const currentYear = () => new Date().getFullYear();

// Shared by both loaders. `clientLoader` must not call `loader` directly: the
// build strips `loader` from the client bundle, which would throw on
// hydration. `import()` keeps supabase-js out of the initial page chunks.
async function liveChrome() {
  const { getSiteChrome } = await import("~/services/content");
  return { ...(await getSiteChrome()), year: currentYear() };
}

// Build-time loader: the layout route matches every prerendered path, so the
// chrome data is baked into each page.
export function loader() {
  return loadForBuild(liveChrome, {
    settings: placeholders.settings,
    announcement: placeholders.announcement,
    year: currentYear(),
  });
}

// The build rejects a parent `loader` without a `clientLoader` when any child
// is not prerendered (here the catch-all route). On those paths the SPA
// fallback carries no chrome data, so the chrome comes only from the live
// fetch: offline, `serverLoader()` has no snapshot to return and the root
// error page shows until Task 4 adds the in-layout error view.
export function clientLoader({ serverLoader }: Route.ClientLoaderArgs) {
  return loadForClient(liveChrome, () => serverLoader());
}
clientLoader.hydrate = true as const;

export default function Public({ loaderData }: Route.ComponentProps) {
  const { pathname } = useLocation();
  return (
    <PublicLayout
      settings={loaderData.settings}
      announcement={loaderData.announcement}
      overHero={pathname === "/"}
      year={loaderData.year}
    >
      <Outlet />
    </PublicLayout>
  );
}
