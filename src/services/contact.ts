import type { SupabaseClient } from "@supabase/supabase-js";
import { getPublicSupabase } from "../lib/publicClient";
import type { ContactInput } from "../lib/validation/contact";
import type { Database } from "../types/database";

export type ContactSubmission = ContactInput & {
  /** What a bot typed in the hidden field; empty for a person. */
  honeypot: string;
  /** Milliseconds between the form appearing and the submit. */
  elapsedMs: number;
};

export type ContactResult = "ok" | "rate_limited" | "error";

/**
 * Stores a contact message through the `submit_contact_message` RPC, the only
 * public write path into the database. The RPC raises SQLSTATE P0001 with the
 * message `rate_limited` when the per-email or global hourly limit is hit.
 * Nothing here logs the visitor's message, name, email or phone.
 */
export async function submitContactMessage(
  input: ContactSubmission,
  client: SupabaseClient<Database> | null = resolvePublicClient(),
): Promise<ContactResult> {
  if (!client) {
    console.error("Contact form: Supabase is not configured.");
    return "error";
  }

  try {
    const { data, error } = await client.rpc("submit_contact_message", {
      p_full_name: input.fullName,
      p_email: input.email,
      // The RPC treats a null phone as blank; the generated type is stricter.
      p_phone: (input.phone ?? null) as string,
      p_subject: input.subject,
      p_message: input.message,
      p_honeypot: input.honeypot,
      p_elapsed_ms: Math.round(input.elapsedMs),
    });

    if (error) {
      if (error.code === "P0001" && error.message === "rate_limited") {
        return "rate_limited";
      }
      console.error("Contact form: the message was not stored.", {
        code: error.code,
      });
      return "error";
    }
    if (data !== "ok") {
      console.error("Contact form: unexpected response from the database.");
      return "error";
    }
    return "ok";
  } catch {
    console.error("Contact form: the request failed.");
    return "error";
  }
}

function resolvePublicClient(): SupabaseClient<Database> | null {
  try {
    return getPublicSupabase();
  } catch {
    return null;
  }
}
