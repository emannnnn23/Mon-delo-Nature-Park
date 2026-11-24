import { Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { CrudList } from "~/admin/components/CrudList";
import { TestimonialDialog } from "~/admin/components/TestimonialDialog";
import { useToast } from "~/admin/components/Toast";
import { useUnsavedChanges } from "~/admin/hooks/useUnsavedChanges";
import { applySwap, neighbour, sortRows } from "~/admin/lib/reorder";
import { Button } from "~/components/common/Button";
import type { TestimonialInput } from "~/lib/validation/testimonial";
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

type TestimonialRow = Row<"testimonials">;

type TestimonialsPageProps = { testimonials: TestimonialRow[] };

const SOURCE_LABEL: Record<string, string> = {
  google: "Google",
  facebook: "Facebook",
  direct: "Direct",
};

const PREVIEW_LENGTH = 110;

function preview(quote: string): string {
  const letters = [...quote];
  return letters.length > PREVIEW_LENGTH
    ? `“${letters.slice(0, PREVIEW_LENGTH).join("").trimEnd()}…”`
    : `“${quote}”`;
}

/** The columns written for a form: the checked values, not the row. */
function columns(data: TestimonialInput) {
  return {
    author_name: data.authorName,
    quote: data.quote,
    rating: data.rating,
    source: data.source,
    source_url: data.sourceUrl,
    review_date: data.reviewDate,
  };
}

/**
 * Guest reviews: add, edit, switch on or off, reorder and delete. Only the
 * guest's name and words are shown on the website. A new testimonial starts
 * switched off, last in the list.
 */
export function TestimonialsPage({
  testimonials: initial,
}: TestimonialsPageProps) {
  const toast = useToast();
  const [items, setItems] = useState(() => sortRows(initial));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  // `undefined` is closed, `null` is a new testimonial, a row is being edited.
  const [editing, setEditing] = useState<TestimonialRow | null | undefined>(
    undefined,
  );
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
      setMessage(toFriendlyError(e, { entity: "testimonial" }).friendly);
    } finally {
      setBusy(false);
    }
  }

  const handleTogglePublish = (item: TestimonialRow, next: boolean) =>
    void run(async () => {
      const updated = await setPublished("testimonials", item.id, next);
      setItems((cur) => cur.map((t) => (t.id === item.id ? updated : t)));
      toast.success(
        next
          ? `${item.author_name}'s review is on the website.`
          : `${item.author_name}'s review is hidden.`,
      );
    });

  const handleReorder = (item: TestimonialRow, direction: "up" | "down") => {
    const other = neighbour(items, item, direction);
    if (!other) return;
    void run(async () => {
      await swapOrder("testimonials", item, other);
      setItems((cur) => applySwap(cur, item, other));
    });
  };

  const handleDelete = (item: TestimonialRow) =>
    void run(async () => {
      await deleteRow("testimonials", item.id);
      setItems((cur) => cur.filter((t) => t.id !== item.id));
      toast.success(`${item.author_name}'s review deleted.`);
    });

  async function save(data: TestimonialInput): Promise<TestimonialRow> {
    if (editing) {
      const updated = await updateRow(
        "testimonials",
        editing.id,
        columns(data),
      );
      setItems((cur) => cur.map((t) => (t.id === updated.id ? updated : t)));
      toast.success("Testimonial saved.");
      return updated;
    }
    const sort_order = await nextSortOrder("testimonials");
    const created = await insertRow("testimonials", {
      ...columns(data),
      is_published: false,
      sort_order,
    });
    setItems((cur) => sortRows([...cur, created]));
    toast.success("Testimonial added. Switch it on to show it.");
    return created;
  }

  return (
    <section aria-labelledby="testimonials-title">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1
            id="testimonials-title"
            className="font-serif text-3xl font-bold text-forest-900"
          >
            Testimonials
          </h1>
          <p className="mt-3 max-w-xl text-ink-600">
            What guests say about the park. Only what is switched on is shown to
            visitors, with the guest&apos;s name.
          </p>
        </div>
        <Button
          type="button"
          variant="outline-dark"
          disabled={busy}
          onClick={() => setEditing(null)}
        >
          <Plus aria-hidden="true" className="size-4" />
          Add testimonial
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
          emptyText="No testimonials yet. Use “Add testimonial” to add a real review."
          busy={busy}
          render={(item) => ({
            label: item.author_name,
            detail: (
              <>
                <span>{preview(item.quote)}</span>
                <span className="mt-0.5 block">
                  {SOURCE_LABEL[item.source] ?? item.source}
                  {item.rating ? ` · ${item.rating} of 5 stars` : ""}
                </span>
              </>
            ),
          })}
          onTogglePublish={handleTogglePublish}
          onReorder={handleReorder}
          onEdit={setEditing}
          onDelete={handleDelete}
        />
      </div>

      {editing !== undefined ? (
        <TestimonialDialog
          key={editing?.id ?? "new"}
          testimonial={editing}
          onClose={() => setEditing(undefined)}
          onSave={save}
          onDirtyChange={setDialogDirty}
        />
      ) : null}

      {leaveDialog}
    </section>
  );
}
