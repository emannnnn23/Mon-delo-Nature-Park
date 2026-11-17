import { Button } from "../components/common/Button";

/** Generic "something went wrong" screen for route error boundaries. */
export function ErrorContent() {
  return (
    <section
      aria-labelledby="route-error-title"
      className="bg-ivory-50 px-5 py-20 sm:px-8 md:py-28"
    >
      <div className="mx-auto max-w-2xl">
        <h1
          id="route-error-title"
          className="font-serif text-4xl leading-tight font-bold text-balance text-forest-900 md:text-5xl"
        >
          Something went wrong
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-ink-600">
          This page could not be shown. Try again, or go back to the homepage.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button to="/" variant="outline-dark">
            Back to home
          </Button>
        </div>
      </div>
    </section>
  );
}
