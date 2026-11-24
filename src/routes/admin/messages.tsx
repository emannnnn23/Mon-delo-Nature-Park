import { useRouteError } from "react-router";

import { MessagesPage, parseStatusFilter } from "~/admin/pages/MessagesPage";
import { toFriendlyError } from "~/services/admin/errors";
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
  const error = useRouteError();
  const { friendly } = toFriendlyError(error, { entity: "message" });
  return (
    <section aria-labelledby="messages-error-title">
      <h1
        id="messages-error-title"
        className="font-serif text-3xl font-bold text-forest-900"
      >
        Messages
      </h1>
      <p role="alert" className="mt-3 max-w-xl font-semibold text-red-700">
        {friendly}
      </p>
    </section>
  );
}
