import { Outlet, useLocation } from "react-router";
import { PublicLayout } from "~/components/layout/PublicLayout";
import { placeholders } from "~/content/placeholders";
import type { Route } from "./+types/_public";

// Shared by both loaders. `clientLoader` must not call `loader` directly: the
// build strips `loader` from the client bundle, which would throw on hydration.
function chromeData() {
  return {
    settings: placeholders.settings,
    announcement: placeholders.announcement,
    // Read once per build for the prerendered pages; the hydration pass reads
    // it again, so the two agree unless a visit straddles New Year.
    year: new Date().getFullYear(),
  };
}

// Build-time loader: the layout route matches every prerendered path, so the
// chrome data is baked into each page. Phase 4 swaps in getSiteChrome().
export function loader() {
  return chromeData();
}

// The build rejects a parent `loader` without a `clientLoader` when any child
// is not prerendered (here the catch-all route). Hydrating through it also
// gives those paths their chrome data, since the SPA fallback carries none.
export function clientLoader() {
  return chromeData();
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
