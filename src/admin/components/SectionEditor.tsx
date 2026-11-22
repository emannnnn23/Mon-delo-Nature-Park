import { ChevronDown } from "lucide-react";
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";

import { CONTROL_CLASS, FormField } from "~/admin/components/FormField";
import { ImagePicker } from "~/admin/components/ImagePicker";
import { PublishToggle } from "~/admin/components/PublishToggle";
import { SampleBadge } from "~/admin/components/SampleBadge";
import { useToast } from "~/admin/components/Toast";
import { Button } from "~/components/common/Button";
import { useFormDraft } from "~/hooks/useFormDraft";
import { pageSectionSchema } from "~/lib/validation/pageSection";
import { markConfirmed, updateRow } from "~/services/admin/crud";
import { toFriendlyError } from "~/services/admin/errors";
import type { SectionField } from "~/admin/lib/sectionLabels";
import type { MediaRow, Row } from "~/types/db-helpers";

type SectionRow = Row<"page_sections">;

/** What the form edits. JSON-serialisable, so a draft can be kept. */
export type SectionFormValues = {
  eyebrow: string;
  heading: string;
  body: string;
  ctaLabel: string;
  ctaHref: string;
  mediaId: string | null;
  isPublished: boolean;
};

type TextField = "eyebrow" | "heading" | "body" | "ctaLabel" | "ctaHref";
type FieldErrors = Partial<Record<TextField, string>>;

/** The form values for a saved row (null text becomes an empty field). */
export function sectionFormValues(row: SectionRow): SectionFormValues {
  return {
    eyebrow: row.eyebrow ?? "",
    heading: row.heading ?? "",
    body: row.body ?? "",
    ctaLabel: row.cta_label ?? "",
    ctaHref: row.cta_href ?? "",
    mediaId: row.media_id,
    isPublished: row.is_published,
  };
}

type SectionEditorProps = {
  row: SectionRow;
  /** The section's human name, e.g. "Top banner (hero)". */
  label: string;
  /** Every photo in the library, to show the one this section uses. */
  media: MediaRow[];
  /** `cover` photos must be at least 800 px (large banner photos). */
  imagePurpose: "cover" | "gallery";
  /** The fields the website uses for this section; null when it uses none. */
  fields: SectionField[] | null;
  defaultOpen?: boolean;
  /**
   * Called when this section gains or loses unsaved edits. A router allows one
   * leave-prompt blocker at a time, so the page (not each section) holds it.
   */
  onDirtyChange?: (id: string, dirty: boolean) => void;
};

/**
 * One collapsible, separately saved section of a page: text, button, photo and
 * the publish switch. Unsaved edits are kept as a draft on this device and the
 * owner is asked before leaving the page.
 */
