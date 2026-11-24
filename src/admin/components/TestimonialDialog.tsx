import { ContentDialog } from "~/admin/components/ContentDialog";
import { CONTROL_CLASS, FormField } from "~/admin/components/FormField";
import {
  issuesToErrors,
  useContentForm,
  type Validation,
} from "~/admin/hooks/useContentForm";
import {
  testimonialSchema,
  type TestimonialInput,
} from "~/lib/validation/testimonial";
import type { Row } from "~/types/db-helpers";

type TestimonialRow = Row<"testimonials">;

export const PERMISSION_NOTICE =
  "Only add real reviews from real guests, and ask their permission before quoting them.";

const RECORDS_HINT = "Kept for your records; not shown on the website.";

/** What the form edits. JSON-serialisable, so a draft can be kept. */
export type TestimonialFormValues = {
  authorName: string;
  quote: string;
  /** "" for no rating, otherwise "1" to "5" (a select holds text). */
  rating: string;
  /** "" until chosen: nothing is assumed about where a review came from. */
  source: string;
  sourceUrl: string;
  reviewDate: string;
};

type Field = keyof TestimonialFormValues;

export function testimonialFormValues(
  row: TestimonialRow | null,
): TestimonialFormValues {
  return {
    authorName: row?.author_name ?? "",
    quote: row?.quote ?? "",
    rating: row?.rating == null ? "" : String(row.rating),
    source: row?.source ?? "",
    sourceUrl: row?.source_url ?? "",
    reviewDate: row?.review_date ?? "",
  };
}

function validate(
  values: TestimonialFormValues,
): Validation<TestimonialInput, Field> {
  const parsed = testimonialSchema.safeParse({
    ...values,
    rating: values.rating === "" ? null : Number(values.rating),
  });
  return parsed.success
    ? { ok: true, data: parsed.data }
    : { ok: false, errors: issuesToErrors<Field>(parsed.error.issues) };
}

const SOURCES = [
  { value: "google", label: "Google" },
  { value: "facebook", label: "Facebook" },
  { value: "direct", label: "Direct (told us in person or by message)" },
];

type TestimonialDialogProps = {
  /** The testimonial being edited, or null to add a new one. */
  testimonial: TestimonialRow | null;
  onClose: () => void;
  /** Stores the checked values and resolves to the saved row. */
  onSave: (data: TestimonialInput) => Promise<TestimonialRow>;
  onDirtyChange: (dirty: boolean) => void;
};

/**
 * Add or edit one testimonial. Only the guest's name and what they wrote are
 * shown on the website; the rating, source, link and date are for the owner's
 * records, so a review can be traced back to where it came from. Whether it is
 * on the website is switched in the list, not here.
 */
export function TestimonialDialog({
  testimonial,
  onClose,
  onSave,
  onDirtyChange,
}: TestimonialDialogProps) {
  const form = useContentForm<TestimonialFormValues, TestimonialInput, Field>({
    draftKey: `testimonial:${testimonial?.id ?? "new"}`,
    initial: testimonialFormValues(testimonial),
    validate,
    save: async (data) => testimonialFormValues(await onSave(data)),
    entity: "testimonial",
    onDirtyChange,
    onSaved: onClose,
  });
  const { values, errors, setField } = form;

  return (
    <ContentDialog
      title={testimonial ? "Edit testimonial" : "Add testimonial"}
      form={form}
      onClose={onClose}
    >
      <p className="rounded-xl border border-earth-600/40 bg-ivory-50 px-4 py-3 text-sm font-semibold text-ink-900">
        {PERMISSION_NOTICE}
      </p>
      <FormField
        label="Guest's name"
        name="authorName"
        error={errors.authorName}
      >
        <input
          type="text"
          value={values.authorName}
          onChange={(e) => setField("authorName", e.target.value)}
          className={CONTROL_CLASS}
        />
      </FormField>
      <FormField
        label="What the guest wrote"
        name="quote"
        hint="Copy their words exactly."
        error={errors.quote}
      >
        <textarea
          rows={5}
          value={values.quote}
          onChange={(e) => setField("quote", e.target.value)}
          className={CONTROL_CLASS}
        />
      </FormField>
      <FormField
        label="Where it came from"
        name="source"
        hint={RECORDS_HINT}
        error={errors.source}
      >
        <select
          value={values.source}
          onChange={(e) => setField("source", e.target.value)}
          className={CONTROL_CLASS}
        >
          <option value="">Choose one</option>
          {SOURCES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </FormField>
      <FormField
        label="Link to the original review"
        name="sourceUrl"
        optional
        hint={`A full address starting with https://. ${RECORDS_HINT}`}
        error={errors.sourceUrl}
      >
        <input
          type="text"
          inputMode="url"
          value={values.sourceUrl}
          onChange={(e) => setField("sourceUrl", e.target.value)}
          className={CONTROL_CLASS}
        />
      </FormField>
      <div className="grid gap-5 sm:grid-cols-2">
        <FormField
          label="Rating"
          name="rating"
          optional
          hint={RECORDS_HINT}
          error={errors.rating}
        >
          <select
            value={values.rating}
            onChange={(e) => setField("rating", e.target.value)}
            className={CONTROL_CLASS}
          >
            <option value="">No rating</option>
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={String(n)}>
                {n} {n === 1 ? "star" : "stars"}
              </option>
            ))}
          </select>
        </FormField>
        <FormField
          label="Date of the review"
          name="reviewDate"
          optional
          hint={RECORDS_HINT}
          error={errors.reviewDate}
        >
          <input
            type="date"
            value={values.reviewDate}
            onChange={(e) => setField("reviewDate", e.target.value)}
            className={CONTROL_CLASS}
          />
        </FormField>
      </div>
    </ContentDialog>
  );
}
