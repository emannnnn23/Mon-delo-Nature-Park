/**
 * True when `now` is inside the window: starts <= now < ends. A null end means
 * the window never closes. Mirrors the SQL rule that selects announcements.
 */
export function isWithinWindow(
  startsAt: string,
  endsAt: string | null,
  now: Date,
): boolean {
  const start = Date.parse(startsAt);
  if (Number.isNaN(start)) return false;
  const t = now.getTime();
  if (t < start) return false;
  if (endsAt === null) return true;
  const end = Date.parse(endsAt);
  if (Number.isNaN(end)) return false;
  return t < end;
}
