import { Button } from "../components/common/Button";
import { StatusScreen } from "./StatusScreen";

/** Generic "something went wrong" screen for route error boundaries. */
export function ErrorContent() {
  return (
    <StatusScreen
      eyebrow="Error"
      title="Something went wrong"
      actions={
        <Button to="/" variant="outline-dark">
          Home
        </Button>
      }
    >
      This page could not be shown. Try again, or go back to the homepage.
    </StatusScreen>
  );
}
