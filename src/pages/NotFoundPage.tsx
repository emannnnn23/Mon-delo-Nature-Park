import { ArrowRight } from "lucide-react";
import { Button } from "../components/common/Button";
import { StatusScreen } from "./StatusScreen";

/** Body of the "page not found" screen, shared by the 404 route and error boundaries. */
export function NotFoundContent({
  focusTitle = false,
}: {
  /** Focus the heading on mount; set by error boundaries. */
  focusTitle?: boolean;
}) {
  return (
    <>
      {/* React hoists this into <head>. It lives here, not in a route's
          meta(), so the not-found screens an error boundary shows (an unknown
          attraction) stay out of search results too. */}
      <meta name="robots" content="noindex" />
      <StatusScreen
        eyebrow="Error 404"
        title="Page not found"
        focusTitle={focusTitle}
        actions={
          <>
            <Button to="/" variant="outline-dark">
              Home
            </Button>
            <Button to="/visit" variant="gold" icon={ArrowRight}>
              Visit Us
            </Button>
          </>
        }
      >
        This path doesn&rsquo;t lead anywhere. The page may have moved, or the
        link may be mistyped.
      </StatusScreen>
    </>
  );
}
