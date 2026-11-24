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

/**
 * An ISO timestamp as the value of a `datetime-local` input: the date and
 * time on this device's clock, to the minute ("2026-12-01T09:30"). Empty when
 * the timestamp cannot be read.
 */
export function toDateTimeLocal(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const two = (n: number) => String(n).padStart(2, "0");
  return (
    `${date.getFullYear()}-${two(date.getMonth() + 1)}-${two(date.getDate())}` +
    `T${two(date.getHours())}:${two(date.getMinutes())}`
  );
}
