import { useRevalidator } from "react-router";
import { Button } from "../components/common/Button";
import { StatusScreen } from "./StatusScreen";

type ErrorContentProps = {
  /** Shows a "Try again" button that calls this. */
  onRetry?: () => void;
  /** Disables "Try again" while a retry is running. */
  retrying?: boolean;
};

/** Generic "this page could not load" screen for route error boundaries. */
export function ErrorContent({ onRetry, retrying = false }: ErrorContentProps) {
  return (
    <StatusScreen
      eyebrow="Error"
      title="We couldn't load this page"
      focusTitle
      actions={
        <>
          {onRetry ? (
            <Button onClick={onRetry} disabled={retrying} variant="gold">
              Try again
            </Button>
          ) : null}
          <Button to="/" variant="outline-dark">
            Home
          </Button>
        </>
      }
    >
      Something went wrong on our side, or your connection dropped. Try again,
      or go back to the homepage.
    </StatusScreen>
  );
}

/** The error screen wired to the router: "Try again" re-runs the loaders. */
export function RetryableErrorContent() {
  const revalidator = useRevalidator();
  return (
    <ErrorContent
      onRetry={() => void revalidator.revalidate()}
      retrying={revalidator.state === "loading"}
    />
  );
}
