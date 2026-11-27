import { AdminRouteError } from "~/admin/components/AdminRouteError";
import { DashboardPage } from "~/admin/pages/DashboardPage";
import { getDashboard } from "~/services/admin/dashboard";
import type { Route } from "./+types/dashboard";

export function meta() {
  return [{ title: "Dashboard | Mondelos admin" }];
}

// Client-only: the admin has no `loader`. The guard is the layout's
// clientMiddleware, which runs before this.
export async function clientLoader() {
  return { dashboard: await getDashboard() };
}

export default function Dashboard({ loaderData }: Route.ComponentProps) {
  return <DashboardPage data={loaderData.dashboard} />;
}

/** Shown inside the admin layout, so the menu stays available. */
export function ErrorBoundary() {
  return <AdminRouteError title="Dashboard" entity="item" />;
}
