import { ArrowRight } from "lucide-react";
import { Button } from "../components/common/Button";

/** Body of the "page not found" screen, shared by the 404 route and error boundaries. */
export function NotFoundContent() {
  return (
    <main className="bg-ivory-50 px-5 py-20 sm:px-8 md:py-28">
      <div className="mx-auto max-w-2xl">
        <h1 className="font-serif text-4xl leading-tight font-bold text-balance text-forest-900 md:text-5xl">
          Page not found
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-ink-600">
          This page could not be found. It may have moved, or the link may be
          mistyped.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button to="/" variant="outline-dark">
            Back to home
          </Button>
          <Button to="/discover" variant="gold" icon={ArrowRight}>
            Discover the Park
          </Button>
        </div>
      </div>
    </main>
  );
}
