import { Pencil, Trash2 } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router";

import { ConfirmDialog } from "./ConfirmDialog";
import { PublishToggle } from "./PublishToggle";
import { ReorderButtons } from "./ReorderButtons";

/** What CrudList needs from a row. Database rows satisfy it as they are. */
export type CrudItem = { id: string; is_published?: boolean };

/** How one item is shown. */
export type CrudRowView = {
  /** Plain-text name, used in screen reader labels ("Move {label} up"). */
  label: string;
  /** Main text of the row. Defaults to `label`. */
  title?: ReactNode;
  /** A line under the title (a summary, a date, a category). */
  detail?: ReactNode;
  /** Small marks next to the title, such as `<SampleTag />`. */
  badges?: ReactNode;
  /** Edit page for the item. No Edit link when omitted. */
  editTo?: string;
};

type CrudListProps<T extends CrudItem> = {
  items: T[];
  render: (item: T) => CrudRowView;
  /** Shown instead of the list when there are no items. */
  emptyText: string;
  /** Move an item one place. The list is not reordered here: update `items`. */
  onReorder?: (item: T, direction: "up" | "down") => void;
  /** Called only after the owner confirms in the built-in dialog. */
  onDelete?: (item: T) => void;
  /** Text of the delete confirmation. Defaults to "This can't be undone." */
  deleteBody?: (item: T) => ReactNode;
  onTogglePublish?: (item: T, next: boolean) => void;
  /** For rows without an edit page: shows an Edit button that calls this. */
  onEdit?: (item: T) => void;
  /** Disables every control, e.g. while a save is running. */
  busy?: boolean;
};

const ACTION =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60";

const CELL =
  "max-lg:block max-lg:px-4 max-lg:py-2 lg:px-4 lg:py-3 lg:align-middle";

/**
 * The list screen of a content type. A table from `lg` up; below that every
 * row becomes a stacked card. It is one set of elements restyled with CSS, so
 * screen readers never hear the items twice. Controls whose handler is not
 * passed are left out. Deleting always asks first.
 */
