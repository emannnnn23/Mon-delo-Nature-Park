import { AdminRouteError } from "~/admin/components/AdminRouteError";
import { MessagesPage, parseStatusFilter } from "~/admin/pages/MessagesPage";
import { listMessages } from "~/services/admin/messages";
import type { Route } from "./+types/messages";

export function meta() {
  return [{ title: "Messages | Mondelos admin" }];
}

// Client-only: the admin has no `loader`. The guard is the layout's
// clientMiddleware, which runs before this. `?status=` picks the filter.
export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  const status = parseStatusFilter(
    new URL(request.url).searchParams.get("status"),
  );
  return { status, messages: await listMessages(status ?? undefined) };
}

export default function Messages({ loaderData }: Route.ComponentProps) {
  // Keyed by filter, so changing it starts the list fresh.
  return (
    <MessagesPage
      key={loaderData.status ?? "all"}
      messages={loaderData.messages}
    />
  );
}

/** Shown inside the admin layout, so the menu stays available. */
export function ErrorBoundary() {
  return <AdminRouteError title="Messages" entity="message" />;
}
