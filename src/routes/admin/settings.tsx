import { useRouteError } from "react-router";

import { SettingsPage } from "~/admin/pages/SettingsPage";
import { toFriendlyError } from "~/services/admin/errors";
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
  const error = useRouteError();
  const { friendly } = toFriendlyError(error, { entity: "setting" });
  return (
    <section aria-labelledby="settings-error-title">
      <h1
        id="settings-error-title"
        className="font-serif text-3xl font-bold text-forest-900"
      >
        Contact &amp; settings
      </h1>
      <p role="alert" className="mt-3 max-w-xl font-semibold text-red-700">
        {friendly}
      </p>
    </section>
  );
}
