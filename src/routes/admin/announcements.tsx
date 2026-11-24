import { useRouteError } from "react-router";

import { AnnouncementsPage } from "~/admin/pages/AnnouncementsPage";
import { listRows } from "~/services/admin/crud";
import { toFriendlyError } from "~/services/admin/errors";
import type { Route } from "./+types/announcements";

export function meta() {
  return [{ title: "Announcements | Mondelos admin" }];
}

// Client-only: the admin has no `loader`. The guard is the layout's
// clientMiddleware, which runs before this.
export async function clientLoader() {
  return { announcements: await listRows("announcements") };
}

export default function Announcements({ loaderData }: Route.ComponentProps) {
  return <AnnouncementsPage announcements={loaderData.announcements} />;
}

/** Shown inside the admin layout, so the menu stays available. */
export function ErrorBoundary() {
  const error = useRouteError();
  const { friendly } = toFriendlyError(error, { entity: "announcement" });
  return (
    <section aria-labelledby="announcements-error-title">
      <h1
        id="announcements-error-title"
        className="font-serif text-3xl font-bold text-forest-900"
      >
        Announcements
      </h1>
      <p role="alert" className="mt-3 max-w-xl font-semibold text-red-700">
        {friendly}
      </p>
    </section>
  );
}
