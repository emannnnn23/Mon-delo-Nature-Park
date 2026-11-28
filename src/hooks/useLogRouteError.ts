import { useEffect } from "react";
import { isRouteErrorResponse } from "react-router";

/** Only the kind, message and status: never form data or personal data. */
function describe(error: unknown): string {
  if (isRouteErrorResponse(error)) {
    return `route error ${error.status} ${error.statusText}`.trim();
  }
  if (error instanceof Error) return `${error.name}: ${error.message}`;
  return "unknown error";
}

/**
 * Writes a route error to the console once, so a failed page leaves a trace
 * for whoever opens the browser's console or a support report. A 404 is not
 * an error worth logging. Keyed on the error, so a re-render does not log
 * it again.
 */
export function useLogRouteError(error: unknown) {
  useEffect(() => {
    if (isRouteErrorResponse(error) && error.status === 404) return;
    console.error(`Route error boundary: ${describe(error)}`);
  }, [error]);
}
