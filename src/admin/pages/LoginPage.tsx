import { useEffect, useRef, useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router";

import { Button } from "~/components/common/Button";
import { Logo } from "~/components/common/Logo";
import { safeNext } from "~/admin/lib/safeNext";
import { signIn } from "~/services/auth";

const NOTICES: Record<string, string> = {
  // Supabase cannot say why a session ended (expired, revoked, or signed out
  // in another tab), so the copy does not claim a cause.
  expired: "You’ve been signed out. Please sign in again.",
  "not-admin":
    "This account doesn’t have access to the admin. Please sign in with an admin account.",
};

const FIELD =
  "mt-1.5 block min-h-11 w-full rounded-lg border border-earth-600/50 bg-white px-3.5 py-2 text-base text-ink-900 aria-[invalid=true]:border-red-700";

type LoginPageProps = {
  /** False when the site has no Supabase env, so signing in cannot work. */
  configured: boolean;
};

type LoginError = { message: string; invalidCredentials: boolean };

export function LoginPage({ configured }: LoginPageProps) {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<LoginError | null>(null);
  const [pending, setPending] = useState(false);
  const errorRef = useRef<HTMLDivElement>(null);

  const reason = params.get("reason");
  const notice =
    reason !== null && Object.hasOwn(NOTICES, reason) ? NOTICES[reason] : null;

  // A new error object on every failure, so focus moves even when the message
  // is the same as last time.
  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = event.currentTarget;
    const values = new FormData(form);
    setPending(true);
    setError(null);
    const result = await signIn(
      String(values.get("email") ?? ""),
      String(values.get("password") ?? ""),
    );
    if (!result.ok) {
      setError({
        message: result.message,
        invalidCredentials: result.invalidCredentials === true,
      });
      setPending(false);
      return;
    }
    try {
      await navigate(safeNext(params.get("next")), { replace: true });
    } finally {
      // The guard can send a signed-in non-admin straight back to this same
      // route (no remount), so the form must be usable again.
      const password = form.elements.namedItem("password");
      if (password instanceof HTMLInputElement) password.value = "";
      setPending(false);
    }
  }

  return (
    <main
      id="main"
      className="flex min-h-screen items-center justify-center bg-ivory-50 px-5 py-12"
    >
      <div className="w-full max-w-md rounded-2xl border border-cream-100 bg-white p-7 shadow-sm sm:p-9">
        <Logo />
        <h1 className="mt-8 font-serif text-3xl font-bold text-forest-900">
          Sign in
        </h1>
        <p className="mt-2 text-ink-600">
          Manage the Mondelos Nature Park website.
        </p>

        {/* Live regions stay mounted and are filled on change, so screen
            readers announce the text; one that appears with its content is
            often missed. */}
        <div role="status" className="mt-6 empty:hidden">
          {notice ? (
            <p className="rounded-lg bg-cream-100 px-4 py-3 text-sm text-ink-900">
              {notice}
            </p>
          ) : null}
        </div>

        {configured ? (
          <form onSubmit={onSubmit} className="mt-6">
            <div>
              <label
                htmlFor="login-email"
                className="text-sm font-semibold text-ink-900"
              >
                Email
              </label>
              <input
                id="login-email"
                name="email"
                type="email"
                autoComplete="username"
                required
                aria-invalid={error?.invalidCredentials ? true : undefined}
                aria-describedby={error ? "login-error" : undefined}
                className={FIELD}
              />
            </div>
            <div className="mt-5">
              <label
                htmlFor="login-password"
                className="text-sm font-semibold text-ink-900"
              >
                Password
              </label>
              <input
                id="login-password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                aria-invalid={error?.invalidCredentials ? true : undefined}
                aria-describedby={error ? "login-error" : undefined}
                className={FIELD}
              />
            </div>
            <div
              id="login-error"
              ref={errorRef}
              role="alert"
              tabIndex={-1}
              className="mt-4 rounded-sm text-sm font-semibold text-red-700 empty:hidden"
            >
              {error?.message}
            </div>
            <Button type="submit" disabled={pending} className="mt-7 w-full">
              {pending ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        ) : (
          <p className="mt-6 rounded-lg bg-cream-100 px-4 py-3 text-ink-900">
            The admin isn&apos;t configured on this site yet.
          </p>
        )}
      </div>
    </main>
  );
}
