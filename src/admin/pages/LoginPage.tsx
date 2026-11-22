import { useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router";

import { Button } from "~/components/common/Button";
import { Logo } from "~/components/common/Logo";
import { safeNext } from "~/admin/lib/safeNext";
import { signIn } from "~/services/auth";

const NOTICES: Record<string, string> = {
  expired: "Your session has expired — please sign in again.",
  "not-admin":
    "This account doesn’t have access to the admin. Please sign in with an admin account.",
};

const FIELD =
  "mt-1.5 block min-h-11 w-full rounded-lg border border-earth-600/50 bg-white px-3.5 py-2 text-base text-ink-900 aria-[invalid=true]:border-red-700";

type LoginPageProps = {
  /** False when the site has no Supabase env, so signing in cannot work. */
  configured: boolean;
};

export function LoginPage({ configured }: LoginPageProps) {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const reason = params.get("reason");
  const notice =
    reason !== null && Object.hasOwn(NOTICES, reason) ? NOTICES[reason] : null;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    const result = await signIn(
      String(form.get("email") ?? ""),
      String(form.get("password") ?? ""),
    );
    if (result.ok) {
      await navigate(safeNext(params.get("next")), { replace: true });
      return;
    }
    setError(result.message);
    setPending(false);
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

        {notice ? (
          <p
            role="status"
            className="mt-6 rounded-lg bg-cream-100 px-4 py-3 text-sm text-ink-900"
          >
            {notice}
          </p>
        ) : null}

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
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? "login-error" : undefined}
                className={FIELD}
              />
            </div>
            {error ? (
              <p
                id="login-error"
                role="alert"
                className="mt-4 text-sm font-semibold text-red-700"
              >
                {error}
              </p>
            ) : null}
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
