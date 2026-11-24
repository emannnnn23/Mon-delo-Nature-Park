import { useRouteError } from "react-router";

import { DashboardPage } from "~/admin/pages/DashboardPage";
import { getDashboard } from "~/services/admin/dashboard";
import { toFriendlyError } from "~/services/admin/errors";
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
  const error = useRouteError();
  const { friendly } = toFriendlyError(error, { entity: "item" });
  return (
    <section aria-labelledby="dashboard-error-title">
      <h1
        id="dashboard-error-title"
        className="font-serif text-3xl font-bold text-forest-900"
      >
        Dashboard
      </h1>
      <p role="alert" className="mt-3 max-w-xl font-semibold text-red-700">
        {friendly}
      </p>
    </section>
  );
}
