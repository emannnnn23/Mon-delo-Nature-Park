import { ContentDialog } from "~/admin/components/ContentDialog";
import { CONTROL_CLASS, FormField } from "~/admin/components/FormField";
import {
  issuesToErrors,
  useContentForm,
  type Validation,
} from "~/admin/hooks/useContentForm";
import { faqSchema, type FaqInput } from "~/lib/validation/faq";
import type { Row } from "~/types/db-helpers";

type FaqRow = Row<"faqs">;

/** What the form edits. JSON-serialisable, so a draft can be kept. */
export type FaqFormValues = { question: string; answer: string };

type Field = keyof FaqFormValues;

export function faqFormValues(row: FaqRow | null): FaqFormValues {
  return { question: row?.question ?? "", answer: row?.answer ?? "" };
}

function validate(values: FaqFormValues): Validation<FaqInput, Field> {
  const parsed = faqSchema.safeParse(values);
  return parsed.success
    ? { ok: true, data: parsed.data }
    : { ok: false, errors: issuesToErrors<Field>(parsed.error.issues) };
}

type FaqDialogProps = {
  /** The question being edited, or null to add a new one. */
  faq: FaqRow | null;
  onClose: () => void;
  /** Stores the checked values and resolves to the saved row. */
  onSave: (data: FaqInput) => Promise<FaqRow>;
  onDirtyChange: (dirty: boolean) => void;
};

/**
 * Add or edit one question and its answer. Whether it is on the website is
 * switched in the list, not here.
 */
export function FaqDialog({
  faq,
  onClose,
  onSave,
  onDirtyChange,
}: FaqDialogProps) {
  const form = useContentForm<FaqFormValues, FaqInput, Field>({
    draftKey: `faq:${faq?.id ?? "new"}`,
    initial: faqFormValues(faq),
    validate,
    save: async (data) => faqFormValues(await onSave(data)),
    entity: "question",
    onDirtyChange,
    onSaved: onClose,
  });
  const { values, errors, setField } = form;

  return (
    <ContentDialog
      title={faq ? "Edit question" : "Add question"}
      form={form}
      onClose={onClose}
    >
      <FormField label="Question" name="question" error={errors.question}>
        <input
          type="text"
          value={values.question}
          onChange={(e) => setField("question", e.target.value)}
          className={CONTROL_CLASS}
        />
      </FormField>
      <FormField label="Answer" name="answer" error={errors.answer}>
        <textarea
          rows={6}
          value={values.answer}
          onChange={(e) => setField("answer", e.target.value)}
          className={CONTROL_CLASS}
        />
      </FormField>
    </ContentDialog>
  );
}
