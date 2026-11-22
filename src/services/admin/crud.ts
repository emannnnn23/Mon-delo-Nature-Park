import { getSupabase } from "~/lib/supabase";
import type { Insert, Row, Update } from "~/types/db-helpers";

import {
  noRowsError,
  notConfiguredError,
  toFriendlyError,
  type AdminError,
} from "./errors";

/** Tables the admin edits through this generic service. */
export type ContentTable =
  | "page_sections"
  | "attractions"
  | "attraction_images"
  | "gallery_categories"
  | "gallery_images"
  | "testimonials"
  | "announcements"
  | "faqs";

/** Content tables that have a `sort_order` column. */
export type SortableTable = Exclude<ContentTable, "announcements">;
/** Content tables that have an `is_published` column. */
export type PublishableTable = Exclude<ContentTable, "attraction_images">;
/** Content tables that have an `is_sample` column. */
export type SampleTable = "page_sections" | "attractions" | "gallery_images";

const ENTITY: Record<ContentTable, string> = {
  page_sections: "section",
  attractions: "attraction",
  attraction_images: "photo",
  gallery_categories: "category",
  gallery_images: "photo",
  testimonials: "testimonial",
  announcements: "announcement",
  faqs: "question",
};

/**
 * The slice of the supabase-js query builder used here. The generated types
 * cannot follow a table name that is itself a type parameter, so queries are
 * built through this loose shape and the results are cast back to `Row<T>`
 * at the edge of each function.
 */
type QueryResult = { data: unknown; error: unknown };
interface Query extends PromiseLike<QueryResult> {
  select(columns?: string): Query;
  insert(values: object): Query;
  update(values: object): Query;
  delete(): Query;
  eq(column: string, value: unknown): Query;
  is(column: string, value: null): Query;
  order(column: string, options?: { ascending: boolean }): Query;
  limit(count: number): Query;
  maybeSingle(): Query;
  single(): Query;
}

function from(table: ContentTable): Query {
  const client = getSupabase() as unknown as {
    from(table: string): Query;
  } | null;
  if (!client) throw notConfiguredError();
  return client.from(table);
}

/** Awaits a query and returns its data, or throws a friendly AdminError. */
async function run(table: ContentTable, query: Query): Promise<unknown> {
  let result: QueryResult;
  try {
    result = await query;
  } catch (e) {
    throw toFriendlyError(e, { entity: ENTITY[table] });
  }
  if (result.error) {
    throw toFriendlyError(result.error, { entity: ENTITY[table] });
  }
  return result.data;
}

/**
 * Trims every string and turns empty ones into `null`, so optional fields are
 * never stored as `''`. Only top-level strings change; numbers, booleans,
 * arrays and objects (for example the opening-hours JSON) pass through. Applied
 * inside `insertRow` and `updateRow`, so every admin write follows the rule.
 */
export function emptyToNull<T extends Record<string, unknown>>(values: T): T {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(values)) {
    if (typeof value === "string") {
      const trimmed = value.trim();
      out[key] = trimmed === "" ? null : trimmed;
    } else {
      out[key] = value;
    }
  }
  return out as T;
}

/**
 * Rows ordered by `sort_order`, then `created_at`. Announcements have no
 * `sort_order`: they are newest-start first. Pass `orderBy` to sort by one
 * column ascending instead.
 */
export async function listRows<T extends ContentTable>(
  table: T,
  opts: { filter?: Partial<Row<T>>; orderBy?: keyof Row<T> } = {},
): Promise<Row<T>[]> {
  let query = from(table).select("*");
  for (const [column, value] of Object.entries(opts.filter ?? {})) {
    if (value === undefined) continue;
    query = value === null ? query.is(column, null) : query.eq(column, value);
  }
  if (opts.orderBy !== undefined) {
    query = query.order(String(opts.orderBy));
  } else if (table === "announcements") {
    query = query
      .order("starts_at", { ascending: false })
      .order("created_at", { ascending: false });
  } else {
    query = query.order("sort_order").order("created_at");
  }
  const data = await run(table, query);
  return (data ?? []) as Row<T>[];
}

