import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "~/types/database";
import { submitContactMessage } from "./contact";

const input = {
  fullName: "Ana Reyes",
  email: "ana@example.com",
  phone: "+63 900 000 0000" as string | undefined,
  subject: "A question",
  message: "I would like to ask about visiting.",
  honeypot: "",
  elapsedMs: 12345,
};

type RpcResult = {
  data: unknown;
  error: { code?: string; message: string } | null;
};

function fakeClient(result: RpcResult | Error) {
  const rpc = vi.fn<(name: string, args: unknown) => Promise<RpcResult>>(
    async () => {
      if (result instanceof Error) throw result;
      return result;
    },
  );
  return {
    rpc,
    client: { rpc } as unknown as SupabaseClient<Database>,
  };
}

describe("submitContactMessage", () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  it("calls the RPC with the mapped arguments and returns ok", async () => {
    const { rpc, client } = fakeClient({ data: "ok", error: null });
    await expect(submitContactMessage(input, client)).resolves.toBe("ok");
    expect(rpc).toHaveBeenCalledWith("submit_contact_message", {
      p_full_name: "Ana Reyes",
      p_email: "ana@example.com",
      p_phone: "+63 900 000 0000",
      p_subject: "A question",
      p_message: "I would like to ask about visiting.",
      p_honeypot: "",
      p_elapsed_ms: 12345,
    });
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("passes p_phone null when phone is undefined", async () => {
    const { rpc, client } = fakeClient({ data: "ok", error: null });
    await submitContactMessage({ ...input, phone: undefined }, client);
    expect(rpc.mock.calls[0]).toEqual([
      "submit_contact_message",
      expect.objectContaining({ p_phone: null }),
    ]);
  });

  it("passes the honeypot value and a whole-number elapsed time through", async () => {
    const { rpc, client } = fakeClient({ data: "ok", error: null });
    await submitContactMessage(
      { ...input, honeypot: "http://spam.example", elapsedMs: 4321.7 },
      client,
    );
    expect(rpc.mock.calls[0]).toEqual([
      "submit_contact_message",
      expect.objectContaining({
        p_honeypot: "http://spam.example",
        p_elapsed_ms: 4322,
      }),
    ]);
  });

  it("maps P0001 rate_limited to rate_limited without logging", async () => {
    const { client } = fakeClient({
      data: null,
      error: { code: "P0001", message: "rate_limited" },
    });
    await expect(submitContactMessage(input, client)).resolves.toBe(
      "rate_limited",
    );
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("maps any other database error to error and logs the code only", async () => {
    const { client } = fakeClient({
      data: null,
      error: { code: "23514", message: "violates check constraint" },
    });
    await expect(submitContactMessage(input, client)).resolves.toBe("error");
    expect(errorSpy).toHaveBeenCalledTimes(1);
    const logged = JSON.stringify(errorSpy.mock.calls);
    expect(logged).toContain("23514");
    expect(logged).not.toContain(input.message);
    expect(logged).not.toContain(input.email);
  });

  it("does not treat P0001 with a different message as rate limited", async () => {
    const { client } = fakeClient({
      data: null,
      error: { code: "P0001", message: "something else" },
    });
    await expect(submitContactMessage(input, client)).resolves.toBe("error");
  });

  it("maps a thrown network failure to error", async () => {
    const { client } = fakeClient(new TypeError("Failed to fetch"));
    await expect(submitContactMessage(input, client)).resolves.toBe("error");
    expect(errorSpy).toHaveBeenCalledTimes(1);
  });

  it("maps an unexpected success payload to error", async () => {
    const { client } = fakeClient({ data: "nope", error: null });
    await expect(submitContactMessage(input, client)).resolves.toBe("error");
  });

  it("returns error when the public client is not configured", async () => {
    // No VITE_SUPABASE_* env in tests, so the default client is null.
    await expect(submitContactMessage(input)).resolves.toBe("error");
    expect(errorSpy).toHaveBeenCalledTimes(1);
  });
});
