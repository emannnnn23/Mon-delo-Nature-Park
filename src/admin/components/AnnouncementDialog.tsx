import { ContentDialog } from "~/admin/components/ContentDialog";
import { CONTROL_CLASS, FormField } from "~/admin/components/FormField";
import {
  issuesToErrors,
  useContentForm,
  type Validation,
} from "~/admin/hooks/useContentForm";
import {
  announcementSchema,
  type AnnouncementInput,
} from "~/lib/validation/announcement";
import type { Row } from "~/types/db-helpers";
import { toDateTimeLocal } from "~/utils/dates";

type AnnouncementRow = Row<"announcements">;

const TIME_ZONE_HINT = "Times use this device's time zone.";

/** What the form edits. JSON-serialisable, so a draft can be kept. */
export type AnnouncementFormValues = {
  title: string;
  body: string;
  linkLabel: string;
  linkHref: string;
  /** A `datetime-local` value: the date and time on this device's clock. */
  startsAt: string;
  endsAt: string;
};

type Field = keyof AnnouncementFormValues;

/** A new announcement starts now; a saved one shows its stored times. */
export function announcementFormValues(
  row: AnnouncementRow | null,
): AnnouncementFormValues {
  return {
    title: row?.title ?? "",
    body: row?.body ?? "",
    linkLabel: row?.link_label ?? "",
    linkHref: row?.link_href ?? "",
    startsAt: toDateTimeLocal(row?.starts_at ?? new Date().toISOString()),
    endsAt: row?.ends_at ? toDateTimeLocal(row.ends_at) : "",
  };
}

function validate(
  values: AnnouncementFormValues,
): Validation<AnnouncementInput, Field> {
  const parsed = announcementSchema.safeParse(values);
  return parsed.success
    ? { ok: true, data: parsed.data }
    : { ok: false, errors: issuesToErrors<Field>(parsed.error.issues) };
}

type AnnouncementDialogProps = {
  /** The announcement being edited, or null to add a new one. */
  announcement: AnnouncementRow | null;
  onClose: () => void;
  /** Stores the checked values and resolves to the saved row. */
  onSave: (data: AnnouncementInput) => Promise<AnnouncementRow>;
  onDirtyChange: (dirty: boolean) => void;
};

/**
 * Add or edit one announcement: the notice, an optional link, and when it is
 * shown. Whether it is switched on is set in the list, not here.
 */
export function AnnouncementDialog({
  announcement,
  onClose,
  onSave,
  onDirtyChange,
}: AnnouncementDialogProps) {
  const form = useContentForm<AnnouncementFormValues, AnnouncementInput, Field>(
    {
      draftKey: `announcement:${announcement?.id ?? "new"}`,
      initial: announcementFormValues(announcement),
      validate,
      save: async (data) => announcementFormValues(await onSave(data)),
      entity: "announcement",
      onDirtyChange,
      onSaved: onClose,
    },
  );
  const { values, errors, setField } = form;

  return (
    <ContentDialog
      title={announcement ? "Edit announcement" : "Add announcement"}
      form={form}
      onClose={onClose}
    >
      <FormField label="Title" name="title" error={errors.title}>
        <input
          type="text"
          value={values.title}
          onChange={(e) => setField("title", e.target.value)}
          className={CONTROL_CLASS}
        />
      </FormField>
      <FormField
        label="Message"
        name="body"
        optional
        hint="Up to 500 characters."
        error={errors.body}
      >
        <textarea
          rows={3}
          value={values.body}
          onChange={(e) => setField("body", e.target.value)}
          className={CONTROL_CLASS}
        />
      </FormField>
      <div className="grid gap-5 sm:grid-cols-2">
        <FormField
          label="Link label"
          name="linkLabel"
          optional
          error={errors.linkLabel}
        >
          <input
            type="text"
            value={values.linkLabel}
            onChange={(e) => setField("linkLabel", e.target.value)}
            className={CONTROL_CLASS}
          />
        </FormField>
        <FormField
          label="Link"
          name="linkHref"
          optional
          hint="A page on this site, like /visit, or a full address starting with https://"
          error={errors.linkHref}
        >
          <input
            type="text"
            value={values.linkHref}
            onChange={(e) => setField("linkHref", e.target.value)}
            className={CONTROL_CLASS}
          />
        </FormField>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <FormField
          label="Starts"
          name="startsAt"
          hint={TIME_ZONE_HINT}
          error={errors.startsAt}
        >
          <input
            type="datetime-local"
            value={values.startsAt}
            onChange={(e) => setField("startsAt", e.target.value)}
            className={CONTROL_CLASS}
          />
        </FormField>
        <FormField
          label="Ends"
          name="endsAt"
          optional
          hint={`${TIME_ZONE_HINT} Leave empty to keep it up until you switch it off.`}
          error={errors.endsAt}
        >
          <input
            type="datetime-local"
            value={values.endsAt}
            onChange={(e) => setField("endsAt", e.target.value)}
            className={CONTROL_CLASS}
          />
        </FormField>
      </div>
    </ContentDialog>
  );
}
