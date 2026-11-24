import { Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { AnnouncementDialog } from "~/admin/components/AnnouncementDialog";
import { CrudList } from "~/admin/components/CrudList";
import { useToast } from "~/admin/components/Toast";
import { useUnsavedChanges } from "~/admin/hooks/useUnsavedChanges";
import {
  announcementStatus,
  sortAnnouncements,
  type AnnouncementStatus,
} from "~/admin/lib/announcementStatus";
import { Button } from "~/components/common/Button";
import type { AnnouncementInput } from "~/lib/validation/announcement";
import {
  deleteRow,
  insertRow,
  setPublished,
  updateRow,
} from "~/services/admin/crud";
import { toFriendlyError } from "~/services/admin/errors";
import type { Row } from "~/types/db-helpers";
import { toDateTimeLocal } from "~/utils/dates";

type AnnouncementRow = Row<"announcements">;

type AnnouncementsPageProps = { announcements: AnnouncementRow[] };

const CHIP =
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold";

const CHIP_STYLE: Record<AnnouncementStatus, string> = {
  Live: "border-forest-900 bg-forest-900 text-ivory-50",
  Scheduled: "border-earth-600 bg-ivory-50 text-earth-700",
  Ended: "border-cream-100 bg-cream-100 text-ink-600",
  Unpublished: "border-earth-600/50 bg-white text-ink-600",
};

function when(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

/** The columns written for a form: the checked values, not the row. */
function columns(data: AnnouncementInput) {
  return {
    title: data.title,
    body: data.body,
    link_label: data.linkLabel,
    link_href: data.linkHref,
    starts_at: data.startsAt,
    ends_at: data.endsAt,
  };
}

/**
 * The columns for editing a saved row. The form shows times only to the
 * minute, so writing them back would round away stored seconds: a time is sent
 * only when the form value differs from what the row shows.
 */
function editColumns(data: AnnouncementInput, row: AnnouncementRow) {
  const { starts_at, ends_at, ...rest } = columns(data);
  const local = (iso: string | null) => (iso ? toDateTimeLocal(iso) : "");
  return {
    ...rest,
    ...(local(starts_at) !== local(row.starts_at) ? { starts_at } : {}),
    ...(local(ends_at) !== local(row.ends_at) ? { ends_at } : {}),
  };
}

/**
 * The notice strip above the website: add, edit, switch on or off and delete.
 * Newest start first; there is no manual order. Each row says whether it is
 * live now. A new announcement starts switched off.
 */
export function AnnouncementsPage({
  announcements: initial,
}: AnnouncementsPageProps) {
  const toast = useToast();
  const [items, setItems] = useState(() => sortAnnouncements(initial));
  // The status of each row is worked out against this moment, refreshed
  // whenever the list changes.
  const [now, setNow] = useState(() => new Date());
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  // `undefined` is closed, `null` is a new announcement, a row is being edited.
  const [editing, setEditing] = useState<AnnouncementRow | null | undefined>(
    undefined,
  );
  const [dialogDirty, setDialogDirty] = useState(false);
  const messageRef = useRef<HTMLParagraphElement>(null);

  const { leaveDialog } = useUnsavedChanges(dialogDirty);

  useEffect(() => {
    if (message) messageRef.current?.focus();
  }, [message]);

  function change(update: (cur: AnnouncementRow[]) => AnnouncementRow[]) {
    setItems((cur) => sortAnnouncements(update(cur)));
    setNow(new Date());
  }

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setMessage(null);
    try {
      await action();
    } catch (e) {
      setMessage(toFriendlyError(e, { entity: "announcement" }).friendly);
    } finally {
      setBusy(false);
    }
  }

  const handleTogglePublish = (item: AnnouncementRow, next: boolean) =>
    void run(async () => {
      const updated = await setPublished("announcements", item.id, next);
      change((cur) => cur.map((a) => (a.id === item.id ? updated : a)));
      toast.success(
        next
          ? "The announcement is switched on."
          : "The announcement is switched off.",
      );
    });

  const handleDelete = (item: AnnouncementRow) =>
    void run(async () => {
      await deleteRow("announcements", item.id);
      change((cur) => cur.filter((a) => a.id !== item.id));
      toast.success("Announcement deleted.");
    });

  async function save(data: AnnouncementInput): Promise<AnnouncementRow> {
    if (editing) {
      const updated = await updateRow(
        "announcements",
        editing.id,
        editColumns(data, editing),
      );
      change((cur) => cur.map((a) => (a.id === updated.id ? updated : a)));
      toast.success("Announcement saved.");
      return updated;
    }
    const created = await insertRow("announcements", {
      ...columns(data),
      is_published: false,
    });
    change((cur) => [...cur, created]);
    toast.success("Announcement added. Switch it on to show it.");
    return created;
  }

  return (
    <section aria-labelledby="announcements-title">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1
            id="announcements-title"
            className="font-serif text-3xl font-bold text-forest-900"
          >
            Announcements
          </h1>
          <p className="mt-3 max-w-xl text-ink-600">
            A short notice above every page of the website. It is shown only
            while it is switched on and between its start and end times.
          </p>
        </div>
        <Button
          type="button"
          variant="outline-dark"
          disabled={busy}
          onClick={() => setEditing(null)}
        >
          <Plus aria-hidden="true" className="size-4" />
          Add announcement
        </Button>
      </div>

      <div className="mt-8">
        {message ? (
          <p
            ref={messageRef}
            tabIndex={-1}
            role="alert"
            className="mb-4 font-semibold text-red-700 focus:outline-none"
          >
            {message}
          </p>
        ) : null}
        <CrudList
          items={items}
          emptyText="No announcements yet. Use “Add announcement” to write one."
          busy={busy}
          render={(item) => {
            const status = announcementStatus(item, now);
            return {
              label: item.title,
              badges: (
                <span className={`${CHIP} ${CHIP_STYLE[status]}`}>
                  {status}
                </span>
              ),
              detail: (
                <>
                  Starts {when(item.starts_at)}
                  {item.ends_at
                    ? ` · Ends ${when(item.ends_at)}`
                    : " · No end date"}
                </>
              ),
            };
          }}
          onTogglePublish={handleTogglePublish}
          onEdit={setEditing}
          onDelete={handleDelete}
        />
      </div>

      {editing !== undefined ? (
        <AnnouncementDialog
          key={editing?.id ?? "new"}
          announcement={editing}
          onClose={() => setEditing(undefined)}
          onSave={save}
          onDirtyChange={setDialogDirty}
        />
      ) : null}

      {leaveDialog}
    </section>
  );
}
