import { AdminRouteError } from "~/admin/components/AdminRouteError";
import { MediaLibraryPage } from "~/admin/pages/MediaLibraryPage";
import { listMedia } from "~/services/media";
import type { Route } from "./+types/media";

export function meta() {
  return [{ title: "Media | Mondelos admin" }];
}

// Client-only: the admin has no `loader`. The guard is the layout's
// clientMiddleware, which runs before this.
export async function clientLoader() {
  return { media: await listMedia() };
}

export default function Media({ loaderData }: Route.ComponentProps) {
  return <MediaLibraryPage initialMedia={loaderData.media} />;
}

/** Shown inside the admin layout, so the menu stays available. */
export function ErrorBoundary() {
  return <AdminRouteError title="Media library" entity="photo" />;
}
