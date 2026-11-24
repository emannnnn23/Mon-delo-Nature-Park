import { Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { CrudList } from "~/admin/components/CrudList";
import { FaqDialog } from "~/admin/components/FaqDialog";
import { useToast } from "~/admin/components/Toast";
import { useUnsavedChanges } from "~/admin/hooks/useUnsavedChanges";
import { applySwap, neighbour, sortRows } from "~/admin/lib/reorder";
import { Button } from "~/components/common/Button";
import type { FaqInput } from "~/lib/validation/faq";
import {
  deleteRow,
  insertRow,
  nextSortOrder,
  setPublished,
  swapOrder,
  updateRow,
} from "~/services/admin/crud";
import { toFriendlyError } from "~/services/admin/errors";
import type { Row } from "~/types/db-helpers";

type FaqRow = Row<"faqs">;

type FaqsPageProps = { faqs: FaqRow[] };

const PREVIEW_LENGTH = 120;

function preview(answer: string): string {
  const letters = [...answer];
  return letters.length > PREVIEW_LENGTH
    ? `${letters.slice(0, PREVIEW_LENGTH).join("").trimEnd()}…`
    : answer;
}

/**
 * Frequently asked questions for the Visit page: add, edit, switch on or off,
 * reorder and delete. A new question starts switched off, last in the list.
 */
export function FaqsPage({ faqs: initial }: FaqsPageProps) {
  const toast = useToast();
  const [items, setItems] = useState(() => sortRows(initial));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  // `undefined` is closed, `null` is a new question, a row is being edited.
  const [editing, setEditing] = useState<FaqRow | null | undefined>(undefined);
  const [dialogDirty, setDialogDirty] = useState(false);
  const messageRef = useRef<HTMLParagraphElement>(null);

  const { leaveDialog } = useUnsavedChanges(dialogDirty);

  useEffect(() => {
    if (message) messageRef.current?.focus();
  }, [message]);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setMessage(null);
    try {
      await action();
    } catch (e) {
      setMessage(toFriendlyError(e, { entity: "question" }).friendly);
    } finally {
      setBusy(false);
    }
  }

  const handleTogglePublish = (item: FaqRow, next: boolean) =>
    void run(async () => {
      const updated = await setPublished("faqs", item.id, next);
      setItems((cur) => cur.map((f) => (f.id === item.id ? updated : f)));
      toast.success(
        next ? "The question is on the website." : "The question is hidden.",
      );
    });

  const handleReorder = (item: FaqRow, direction: "up" | "down") => {
    const other = neighbour(items, item, direction);
    if (!other) return;
    void run(async () => {
      await swapOrder("faqs", item, other);
      setItems((cur) => applySwap(cur, item, other));
    });
  };

  const handleDelete = (item: FaqRow) =>
    void run(async () => {
      await deleteRow("faqs", item.id);
      setItems((cur) => cur.filter((f) => f.id !== item.id));
      toast.success("Question deleted.");
    });

  async function save(data: FaqInput): Promise<FaqRow> {
    if (editing) {
      const updated = await updateRow("faqs", editing.id, {
        question: data.question,
        answer: data.answer,
      });
      setItems((cur) => cur.map((f) => (f.id === updated.id ? updated : f)));
      toast.success("Question saved.");
      return updated;
    }
    const sort_order = await nextSortOrder("faqs");
    const created = await insertRow("faqs", {
      question: data.question,
      answer: data.answer,
      is_published: false,
      sort_order,
    });
    setItems((cur) => sortRows([...cur, created]));
    toast.success("Question added. Switch it on to show it.");
    return created;
  }

  return (
    <section aria-labelledby="faqs-title">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1
            id="faqs-title"
            className="font-serif text-3xl font-bold text-forest-900"
          >
            FAQs
          </h1>
          <p className="mt-3 max-w-xl text-ink-600">
            The questions and answers on the Visit page. Only what is switched
            on is shown to visitors.
          </p>
        </div>
        <Button
          type="button"
          variant="outline-dark"
          disabled={busy}
          onClick={() => setEditing(null)}
        >
          <Plus aria-hidden="true" className="size-4" />
          Add question
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
          emptyText="No questions yet. Use “Add question” to write the first one."
          busy={busy}
          render={(item) => ({
            label: item.question,
            detail: preview(item.answer),
          })}
          onTogglePublish={handleTogglePublish}
          onReorder={handleReorder}
          onEdit={setEditing}
          onDelete={handleDelete}
        />
      </div>

      {editing !== undefined ? (
        <FaqDialog
          key={editing?.id ?? "new"}
          faq={editing}
          onClose={() => setEditing(undefined)}
          onSave={save}
          onDirtyChange={setDialogDirty}
        />
      ) : null}

      {leaveDialog}
    </section>
  );
}
