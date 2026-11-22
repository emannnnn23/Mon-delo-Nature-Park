import { getSupabase } from "~/lib/supabase";
import {
  getAdminStatus,
  getSessionEmail,
  isAuthConfigured,
  signIn,
  signOut,
  subscribeToSignOut,
} from "./auth";

vi.mock("~/lib/supabase", () => ({ getSupabase: vi.fn() }));

type AuthListener = (event: string, session: unknown) => void;

type FakeOptions = {
  signInResult?: { error: { code?: string; message?: string } | null };
  signInThrows?: boolean;
  session?: { user: { email?: string } } | null;
  sessionError?: unknown;
  isAdmin?: { data: unknown; error: unknown };
  rpcThrows?: boolean;
  signOutThrows?: boolean;
};

function fakeClient(options: FakeOptions = {}) {
  let listener: AuthListener | null = null;
  const unsubscribe = vi.fn();
  const client = {
    auth: {
      signInWithPassword: vi.fn(async () => {
        if (options.signInThrows) throw new TypeError("Failed to fetch");
        return options.signInResult ?? { error: null };
      }),
      signOut: vi.fn(async () => {
        // The real client emits SIGNED_OUT while signOut() is still running.
        listener?.("SIGNED_OUT", null);
        if (options.signOutThrows) throw new Error("offline");
        return { error: null };
      }),
      getSession: vi.fn(async () => ({
        data: { session: options.session ?? null },
        error: options.sessionError ?? null,
      })),
      onAuthStateChange: vi.fn((cb: AuthListener) => {
        listener = cb;
        return { data: { subscription: { unsubscribe } } };
      }),
    },
    rpc: vi.fn(async () => {
      if (options.rpcThrows) throw new Error("network");
      return options.isAdmin ?? { data: true, error: null };
    }),
  };
  vi.mocked(getSupabase).mockReturnValue(client as never);
  return {
    client,
    unsubscribe,
    emit: (event: string) => listener?.(event, null),
  };
}

afterEach(() => {
  vi.mocked(getSupabase).mockReset();
});

describe("signIn", () => {
  it("maps invalid_credentials to a plain message", async () => {
    fakeClient({
      signInResult: { error: { code: "invalid_credentials", message: "x" } },
    });
    expect(await signIn("a@b.co", "wrong")).toEqual({
      ok: false,
      message: "Incorrect email or password.",
    });
  });

  it("succeeds and trims the email", async () => {
    const { client } = fakeClient();
    expect(await signIn("  a@b.co ", "pw")).toEqual({ ok: true });
    expect(client.auth.signInWithPassword).toHaveBeenCalledWith({
      email: "a@b.co",
      password: "pw",
    });
  });

  it("never exposes a raw error message", async () => {
    fakeClient({
      signInResult: { error: { code: "weird", message: "db exploded: 42P01" } },
    });
    const result = await signIn("a@b.co", "pw");
    expect(result.ok).toBe(false);
    expect(JSON.stringify(result)).not.toContain("42P01");
  });

  it("explains rate limiting", async () => {
    fakeClient({
      signInResult: { error: { code: "over_request_rate_limit" } },
    });
    const result = await signIn("a@b.co", "pw");
    expect(result).toMatchObject({ ok: false });
    expect(result.ok === false && result.message).toMatch(/too many/i);
  });

  it("turns a network failure into a message", async () => {
    fakeClient({ signInThrows: true });
    const result = await signIn("a@b.co", "pw");
    expect(result.ok).toBe(false);
  });

  it("says the admin is not configured without a client", async () => {
    vi.mocked(getSupabase).mockReturnValue(null);
    expect(await signIn("a@b.co", "pw")).toEqual({
      ok: false,
      message: "The admin isn't configured on this site yet.",
    });
  });
});

describe("isAuthConfigured", () => {
  it("follows the client", () => {
    vi.mocked(getSupabase).mockReturnValue(null);
    expect(isAuthConfigured()).toBe(false);
    fakeClient();
    expect(isAuthConfigured()).toBe(true);
  });
});

