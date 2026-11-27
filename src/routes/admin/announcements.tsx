import { AdminRouteError } from "~/admin/components/AdminRouteError";
import { AnnouncementsPage } from "~/admin/pages/AnnouncementsPage";
import { listRows } from "~/services/admin/crud";
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
  return <AdminRouteError title="Announcements" entity="announcement" />;
}
