import { AdminRouteError } from "~/admin/components/AdminRouteError";
import { SettingsPage } from "~/admin/pages/SettingsPage";
import { getSettings } from "~/services/admin/settings";
import { listMedia } from "~/services/media";
import type { Route } from "./+types/settings";

export function meta() {
  return [{ title: "Contact & settings | Mondelos admin" }];
}

// Client-only: the admin has no `loader`. The guard is the layout's
// clientMiddleware, which runs before this.
export async function clientLoader() {
  const [settings, media] = await Promise.all([getSettings(), listMedia()]);
  return { settings, media };
}

export default function Settings({ loaderData }: Route.ComponentProps) {
  return (
    <SettingsPage settings={loaderData.settings} media={loaderData.media} />
  );
}

/** Shown inside the admin layout, so the menu stays available. */
export function ErrorBoundary() {
  return <AdminRouteError title="Contact & settings" entity="setting" />;
}
