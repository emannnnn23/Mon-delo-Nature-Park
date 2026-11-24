import { useState } from "react";
import { Link, useSearchParams } from "react-router";

import { AdminModal } from "~/admin/components/AdminModal";
import { useToast } from "~/admin/components/Toast";
import { toFriendlyError } from "~/services/admin/errors";
import {
  deleteMessage,
  setMessageStatus,
  type MessageStatus,
} from "~/services/admin/messages";
import type { MessageRow } from "~/types/db-helpers";

type MessagesPageProps = { messages: MessageRow[] };

export const MESSAGE_FILTERS = [
  { value: "new", label: "New" },
  { value: "read", label: "Read" },
  { value: "archived", label: "Archived" },
  { value: null, label: "All" },
] as const;

/** The status in `?status=`, or null (All) when it is missing or unknown. */
export function parseStatusFilter(value: string | null): MessageStatus | null {
  return value === "new" || value === "read" || value === "archived"
    ? value
    : null;
}

const DATE = new Intl.DateTimeFormat("en-PH", {
  dateStyle: "medium",
  timeStyle: "short",
});

function formatDate(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "" : DATE.format(date);
}

const ACTION =
  "inline-flex min-h-11 items-center justify-center rounded-full border px-5 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60";

type DetailProps = {
  message: MessageRow;
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onSetStatus: (status: MessageStatus) => void;
  onDelete: () => void;
};

/**
 * One message in full. Its words are always shown as plain text: React puts
 * them on the page as text, so nothing a visitor typed can become markup.
 */
function MessageDetail({
  message,
  busy,
  error,
  onClose,
  onSetStatus,
  onDelete,
}: DetailProps) {
  const [confirming, setConfirming] = useState(false);
  return (
    <AdminModal title={message.subject} onClose={onClose} busy={busy}>
      <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[auto_1fr]">
        <dt className="font-semibold text-ink-900">From</dt>
        <dd className="break-words text-ink-600">{message.full_name}</dd>
        <dt className="font-semibold text-ink-900">Email</dt>
        <dd className="break-words text-ink-600">{message.email}</dd>
        {message.phone ? (
          <>
            <dt className="font-semibold text-ink-900">Phone</dt>
            <dd className="break-words text-ink-600">{message.phone}</dd>
          </>
        ) : null}
        <dt className="font-semibold text-ink-900">Sent</dt>
        <dd className="text-ink-600">{formatDate(message.submitted_at)}</dd>
      </dl>

      <p className="mt-6 text-base break-words whitespace-pre-wrap text-ink-900">
        {message.message}
      </p>

      {error ? (
        <p role="alert" className="mt-5 font-semibold text-red-700">
          {error}
        </p>
      ) : null}

      {confirming ? (
        <div className="mt-6 rounded-xl border border-red-700/40 bg-ivory-50 p-4">
          <p className="font-semibold text-ink-900">
            Delete this message? This can&apos;t be undone.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              disabled={busy}
              onClick={() => setConfirming(false)}
              className={`${ACTION} border-forest-900 text-forest-900`}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={onDelete}
              className={`${ACTION} border-red-700 bg-red-700 text-white`}
            >
              Delete message
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-6 flex flex-wrap gap-3">
          {message.status === "archived" ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => onSetStatus("read")}
              className={`${ACTION} border-forest-900 text-forest-900`}
            >
              Move back to inbox
            </button>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={() => onSetStatus("archived")}
              className={`${ACTION} border-forest-900 text-forest-900`}
            >
              Archive
            </button>
          )}
          <button
            type="button"
            disabled={busy}
            onClick={() => setConfirming(true)}
            className={`${ACTION} border-red-700 text-red-700`}
          >
            Delete
          </button>
        </div>
      )}
    </AdminModal>
  );
}

/**
 * Messages sent through the contact form. A message is marked read when it is
 * opened. Archiving keeps it; deleting removes it for good, after asking.
 */
