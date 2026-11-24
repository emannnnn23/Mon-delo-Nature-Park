type Ordered = { id: string; sort_order: number; created_at: string };

function compare(a: Ordered, b: Ordered): number {
  return (
    a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at)
  );
}

/** Rows in list order: by `sort_order`, then `created_at` (as the database). */
export function sortRows<T extends Ordered>(rows: T[]): T[] {
  return [...rows].sort(compare);
}

/**
 * What `swapOrder` leaves behind, worked out locally so the list can follow
 * without asking the database again: the two rows exchange `sort_order`, or,
 * when they are equal, the one that sorts first moves just after the other.
 * `a` is the row that was moved and `b` its neighbour.
 */
export function applySwap<T extends Ordered>(rows: T[], a: T, b: T): T[] {
  const sorted = [...rows];
  if (a.sort_order === b.sort_order) {
    const mover = a.created_at <= b.created_at ? a : b;
    return sortRows(
      sorted.map((r) =>
        r.id === mover.id ? { ...r, sort_order: r.sort_order + 1 } : r,
      ),
    );
  }
  return sortRows(
    sorted.map((r) =>
      r.id === a.id
        ? { ...r, sort_order: b.sort_order }
        : r.id === b.id
          ? { ...r, sort_order: a.sort_order }
          : r,
    ),
  );
}

/** The row next to `item` in `rows` in the given direction, or null. */
export function neighbour<T extends { id: string }>(
  rows: T[],
  item: T,
  direction: "up" | "down",
): T | null {
  const index = rows.findIndex((r) => r.id === item.id);
  if (index === -1) return null;
  return rows[direction === "up" ? index - 1 : index + 1] ?? null;
}
