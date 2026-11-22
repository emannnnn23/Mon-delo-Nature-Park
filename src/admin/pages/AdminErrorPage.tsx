import { Button } from "~/components/common/Button";
import { Logo } from "~/components/common/Logo";

/**
 * Last-resort screen for an unexpected error inside the admin. Self-contained
 * (the admin layout may be what failed) and keeps every link inside the admin,
 * never the public site.
 */
export function AdminErrorPage() {
  return (
    <main
      id="main"
      className="flex min-h-screen items-center justify-center bg-ivory-50 px-5 py-12"
    >
      <section
        aria-labelledby="admin-error-title"
        className="w-full max-w-md rounded-2xl border border-cream-100 bg-white p-7 shadow-sm sm:p-9"
      >
        <Logo />
        <h1
          id="admin-error-title"
          className="mt-8 font-serif text-3xl font-bold text-forest-900"
        >
          Something went wrong
        </h1>
        <p className="mt-3 text-ink-600">
          This page couldn&rsquo;t be shown. Go back to the dashboard, or sign
          in again.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Button to="/admin" variant="gold">
            Dashboard
          </Button>
          <Button to="/admin/login" variant="outline-dark">
            Sign in
          </Button>
        </div>
      </section>
    </main>
  );
}
