import { Button } from "~/components/common/Button";

/** Shown inside the admin layout for an admin path that has no page. */
export function AdminNotFoundPage() {
  return (
    <section aria-labelledby="admin-not-found-title">
      <h1
        id="admin-not-found-title"
        className="font-serif text-3xl font-bold text-forest-900"
      >
        Not found
      </h1>
      <p className="mt-3 max-w-xl text-ink-600">
        There is no admin page at this address.
      </p>
      <Button to="/admin" variant="outline-dark" className="mt-6">
        Back to the dashboard
      </Button>
    </section>
  );
}
