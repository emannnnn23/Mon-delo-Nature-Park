import { getSupabase } from "~/lib/supabase";
import type { SettingsRow, SettingsUpdate } from "~/types/db-helpers";

import { emptyToNull } from "./crud";
import {
  AdminError,
  noRowsError,
  notConfiguredError,
  toFriendlyError,
} from "./errors";

const ENTITY = "setting";

/** Shown when the single settings row is not there (it is never created here). */
export const SETTINGS_MISSING =
  "Settings row is missing — run the database setup again.";

function client() {
  const supabase = getSupabase();
  if (!supabase) throw notConfiguredError();
  return supabase;
}

/** The one settings row the website and the admin share. */
export async function getSettings(): Promise<SettingsRow> {
  let result;
  try {
    result = await client()
      .from("site_settings")
      .select("*")
      .eq("singleton", true)
      .maybeSingle();
  } catch (e) {
    throw toFriendlyError(e, { entity: ENTITY });
  }
  if (result.error) throw toFriendlyError(result.error, { entity: ENTITY });
  if (!result.data) throw new AdminError("SETTINGS_MISSING", SETTINGS_MISSING);
  return result.data;
}

/**
 * Saves changes to the single settings row (it is never inserted: the
 * database creates it). Empty optional text is stored as null. Row level
 * security hides the row from an expired session, so an update that matches
 * nothing is reported as an expired session.
 */
export async function updateSettings(
  values: SettingsUpdate,
): Promise<SettingsRow> {
  let result;
  try {
    result = await client()
      .from("site_settings")
      .update(emptyToNull(values as Record<string, unknown>) as SettingsUpdate)
      .eq("singleton", true)
      .select();
  } catch (e) {
    throw toFriendlyError(e, { entity: ENTITY });
  }
  if (result.error) throw toFriendlyError(result.error, { entity: ENTITY });
  const row = result.data?.[0];
  if (!row) throw noRowsError();
  return row;
}