describe("getAdminStatus", () => {
  it("is anonymous without a client", async () => {
    vi.mocked(getSupabase).mockReturnValue(null);
    expect(await getAdminStatus()).toBe("anonymous");
  });

  it("is anonymous with no session and does not call is_admin", async () => {
    const { client } = fakeClient({ session: null });
    expect(await getAdminStatus()).toBe("anonymous");
    expect(client.rpc).not.toHaveBeenCalled();
  });

  it("is unavailable when reading the session fails", async () => {
    const { client } = fakeClient({ sessionError: new Error("bad") });
    expect(await getAdminStatus()).toBe("unavailable");
    expect(client.rpc).not.toHaveBeenCalled();
  });

  it("is not-admin when is_admin is false", async () => {
    const { client } = fakeClient({
      session: { user: { email: "a@b.co" } },
      isAdmin: { data: false, error: null },
    });
    expect(await getAdminStatus()).toBe("not-admin");
    expect(client.rpc).toHaveBeenCalledWith("is_admin");
  });

  it("is admin when is_admin is true", async () => {
    fakeClient({ session: { user: { email: "a@b.co" } } });
    expect(await getAdminStatus()).toBe("admin");
  });

  // A failed check is not an answer: never admin, but never a sign-out either.
  it("is unavailable when the is_admin call returns an error", async () => {
    fakeClient({
      session: { user: { email: "a@b.co" } },
      isAdmin: { data: true, error: { message: "boom" } },
    });
    expect(await getAdminStatus()).toBe("unavailable");
  });

  it("is unavailable when the is_admin call throws", async () => {
    fakeClient({ session: { user: {} }, rpcThrows: true });
    expect(await getAdminStatus()).toBe("unavailable");
  });

  it("is unavailable, never admin, on anything but a boolean", async () => {
    fakeClient({
      session: { user: {} },
      isAdmin: { data: "true", error: null },
    });
    expect(await getAdminStatus()).toBe("unavailable");
    fakeClient({ session: { user: {} }, isAdmin: { data: null, error: null } });
    expect(await getAdminStatus()).toBe("unavailable");
  });
});

describe("getSessionEmail", () => {
  it("returns the signed-in email, or null", async () => {
    fakeClient({ session: { user: { email: "owner@mondelos.test" } } });
    expect(await getSessionEmail()).toBe("owner@mondelos.test");
    fakeClient({ session: null });
    expect(await getSessionEmail()).toBeNull();
    vi.mocked(getSupabase).mockReturnValue(null);
    expect(await getSessionEmail()).toBeNull();
  });
});

describe("signOut", () => {
  it("clears the session on this device", async () => {
    const { client } = fakeClient();
    await signOut();
    expect(client.auth.signOut).toHaveBeenCalledWith({ scope: "local" });
  });

  it("does nothing without a client, and never throws", async () => {
    vi.mocked(getSupabase).mockReturnValue(null);
    await expect(signOut()).resolves.toBeUndefined();
    fakeClient({ signOutThrows: true });
    await expect(signOut()).resolves.toBeUndefined();
  });
});

describe("subscribeToSignOut", () => {
  it("reports a sign-out the user did not ask for", () => {
    const { emit } = fakeClient();
    const onSignedOut = vi.fn();
    subscribeToSignOut(onSignedOut);
    emit("TOKEN_REFRESHED");
    expect(onSignedOut).not.toHaveBeenCalled();
    emit("SIGNED_OUT");
    expect(onSignedOut).toHaveBeenCalledTimes(1);
  });

  it("ignores the sign-out caused by our own signOut()", async () => {
    fakeClient();
    const onSignedOut = vi.fn();
    subscribeToSignOut(onSignedOut);
    await signOut();
    expect(onSignedOut).not.toHaveBeenCalled();
  });

  it("returns an unsubscribe function, and a no-op without a client", () => {
    const { unsubscribe } = fakeClient();
    subscribeToSignOut(vi.fn())();
    expect(unsubscribe).toHaveBeenCalled();
    vi.mocked(getSupabase).mockReturnValue(null);
    expect(() => subscribeToSignOut(vi.fn())()).not.toThrow();
  });
});
