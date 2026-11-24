import { getSupabase } from "~/lib/supabase";
import type { MessageRow } from "~/types/db-helpers";

import { noRowsError, notConfiguredError, toFriendlyError } from "./errors";

export type MessageStatus = "new" | "read" | "archived";

const ENTITY = "message";

function client() {
  const supabase = getSupabase();
  if (!supabase) throw notConfiguredError();
  return supabase;
}

/**
 * Messages from the contact form: new ones first, then the most recently
 * submitted. Pass a status to see only that kind.
 */
export async function listMessages(
  status?: MessageStatus,
): Promise<MessageRow[]> {
  let result;
  try {
    let query = client().from("contact_messages").select("*");
    if (status) query = query.eq("status", status);
    result = await query.order("submitted_at", { ascending: false });
  } catch (e) {
    throw toFriendlyError(e, { entity: ENTITY });
  }
  if (result.error) throw toFriendlyError(result.error, { entity: ENTITY });
  const rows = result.data ?? [];
  // Array.sort is stable: within each group the newest stays first.
  return [...rows].sort(
    (a, b) => Number(b.status === "new") - Number(a.status === "new"),
  );
}

/**
 * Moves a message between new, read and archived. Only the status is ever
 * written: the database does not allow a message's content to change.
 */
export async function setMessageStatus(
  id: string,
  status: MessageStatus,
): Promise<MessageRow> {
  let result;
  try {
    result = await client()
      .from("contact_messages")
      .update({ status })
      .eq("id", id)
      .select();
  } catch (e) {
    throw toFriendlyError(e, { entity: ENTITY });
  }
  if (result.error) throw toFriendlyError(result.error, { entity: ENTITY });
  const row = result.data?.[0];
  if (!row) throw noRowsError();
  return row;
}

/** Deletes a message. Zero rows deleted means the session has expired. */
export async function deleteMessage(id: string): Promise<void> {
  let result;
  try {
    result = await client()
      .from("contact_messages")
      .delete()
      .eq("id", id)
      .select("id");
  } catch (e) {
    throw toFriendlyError(e, { entity: ENTITY });
  }
  if (result.error) throw toFriendlyError(result.error, { entity: ENTITY });
  if (!result.data || result.data.length === 0) throw noRowsError();
}