export function CrudList<T extends CrudItem>({
  items,
  render,
  emptyText,
  onReorder,
  onDelete,
  deleteBody,
  onTogglePublish,
  onEdit,
  busy = false,
}: CrudListProps<T>) {
  const [pendingDelete, setPendingDelete] = useState<T | null>(null);
  const tableRef = useRef<HTMLTableElement>(null);
  const emptyRef = useRef<HTMLParagraphElement>(null);
  const refocus = useRef<
    | { kind: "reorder"; id: string; direction: "up" | "down" }
    | { kind: "delete"; index: number }
    | null
  >(null);

  // After a move or a delete the control that had focus may be gone or have
  // been re-created, which drops focus to the page. If that happened, put it
  // somewhere sensible: the same Move button, or the neighbouring row (the
  // empty message when nothing is left). If focus is still somewhere real, or
  // the owner moved it, leave it alone.
  useEffect(() => {
    const target = refocus.current;
    if (!target) return;
    refocus.current = null;
    const active = document.activeElement;
    if (active && active !== document.body) return;
    if (items.length === 0) {
      emptyRef.current?.focus();
      return;
    }
    const rows = Array.from(
      tableRef.current?.querySelectorAll<HTMLElement>("tr[data-row-id]") ?? [],
    );
    if (target.kind === "reorder") {
      rows
        .find((row) => row.dataset.rowId === target.id)
        ?.querySelector<HTMLElement>(`[data-reorder="${target.direction}"]`)
        ?.focus();
    } else {
      rows[Math.min(target.index, rows.length - 1)]
        ?.querySelector<HTMLElement>("a[href], button:not([disabled])")
        ?.focus();
    }
  }, [items]);

  if (items.length === 0) {
    return (
      <p
        ref={emptyRef}
        tabIndex={-1}
        className="rounded-xl border border-dashed border-earth-600/50 bg-white px-5 py-10 text-center text-ink-600 focus:outline-none"
      >
        {emptyText}
      </p>
    );
  }

  const hasStatus = onTogglePublish !== undefined;
  const pendingLabel = pendingDelete ? render(pendingDelete).label : "";

  return (
    <>
      <table ref={tableRef} className="w-full text-left max-lg:block">
        <thead className="sr-only lg:not-sr-only">
          <tr className="border-b border-earth-600/30 text-sm text-ink-600">
            <th scope="col" className="px-4 py-2 font-semibold">
              Item
            </th>
            {hasStatus ? (
              <th scope="col" className="px-4 py-2 font-semibold">
                On the website
              </th>
            ) : null}
            {onReorder ? (
              <th scope="col" className="px-4 py-2 font-semibold">
                Order
              </th>
            ) : null}
            <th scope="col" className="px-4 py-2 font-semibold">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="max-lg:flex max-lg:flex-col max-lg:gap-3">
          {items.map((item, index) => {
            const view = render(item);
            return (
              <tr
                key={item.id}
                data-row-id={item.id}
                className="max-lg:block max-lg:rounded-xl max-lg:border max-lg:border-cream-100 max-lg:bg-white max-lg:py-2 max-lg:shadow-sm lg:border-b lg:border-cream-100"
              >
                <th
                  scope="row"
                  className={`${CELL} min-w-0 text-left font-normal`}
                >
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="font-semibold text-forest-900">
                      {view.title ?? view.label}
                    </span>
                    {view.badges}
                  </div>
                  {view.detail ? (
                    <div className="mt-0.5 text-sm text-ink-600">
                      {view.detail}
                    </div>
                  ) : null}
                </th>
                {hasStatus ? (
                  <td className={CELL}>
                    <PublishToggle
                      compact
                      label={`Publish ${view.label} on website`}
                      checked={item.is_published === true}
                      disabled={busy}
                      onChange={(next) => onTogglePublish(item, next)}
                    />
                  </td>
                ) : null}
                {onReorder ? (
                  <td className={CELL}>
                    <ReorderButtons
                      label={view.label}
                      disableUp={busy || index === 0}
                      disableDown={busy || index === items.length - 1}
                      onUp={() => {
                        refocus.current = {
                          kind: "reorder",
                          id: item.id,
                          direction: "up",
                        };
                        onReorder(item, "up");
                      }}
                      onDown={() => {
                        refocus.current = {
                          kind: "reorder",
                          id: item.id,
                          direction: "down",
                        };
                        onReorder(item, "down");
                      }}
                    />
                  </td>
                ) : null}
                <td className={CELL}>
                  <div className="flex flex-wrap gap-2">
                    {view.editTo ? (
                      <Link
                        to={view.editTo}
                        aria-label={`Edit ${view.label}`}
                        className={`${ACTION} border-forest-900 text-forest-900 hover:bg-forest-900 hover:text-ivory-50`}
                      >
                        <Pencil aria-hidden="true" className="size-4" />
                        Edit
                      </Link>
                    ) : onEdit ? (
                      <button
                        type="button"
                        aria-label={`Edit ${view.label}`}
                        disabled={busy}
                        onClick={() => onEdit(item)}
                        className={`${ACTION} border-forest-900 text-forest-900 hover:bg-forest-900 hover:text-ivory-50`}
                      >
                        <Pencil aria-hidden="true" className="size-4" />
                        Edit
                      </button>
                    ) : null}
                    {onDelete ? (
                      <button
                        type="button"
                        aria-label={`Delete ${view.label}`}
                        disabled={busy}
                        onClick={() => setPendingDelete(item)}
                        className={`${ACTION} border-red-700 text-red-700 hover:bg-red-700 hover:text-white`}
                      >
                        <Trash2 aria-hidden="true" className="size-4" />
                        Delete
                      </button>
                    ) : null}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <ConfirmDialog
        open={pendingDelete !== null}
        title={`Delete “${pendingLabel}”?`}
        body={
          pendingDelete && deleteBody
            ? deleteBody(pendingDelete)
            : "This can't be undone."
        }
        confirmLabel="Delete"
        destructive
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          const item = pendingDelete;
          setPendingDelete(null);
          if (item && onDelete) {
            refocus.current = {
              kind: "delete",
              index: items.findIndex((x) => x.id === item.id),
            };
            onDelete(item);
          }
        }}
      />
    </>
  );
}
