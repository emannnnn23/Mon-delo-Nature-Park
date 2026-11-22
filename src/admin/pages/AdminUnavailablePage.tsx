import { Button } from "~/components/common/Button";
import { Logo } from "~/components/common/Logo";

type AdminUnavailablePageProps = {
  onRetry: () => void;
  retrying: boolean;
};

/**
 * Shown instead of the admin when the access check could not be completed.
 * Shows no admin content and does not touch the session.
 */
export function AdminUnavailablePage({
  onRetry,
  retrying,
}: AdminUnavailablePageProps) {
  return (
    <main
      id="main"
      className="flex min-h-screen items-center justify-center bg-ivory-50 px-5 py-12"
    >
      <section
        aria-labelledby="admin-unavailable-title"
        className="w-full max-w-md rounded-2xl border border-cream-100 bg-white p-7 shadow-sm sm:p-9"
      >
        <Logo />
        <h1
          id="admin-unavailable-title"
          className="mt-8 font-serif text-3xl font-bold text-forest-900"
        >
          Can&rsquo;t reach the server
        </h1>
        <p className="mt-3 text-ink-600">
          Can&rsquo;t reach the server. Check your connection and try again.
        </p>
        <Button
          onClick={onRetry}
          disabled={retrying}
          variant="gold"
          className="mt-7 w-full"
        >
          Retry
        </Button>
      </section>
    </main>
  );
}
