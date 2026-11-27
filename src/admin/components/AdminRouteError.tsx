import { useId } from "react";
import { useLocation, useRevalidator, useRouteError } from "react-router";

import { Button } from "~/components/common/Button";
import { toFriendlyError } from "~/services/admin/errors";

import { isAdminListPath } from "../lib/listRoutes";
import { AdminListSkeleton } from "./AdminListSkeleton";

type AdminRouteErrorProps = {
  /** The page's heading, kept so the owner knows where they are. */
  title: string;
  /** What the page lists, for the friendly message ("photo", "question"). */
  entity: string;
};

/**
 * Error panel for an admin page that could not load, shown inside the admin
 * layout so the menu stays available. Only friendly text is shown, never the
 * raw error. Retry re-runs the route's loaders.
 */
export function AdminRouteError({ title, entity }: AdminRouteErrorProps) {
  const error = useRouteError();
  const revalidator = useRevalidator();
  const { pathname } = useLocation();
  const titleId = useId();
  const { friendly } = toFriendlyError(error, { entity });
  // A list page being retried shows the loading skeleton; the panel returns
  // if it fails again. Forms keep the panel, with Retry disabled.
  if (revalidator.state === "loading" && isAdminListPath(pathname)) {
    return <AdminListSkeleton />;
  }
  return (
    <section aria-labelledby={titleId}>
      <h1
        id={titleId}
        className="font-serif text-3xl font-bold text-forest-900"
      >
        {title}
      </h1>
      <p role="alert" className="mt-3 max-w-xl font-semibold text-red-700">
        {friendly}
      </p>
      <Button
        onClick={() => void revalidator.revalidate()}
        disabled={revalidator.state === "loading"}
        variant="outline-dark"
        className="mt-5"
      >
        Retry
      </Button>
    </section>
  );
}
