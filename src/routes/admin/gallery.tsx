import { AdminRouteError } from "~/admin/components/AdminRouteError";
import { GalleryPage } from "~/admin/pages/GalleryPage";
import { skipSearchOnlyRevalidation } from "~/admin/lib/revalidate";
import { listRows } from "~/services/admin/crud";
import { listMedia } from "~/services/media";
import type { Route } from "./+types/gallery";

export function meta() {
  return [{ title: "Gallery | Mondelos admin" }];
}

// Client-only: the admin has no `loader`. The guard is the layout's
// clientMiddleware, which runs before this.
export async function clientLoader() {
  const [categories, images, media] = await Promise.all([
    listRows("gallery_categories"),
    listRows("gallery_images"),
    listMedia(),
  ]);
  return { categories, images, media };
}

// Tabs and filters live in the query string; the page keeps what it loaded, so
// a search-only change must not re-run the loader (and risk blanking the page
// on a transient failure).
export const shouldRevalidate = skipSearchOnlyRevalidation;

export default function Gallery({ loaderData }: Route.ComponentProps) {
  return (
    <GalleryPage
      categories={loaderData.categories}
      images={loaderData.images}
      media={loaderData.media}
    />
  );
}

/** Shown inside the admin layout, so the menu stays available. */
export function ErrorBoundary() {
  return <AdminRouteError title="Gallery" entity="photo" />;
}
