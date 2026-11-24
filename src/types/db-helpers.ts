import type { Database } from "./database";

/** Every table in the `public` schema. */
export type TableName = keyof Database["public"]["Tables"];

/** The generated shape of a row read from table `T`. */
export type Row<T extends TableName> = Database["public"]["Tables"][T]["Row"];
/** The generated shape of a row written to table `T`. */
export type Insert<T extends TableName> =
  Database["public"]["Tables"][T]["Insert"];
/** The generated shape of a partial update to table `T`. */
export type Update<T extends TableName> =
  Database["public"]["Tables"][T]["Update"];

export type MediaRow = Row<"media">;
export type SettingsRow = Row<"site_settings">;
export type SettingsUpdate = Update<"site_settings">;
export type MessageRow = Row<"contact_messages">;
