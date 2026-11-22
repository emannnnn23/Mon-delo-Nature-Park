import { data, isRouteErrorResponse, useRouteError } from "react-router";

import { PAGE_TITLES, isPageKey } from "~/admin/lib/sectionLabels";
import { AdminNotFoundPage } from "~/admin/pages/AdminNotFoundPage";
import { PageSectionsPage } from "~/admin/pages/PageSectionsPage";
import { listRows } from "~/services/admin/crud";
import { toFriendlyError } from "~/services/admin/errors";
import { listMedia } from "~/services/media";
import type { Route } from "./+types/pages.$page";

export function meta({ params }: Route.MetaArgs) {
  const title = isPageKey(params.page) ? PAGE_TITLES[params.page] : "Not found";
  return [{ title: `${title} | Mondelos admin` }];
}

// Client-only: the admin has no `loader`. The guard is the layout's
// clientMiddleware, which runs before this. Only home, about and visit have
// sections to edit; any other address is a 404.
export async function clientLoader({ params }: Route.ClientLoaderArgs) {
  const { page } = params;
  if (!isPageKey(page)) throw data(null, { status: 404 });
  const [rows, media] = await Promise.all([
    listRows("page_sections", { filter: { page } }),
    listMedia(),
  ]);
  return { page, rows, media };
}

export default function PageSections({ loaderData }: Route.ComponentProps) {
  // Keyed by page, so moving between pages starts every editor fresh.
  return (
    <PageSectionsPage
      key={loaderData.page}
      page={loaderData.page}
      rows={loaderData.rows}
      media={loaderData.media}
    />
  );
}

/** Shown inside the admin layout, so the menu stays available. */
export function ErrorBoundary() {
  const error = useRouteError();
  if (isRouteErrorResponse(error) && error.status === 404) {
    return <AdminNotFoundPage />;
  }
  const { friendly } = toFriendlyError(error, { entity: "section" });
  return (
    <section aria-labelledby="page-sections-error-title">
      <h1
        id="page-sections-error-title"
        className="font-serif text-3xl font-bold text-forest-900"
      >
        Page sections
      </h1>
      <p role="alert" className="mt-3 max-w-xl font-semibold text-red-700">
        {friendly}
      </p>
    </section>
  );
}