export function SectionEditor({
  row: initialRow,
  label,
  media,
  imagePurpose,
  fields,
  defaultOpen = false,
  onDirtyChange,
}: SectionEditorProps) {
  const toast = useToast();
  const uid = useId();
  const panelId = `${uid}-panel`;

  const [row, setRow] = useState(initialRow);
  const [values, setValues] = useState(() => sectionFormValues(initialRow));
  // The owner's own choice wins; until then a section with a kept draft is open.
  const [chosen, setChosen] = useState<boolean | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [errorTick, setErrorTick] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Photos known to this editor: the library, plus any picked or uploaded here.
  const [library, setLibrary] = useState(media);
  const formRef = useRef<HTMLFormElement>(null);
  const messageRef = useRef<HTMLParagraphElement>(null);
  const offered = (field: SectionField) => fields?.includes(field) ?? false;

  const saved = useMemo(() => sectionFormValues(row), [row]);
  const isDirty = JSON.stringify(values) !== JSON.stringify(saved);

  const { clear, restored } = useFormDraft(
    `page-section:${initialRow.id}`,
    values,
    (draft) =>
      // A draft may name a photo that no longer exists: drop it, not the rest.
      setValues({
        ...draft,
        mediaId:
          draft.mediaId && library.some((m) => m.id === draft.mediaId)
            ? draft.mediaId
            : null,
      }),
  );

  // Report dirtiness to the page, and clear it when this editor goes away.
  const rowId = initialRow.id;
  useEffect(() => {
    onDirtyChange?.(rowId, isDirty);
    return () => onDirtyChange?.(rowId, false);
  }, [onDirtyChange, rowId, isDirty]);

  const open = chosen ?? (defaultOpen || restored);

  // A failure message takes focus, so keyboard and screen reader users hear it.
  useEffect(() => {
    if (message) messageRef.current?.focus();
  }, [message]);

  // After a failed check, move to the first field that needs attention.
  useEffect(() => {
    if (errorTick === 0) return;
    formRef.current
      ?.querySelector<HTMLElement>('[aria-invalid="true"]')
      ?.focus();
  }, [errorTick]);

  const photo = library.find((m) => m.id === values.mediaId) ?? null;

  function setText(field: TextField, value: string) {
    setValues((v) => ({ ...v, [field]: value }));
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }));
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    setMessage(null);
    const parsed = pageSectionSchema.safeParse(values);
    if (!parsed.success) {
      const next: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as TextField;
        next[field] ??= issue.message;
      }
      setErrors(next);
      setErrorTick((n) => n + 1);
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      // Only the offered fields are sent: the others keep what is stored.
      const updated = await updateRow("page_sections", row.id, {
        is_published: values.isPublished,
        ...(offered("eyebrow") ? { eyebrow: parsed.data.eyebrow } : {}),
        ...(offered("heading") ? { heading: parsed.data.heading } : {}),
        ...(offered("body") ? { body: parsed.data.body } : {}),
        ...(offered("button")
          ? {
              cta_label: parsed.data.ctaLabel,
              cta_href: parsed.data.ctaHref,
            }
          : {}),
        ...(offered("photo") ? { media_id: values.mediaId } : {}),
      });
      const next = sectionFormValues(updated);
      setRow(updated);
      setValues(next);
      clear(next);
      toast.success(`${label} saved.`);
    } catch (e) {
      setMessage(toFriendlyError(e, { entity: "section" }).friendly);
    } finally {
      setBusy(false);
    }
  }

  async function handleConfirm() {
    setBusy(true);
    setMessage(null);
    try {
      await markConfirmed("page_sections", row.id);
      // Only the flag changes: edits in the form stay as they are.
      setRow((r) => ({ ...r, is_sample: false }));
      toast.success(`${label} marked as confirmed.`);
    } catch (e) {
      setMessage(toFriendlyError(e, { entity: "section" }).friendly);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-cream-100 bg-white">
      <h2 className="font-serif text-xl font-bold text-forest-900">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setChosen(!open)}
          className="flex min-h-14 w-full flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl px-5 py-3 text-left"
        >
          <ChevronDown
            aria-hidden="true"
            className={`size-5 shrink-0 transition-transform duration-200 motion-reduce:transition-none ${
              open ? "rotate-180" : ""
            }`}
          />
          <span className="flex-1">{label}</span>
          <span className="font-sans text-sm font-semibold text-ink-600">
            <span className="sr-only">: </span>
            {row.is_published ? "On website" : "Hidden"}
            {row.is_sample ? " · Not confirmed yet" : ""}
            {isDirty ? " · Unsaved changes" : ""}
          </span>
        </button>
      </h2>

      <div
        id={panelId}
        role="region"
        aria-label={label}
        hidden={!open}
        className="border-t border-cream-100 px-5 py-6"
      >
        {restored ? (
          <p role="status" className="mb-5 font-semibold text-earth-700">
            We restored your unsaved changes from this device. Save to keep
            them.
          </p>
        ) : null}
        {row.is_sample ? (
          <div className="mb-5 flex flex-col gap-2">
            <SampleBadge
              onConfirm={() => void handleConfirm()}
              disabled={busy}
            />
            <p className="max-w-xl text-sm text-ink-600">
              After you&apos;ve checked this text, press Mark as confirmed to
              remove the Sample label on the website.
            </p>
          </div>
        ) : null}
        {fields === null ? (
          <p className="mb-5 text-ink-600">
            The website doesn&apos;t use this section.
          </p>
        ) : null}

        <form
          ref={formRef}
          noValidate
          onSubmit={(e) => void handleSave(e)}
          className="flex flex-col gap-5"
        >
          <PublishToggle
            checked={values.isPublished}
            onChange={(isPublished) =>
              setValues((v) => ({ ...v, isPublished }))
            }
          />

          {offered("eyebrow") ? (
            <FormField
              label="Small heading above the title"
              name="eyebrow"
              error={errors.eyebrow}
            >
              <input
                type="text"
                value={values.eyebrow}
                onChange={(e) => setText("eyebrow", e.target.value)}
                className={CONTROL_CLASS}
              />
            </FormField>
          ) : null}

          {offered("heading") ? (
            <FormField label="Title" name="heading" error={errors.heading}>
              <input
                type="text"
                value={values.heading}
                onChange={(e) => setText("heading", e.target.value)}
                className={CONTROL_CLASS}
              />
            </FormField>
          ) : null}

          {offered("body") ? (
            <FormField label="Text" name="body" error={errors.body}>
              <textarea
                rows={6}
                value={values.body}
                onChange={(e) => setText("body", e.target.value)}
                className={CONTROL_CLASS}
              />
            </FormField>
          ) : null}

          {offered("button") ? (
            <div className="grid gap-5 sm:grid-cols-2">
              <FormField
                label="Button label"
                name="ctaLabel"
                error={errors.ctaLabel}
              >
                <input
                  type="text"
                  value={values.ctaLabel}
                  onChange={(e) => setText("ctaLabel", e.target.value)}
                  className={CONTROL_CLASS}
                />
              </FormField>
              <FormField
                label="Button link"
                name="ctaHref"
                error={errors.ctaHref}
                hint="A page on this site, like /visit, or a full address starting with https://"
              >
                <input
                  type="text"
                  value={values.ctaHref}
                  onChange={(e) => setText("ctaHref", e.target.value)}
                  className={CONTROL_CLASS}
                />
              </FormField>
            </div>
          ) : null}

          {offered("photo") ? (
            <div role="group" aria-labelledby={`${uid}-photo`}>
              <p
                id={`${uid}-photo`}
                className="mb-1.5 text-sm font-semibold text-ink-900"
              >
                Photo
              </p>
              <ImagePicker
                value={photo}
                purpose={imagePurpose}
                clearable
                onChange={(picked) => {
                  if (picked)
                    setLibrary((cur) =>
                      cur.some((m) => m.id === picked.id)
                        ? cur
                        : [...cur, picked],
                    );
                  setValues((v) => ({ ...v, mediaId: picked?.id ?? null }));
                }}
              />
            </div>
          ) : null}

          {message ? (
            <p
              ref={messageRef}
              tabIndex={-1}
              role="alert"
              className="font-semibold text-red-700 focus:outline-none"
            >
              {message}
            </p>
          ) : null}

          <div>
            <Button type="submit" disabled={busy || !isDirty}>
              Save changes
            </Button>
          </div>
        </form>
      </div>
    </section>
  );
}
