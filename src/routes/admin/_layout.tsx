import {
  data,
  isRouteErrorResponse,
  redirect,
  useLocation,
  useRevalidator,
} from "react-router";

import { adminContext } from "~/admin/context";
import { AdminListSkeleton } from "~/admin/components/AdminListSkeleton";
import { AdminSpinner } from "~/admin/components/AdminSpinner";
import { isAdminListPath } from "~/admin/lib/listRoutes";
import { AdminErrorPage } from "~/admin/pages/AdminErrorPage";
import { AdminUnavailablePage } from "~/admin/pages/AdminUnavailablePage";
import { AdminLayout } from "~/admin/layouts/AdminLayout";
import { getAdminStatus, getSessionEmail, signOut } from "~/services/auth";
import type { Route } from "./+types/_layout";

export function meta() {
  return [
    { title: "Admin | Mondelos Nature Park" },
    { name: "robots", content: "noindex" },
  ];
}

/**
 * The guard. Route middleware runs before every loader below this layout, so a
 * child `clientLoader` never starts for someone who is not an admin (loaders of
 * parent and child otherwise run at the same time). It is a convenience gate:
 * row level security in the database is what actually protects the data.
 *
 * - not signed in: redirect to login, remembering the path
 * - signed in but `is_admin` says no: sign out, redirect with a reason
 * - the check could not be completed (offline, server error): throw a 503 that
 *   the layout's ErrorBoundary shows as a retry screen. No admin content, and
 *   no sign-out, because the session may be fine.
 */
const adminGuard: Route.ClientMiddlewareFunction = async (
  { request, context },
  next,
) => {
  const status = await getAdminStatus();

  if (status === "unavailable") {
    throw data(null, { status: 503 });
  }

  if (status === "not-admin") {
    await signOut();
    throw redirect("/admin/login?reason=not-admin");
  }

  const email = status === "admin" ? await getSessionEmail() : null;
  if (status === "anonymous" || email === null) {
    // Path only: the query string is untrusted and never carried forward.
    const { pathname } = new URL(request.url);
    throw redirect(`/admin/login?next=${encodeURIComponent(pathname)}`);
  }

  context.set(adminContext, { email });
  await next();
};

export const clientMiddleware: Route.ClientMiddlewareFunction[] = [adminGuard];

// Client-only: no `loader`, so nothing here is prerendered. This loader exists
// to hand the guard's result to the layout (and so that errors thrown by the
// guard are caught by this route's ErrorBoundary).
export function clientLoader({ context }: Route.ClientLoaderArgs) {
  const session = context.get(adminContext);
  if (!session) throw redirect("/admin/login");
  return { email: session.email };
}

// Shown on a hard load or refresh until the guard and the page's data are
// ready. A list page gets the list skeleton, with no shell: the sidebar needs
// the signed-in email, which must not show before the guard has passed.
// Everything else (dashboard, forms) keeps the spinner.
export function HydrateFallback() {
  const { pathname } = useLocation();
  if (!isAdminListPath(pathname)) return <AdminSpinner />;
  return (
    <div className="min-h-screen bg-ivory-50 px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
      <AdminListSkeleton />
    </div>
  );
}

export default function Admin({ loaderData }: Route.ComponentProps) {
  return <AdminLayout email={loaderData.email} />;
}

/** Admin-styled: no public header or footer, links stay inside the admin. */
export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const revalidator = useRevalidator();
  if (isRouteErrorResponse(error) && error.status === 503) {
    return (
      <AdminUnavailablePage
        retrying={revalidator.state === "loading"}
        onRetry={() => void revalidator.revalidate()}
      />
    );
  }
  return <AdminErrorPage />;
}
