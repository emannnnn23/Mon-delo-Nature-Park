import { useRouteError } from "react-router";

import { GalleryPage } from "~/admin/pages/GalleryPage";
import { listRows } from "~/services/admin/crud";
import { toFriendlyError } from "~/services/admin/errors";
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
  const error = useRouteError();
  const { friendly } = toFriendlyError(error, { entity: "photo" });
  return (
    <section aria-labelledby="gallery-error-title">
      <h1
        id="gallery-error-title"
        className="font-serif text-3xl font-bold text-forest-900"
      >
        Gallery
      </h1>
      <p role="alert" className="mt-3 max-w-xl font-semibold text-red-700">
        {friendly}
      </p>
    </section>
  );
}