/** One row by id, or null when it does not exist (or is not visible). */
export async function getRow<T extends ContentTable>(
  table: T,
  id: string,
): Promise<Row<T> | null> {
  const data = await run(
    table,
    from(table).select("*").eq("id", id).maybeSingle(),
  );
  return (data ?? null) as Row<T> | null;
}

export async function insertRow<T extends ContentTable>(
  table: T,
  values: Insert<T>,
): Promise<Row<T>> {
  const data = await run(
    table,
    from(table)
      .insert(emptyToNull(values as Record<string, unknown>))
      .select()
      .single(),
  );
  return data as Row<T>;
}

/**
 * Row level security hides rows from an expired or signed-out session instead
 * of raising an error, so an update that matches nothing means the session is
 * gone: it throws the same friendly "session expired" AdminError.
 */
export async function updateRow<T extends ContentTable>(
  table: T,
  id: string,
  values: Update<T>,
): Promise<Row<T>> {
  const data = await run(
    table,
    from(table)
      .update(emptyToNull(values as Record<string, unknown>))
      .eq("id", id)
      .select(),
  );
  const rows = (data ?? []) as Row<T>[];
  if (rows.length === 0) throw noRowsError();
  return rows[0];
}

/** Like `updateRow`, deleting zero rows is treated as an expired session. */
export async function deleteRow<T extends ContentTable>(
  table: T,
  id: string,
): Promise<void> {
  const data = await run(table, from(table).delete().eq("id", id).select());
  if (!Array.isArray(data) || data.length === 0) throw noRowsError();
}

type OrderRef = { id: string; sort_order: number; created_at?: string };

/**
 * Swaps the position of two rows. Normally that is two updates exchanging their
 * `sort_order`; if the second fails the first is put back (a best effort: if
 * that also fails, the original error is still the one thrown).
 *
 * Equal `sort_order` values cannot be exchanged (that changes nothing), so one
 * row is moved just after the other with a single update. Lists break ties by
 * `created_at`, so pass `created_at` on both refs (rows can be passed as they
 * are) and the one that currently sorts first is the one that moves; without
 * it `a` is assumed to be first. A third row already at `sort_order + 1` would
 * still tie with the moved one: use `nextSortOrder` on insert to avoid ties.
 */
export async function swapOrder<T extends SortableTable>(
  table: T,
  a: OrderRef,
  b: OrderRef,
): Promise<void> {
  const order = (sort_order: number) => ({ sort_order }) as Update<T>;
  if (a.sort_order === b.sort_order) {
    const aSortsFirst =
      a.created_at === undefined ||
      b.created_at === undefined ||
      a.created_at <= b.created_at;
    const mover = aSortsFirst ? a : b;
    await updateRow(table, mover.id, order(mover.sort_order + 1));
    return;
  }
  await updateRow(table, a.id, order(b.sort_order));
  try {
    await updateRow(table, b.id, order(a.sort_order));
  } catch (e) {
    try {
      await updateRow(table, a.id, order(a.sort_order));
    } catch {
      // Nothing more to do: report the failure that started this.
    }
    throw e as AdminError;
  }
}

export async function setPublished<T extends PublishableTable>(
  table: T,
  id: string,
  value: boolean,
): Promise<Row<T>> {
  return updateRow(table, id, { is_published: value } as Update<T>);
}

/** The owner has checked a sample item: it stops showing the Sample badge. */
export async function markConfirmed<T extends SampleTable>(
  table: T,
  id: string,
): Promise<Row<T>> {
  return updateRow(table, id, { is_sample: false } as Update<T>);
}

/**
 * The `sort_order` for a new row so it goes last: the highest existing value
 * plus one (0 when there are none). Pass `filter` to scope it to a parent,
 * e.g. `{ attraction_id }` for photos of one attraction.
 */
export async function nextSortOrder<T extends SortableTable>(
  table: T,
  filter?: Partial<Row<T>>,
): Promise<number> {
  let query = from(table).select("sort_order");
  for (const [column, value] of Object.entries(filter ?? {})) {
    if (value === undefined) continue;
    query = value === null ? query.is(column, null) : query.eq(column, value);
  }
  const data = await run(
    table,
    query.order("sort_order", { ascending: false }).limit(1),
  );
  const top = Array.isArray(data) ? (data[0] as { sort_order?: number }) : null;
  return typeof top?.sort_order === "number" ? top.sort_order + 1 : 0;
}
