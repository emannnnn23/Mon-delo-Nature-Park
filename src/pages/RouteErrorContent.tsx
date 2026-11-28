import { isRouteErrorResponse } from "react-router";
import { useLogRouteError } from "~/hooks/useLogRouteError";
import { RetryableErrorContent } from "./ErrorPage";
import { NotFoundContent } from "./NotFoundPage";

/**
 * Body of a route error boundary: the not-found screen for a 404, otherwise
 * the "couldn't load this page" screen with Try again. Renders a section, so
 * the caller provides the main landmark.
 */
export function RouteErrorContent({ error }: { error: unknown }) {
  useLogRouteError(error);
  if (isRouteErrorResponse(error) && error.status === 404) {
    return <NotFoundContent focusTitle />;
  }
  return <RetryableErrorContent />;
}
