import { AdminRouteError } from "~/admin/components/AdminRouteError";
import { AttractionsListPage } from "~/admin/pages/AttractionsListPage";
import { skipSearchOnlyRevalidation } from "~/admin/lib/revalidate";
import { listRows } from "~/services/admin/crud";
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

// Tabs and filters live in the query string; the page keeps what it loaded, so
// a search-only change must not re-run the loader (and risk blanking the page
// on a transient failure).
export const shouldRevalidate = skipSearchOnlyRevalidation;

export default function Attractions({ loaderData }: Route.ComponentProps) {
  return <AttractionsListPage rows={loaderData.rows} />;
}

/** Shown inside the admin layout, so the menu stays available. */
export function ErrorBoundary() {
  return <AdminRouteError title="Attractions" entity="attraction" />;
}
