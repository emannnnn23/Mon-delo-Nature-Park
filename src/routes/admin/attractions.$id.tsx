import { data, isRouteErrorResponse, useRouteError } from "react-router";

import { AdminRouteError } from "~/admin/components/AdminRouteError";
import { AdminNotFoundPage } from "~/admin/pages/AdminNotFoundPage";
import { AttractionFormPage } from "~/admin/pages/AttractionFormPage";
import { getRow, listRows } from "~/services/admin/crud";
import { listMedia } from "~/services/media";
import type { AttractionKind } from "~/types/content";
import type { Route } from "./+types/attractions.$id";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function meta({ params }: Route.MetaArgs) {
  const action = params.id === "new" ? "Add" : "Edit";
  return [{ title: `${action} attraction | Mondelos admin` }];
}

// Client-only: the admin has no `loader`. The guard is the layout's
// clientMiddleware, which runs before this. `new` is a blank form
// (`?kind=experience` for an experience); any other id must be a saved row.
export async function clientLoader({
  params,
  request,
}: Route.ClientLoaderArgs) {
  const { id } = params;
  if (id === "new") {
    const kind: AttractionKind =
      new URL(request.url).searchParams.get("kind") === "experience"
        ? "experience"
        : "attraction";
    return { row: null, kind, media: await listMedia(), images: [] };
  }
  // Anything that is not an id cannot be a row: no need to ask the database.
  if (!UUID.test(id)) throw data(null, { status: 404 });
  const row = await getRow("attractions", id);
  if (!row) throw data(null, { status: 404 });
  const [media, images] = await Promise.all([
    listMedia(),
    row.kind === "attraction"
      ? listRows("attraction_images", { filter: { attraction_id: id } })
      : Promise.resolve([]),
  ]);
  return { row, kind: row.kind as AttractionKind, media, images };
}

export default function AttractionForm({ loaderData }: Route.ComponentProps) {
  // Keyed, so moving between records starts the form fresh.
  return (
    <AttractionFormPage
      key={loaderData.row?.id ?? `new-${loaderData.kind}`}
      row={loaderData.row}
      kind={loaderData.kind}
      media={loaderData.media}
      images={loaderData.images}
    />
  );
}

/** Shown inside the admin layout, so the menu stays available. */
export function ErrorBoundary() {
  const error = useRouteError();
  if (isRouteErrorResponse(error) && error.status === 404) {
    return <AdminNotFoundPage />;
  }
  return <AdminRouteError title="Attraction" entity="attraction" />;
}
