import { isWithinWindow } from "~/utils/dates";

export type AnnouncementStatus = "Live" | "Scheduled" | "Ended" | "Unpublished";

type Timed = {
  is_published: boolean;
  starts_at: string;
  ends_at: string | null;
};

/**
 * Where an announcement is right now. Switched off wins: an announcement that
 * is not published is never shown, whatever its dates say.
 */
export function announcementStatus(row: Timed, now: Date): AnnouncementStatus {
  if (!row.is_published) return "Unpublished";
  if (isWithinWindow(row.starts_at, row.ends_at, now)) return "Live";
  return now.getTime() < Date.parse(row.starts_at) ? "Scheduled" : "Ended";
}

/** Newest start first, then newest created (as the loader orders them). */
export function sortAnnouncements<
  T extends { starts_at: string; created_at: string },
>(rows: T[]): T[] {
  return [...rows].sort(
    (a, b) =>
      Date.parse(b.starts_at) - Date.parse(a.starts_at) ||
      Date.parse(b.created_at) - Date.parse(a.created_at),
  );
}