export function MessagesPage({ messages: initial }: MessagesPageProps) {
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const filter = parseStatusFilter(searchParams.get("status"));
  const [items, setItems] = useState(initial);
  const [openId, setOpenId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Keeps a message in the list for this visit after it leaves the filter
  // (opened from New, archived), so it does not vanish under the owner.
  const [touched, setTouched] = useState<ReadonlySet<string>>(new Set());

  const visible = items.filter(
    (m) => filter === null || m.status === filter || touched.has(m.id),
  );
  const open = items.find((m) => m.id === openId) ?? null;

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (e) {
      setError(toFriendlyError(e, { entity: "message" }).friendly);
    } finally {
      setBusy(false);
    }
  }

  function replace(updated: MessageRow) {
    setTouched((cur) => new Set(cur).add(updated.id));
    setItems((cur) => cur.map((m) => (m.id === updated.id ? updated : m)));
  }

  function handleOpen(message: MessageRow) {
    setOpenId(message.id);
    setError(null);
    if (message.status !== "new") return;
    void run(async () => replace(await setMessageStatus(message.id, "read")));
  }

  const handleSetStatus = (message: MessageRow, status: MessageStatus) =>
    void run(async () => {
      replace(await setMessageStatus(message.id, status));
      toast.success(
        status === "archived" ? "Message archived." : "Message moved back.",
      );
      setOpenId(null);
    });

  const handleDelete = (message: MessageRow) =>
    void run(async () => {
      await deleteMessage(message.id);
      setItems((cur) => cur.filter((m) => m.id !== message.id));
      setOpenId(null);
      toast.success("Message deleted.");
    });

  return (
    <section aria-labelledby="messages-title">
      <h1
        id="messages-title"
        className="font-serif text-3xl font-bold text-forest-900"
      >
        Messages
      </h1>
      <p className="mt-3 max-w-xl text-ink-600">
        What visitors send through the contact form. Open a message to read it.
      </p>

      <nav aria-label="Filter messages" className="mt-6">
        <ul className="flex flex-wrap gap-2">
          {MESSAGE_FILTERS.map(({ value, label }) => {
            const active = filter === value;
            return (
              <li key={label}>
                <Link
                  to={value ? `?status=${value}` : "."}
                  aria-current={active ? "page" : undefined}
                  className={`inline-flex min-h-11 items-center rounded-full border px-5 py-2 text-sm font-semibold ${
                    active
                      ? "border-forest-900 bg-forest-900 text-ivory-50"
                      : "border-forest-900 text-forest-900 hover:bg-forest-900/10"
                  }`}
                >
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {error && !open ? (
        <p role="alert" className="mt-5 font-semibold text-red-700">
          {error}
        </p>
      ) : null}

      {visible.length === 0 ? (
        <p className="mt-8 text-ink-600">
          {filter === null
            ? "No messages yet. They appear here when someone uses the contact form."
            : "No messages in this view."}
        </p>
      ) : (
        <ul aria-label="Messages" className="mt-6 flex flex-col gap-3">
          {visible.map((m) => (
            <li key={m.id}>
              <button
                type="button"
                aria-label={`Open message from ${m.full_name}: ${m.subject}`}
                onClick={() => handleOpen(m)}
                className="flex min-h-11 w-full flex-wrap items-center gap-x-4 gap-y-1 rounded-2xl border border-cream-100 bg-white px-5 py-4 text-left hover:border-forest-900/40"
              >
                <span
                  className={`min-w-0 flex-1 break-words ${
                    m.status === "new"
                      ? "font-bold text-ink-900"
                      : "text-ink-900"
                  }`}
                >
                  <span className="block">{m.full_name}</span>
                  <span className="block text-sm font-normal text-ink-600">
                    {m.subject}
                  </span>
                </span>
                {m.status === "new" ? (
                  <span className="rounded-full bg-gold-500 px-3 py-0.5 text-xs font-bold text-ink-900">
                    New
                  </span>
                ) : null}
                {m.status === "archived" ? (
                  <span className="text-xs font-semibold text-ink-600">
                    Archived
                  </span>
                ) : null}
                <span className="text-sm text-ink-600">
                  {formatDate(m.submitted_at)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {open ? (
        <MessageDetail
          key={open.id}
          message={open}
          busy={busy}
          error={error}
          onClose={() => setOpenId(null)}
          onSetStatus={(status) => handleSetStatus(open, status)}
          onDelete={() => handleDelete(open)}
        />
      ) : null}
    </section>
  );
}
