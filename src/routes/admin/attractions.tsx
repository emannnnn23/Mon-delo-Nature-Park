import { useRouteError } from "react-router";

import { AttractionsListPage } from "~/admin/pages/AttractionsListPage";
import { listRows } from "~/services/admin/crud";
import { toFriendlyError } from "~/services/admin/errors";
import type { Route } from "./+types/attractions";

export function meta() {
  return [{ title: "Attractions | Mondelos admin" }];
}

// Client-only: the admin has no `loader`. The guard is the layout's
// clientMiddleware, which runs before this. Both kinds are loaded; the page
// shows one tab at a time.
export async function clientLoader() {
  return { rows: await listRows("attractions") };
}

export default function Attractions({ loaderData }: Route.ComponentProps) {
  return <AttractionsListPage rows={loaderData.rows} />;
}

/** Shown inside the admin layout, so the menu stays available. */
export function ErrorBoundary() {
  const error = useRouteError();
  const { friendly } = toFriendlyError(error, { entity: "attraction" });
  return (
    <section aria-labelledby="attractions-error-title">
      <h1
        id="attractions-error-title"
        className="font-serif text-3xl font-bold text-forest-900"
      >
        Attractions
      </h1>
      <p role="alert" className="mt-3 max-w-xl font-semibold text-red-700">
        {friendly}
      </p>
    </section>
  );
}
