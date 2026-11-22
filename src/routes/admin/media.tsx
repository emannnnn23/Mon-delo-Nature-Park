import { useRouteError } from "react-router";

import { MediaLibraryPage } from "~/admin/pages/MediaLibraryPage";
import { toFriendlyError } from "~/services/admin/errors";
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
  const error = useRouteError();
  const { friendly } = toFriendlyError(error, { entity: "photo" });
  return (
    <section aria-labelledby="media-error-title">
      <h1
        id="media-error-title"
        className="font-serif text-3xl font-bold text-forest-900"
      >
        Media library
      </h1>
      <p role="alert" className="mt-3 max-w-xl font-semibold text-red-700">
        {friendly}
      </p>
    </section>
  );
}
