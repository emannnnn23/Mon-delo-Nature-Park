import { getSupabase } from "~/lib/supabase";

export type SignInResult =
  | { ok: true }
  | {
      ok: false;
      message: string;
      /** True when the email or password was wrong (not a network or rate-limit problem). */
      invalidCredentials?: true;
    };
export type AdminStatus = "anonymous" | "not-admin" | "admin" | "unavailable";

const NOT_CONFIGURED = "The admin isn't configured on this site yet.";

/** True when the public Supabase env is present, so signing in can work. */
export function isAuthConfigured(): boolean {
  return getSupabase() !== null;
}

function signInMessage(code: string | undefined): string {
  switch (code) {
    case "invalid_credentials":
      return "Incorrect email or password.";
    case "over_request_rate_limit":
    case "over_email_send_rate_limit":
      return "Too many attempts. Please wait a minute and try again.";
    default:
      return "We couldn't sign you in. Please try again.";
  }
}

/** Never returns a raw Supabase message: those can leak internals. */
export async function signIn(
  email: string,
  password: string,
): Promise<SignInResult> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, message: NOT_CONFIGURED };
  try {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) {
      return {
        ok: false,
        message: signInMessage(error.code),
        ...(error.code === "invalid_credentials"
          ? { invalidCredentials: true as const }
          : {}),
      };
    }
    return { ok: true };
  } catch {
    return {
      ok: false,
      message:
        "We couldn't reach the server. Check your connection and try again.",
    };
  }
}

// While our own signOut() runs the client emits SIGNED_OUT too; listeners for
// "the session ended on its own" must not react to that.
let signingOut = 0;

/**
 * Ends the session on this device only (`local`), which works offline too.
 * Never throws: the caller is leaving the admin either way.
 */
export async function signOut(): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  signingOut += 1;
  try {
    await supabase.auth.signOut({ scope: "local" });
  } catch {
    // The local session is cleared before any network call; nothing to add.
  } finally {
    signingOut -= 1;
  }
}

/**
 * Calls `onSignedOut` when the session ends without `signOut()` having been
 * called here (token expired, revoked, or signed out in another tab).
 * Returns an unsubscribe function.
 */
export function subscribeToSignOut(onSignedOut: () => void): () => void {
  const supabase = getSupabase();
  if (!supabase) return () => {};
  const { data } = supabase.auth.onAuthStateChange((event) => {
    if (event === "SIGNED_OUT" && signingOut === 0) onSignedOut();
  });
  return () => data.subscription.unsubscribe();
}

/** The signed-in user's email from the stored session, or null. */
export async function getSessionEmail(): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.user.email ?? null;
  } catch {
    return null;
  }
}

/**
 * Who is asking. `anonymous` means no session; `admin` only when the database
 * itself answers `true` from `is_admin()`, and `not-admin` only when it answers
 * `false`. If the check cannot be completed (network or server error, an odd
 * answer) the result is `unavailable`: never admin, but not a reason to sign
 * anyone out. This is a convenience gate for the UI: row level security is
 * what actually protects the data.
 */
export async function getAdminStatus(): Promise<AdminStatus> {
  const supabase = getSupabase();
  if (!supabase) return "anonymous";
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) return "unavailable";
    if (!data.session) return "anonymous";
    const result = await supabase.rpc("is_admin");
    if (result.error) return "unavailable";
    if (result.data === true) return "admin";
    if (result.data === false) return "not-admin";
    return "unavailable";
  } catch {
    return "unavailable";
  }
}
