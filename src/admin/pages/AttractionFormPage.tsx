import { ArrowLeft } from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { Link, useNavigate } from "react-router";

import { AttractionPhotos } from "~/admin/components/AttractionPhotos";
import { CONTROL_CLASS, FormField } from "~/admin/components/FormField";
import { IconPicker } from "~/admin/components/IconPicker";
import { ImagePicker } from "~/admin/components/ImagePicker";
import { PublishToggle } from "~/admin/components/PublishToggle";
import { SampleBadge } from "~/admin/components/SampleBadge";
import { useToast } from "~/admin/components/Toast";
import { useUnsavedChanges } from "~/admin/hooks/useUnsavedChanges";
import { Button } from "~/components/common/Button";
import { useFormDraft } from "~/hooks/useFormDraft";
import {
  SLUG_MAX,
  SUMMARY_MAX,
  attractionSchema,
  characterCount,
  type AttractionInput,
} from "~/lib/validation/attraction";
import {
  insertRow,
  markConfirmed,
  nextSortOrder,
  updateRow,
} from "~/services/admin/crud";
import { toFriendlyError } from "~/services/admin/errors";
import type { AttractionIcon, AttractionKind } from "~/types/content";
import type { MediaRow, Row } from "~/types/db-helpers";
import { shortId, slugify } from "~/utils/slug";

type AttractionRow = Row<"attractions">;

/** What the form edits. JSON-serialisable, so a draft can be kept. */
export type AttractionFormValues = {
  name: string;
  slug: string;
  /** True once the owner has typed in the web address: it stops following the name. */
  slugTouched: boolean;
  summary: string;
  description: string;
  icon: AttractionIcon | null;
  coverMediaId: string | null;
  isFeatured: boolean;
  isPublished: boolean;
};

type TextField = "name" | "slug" | "summary" | "description" | "icon";
type FieldErrors = Partial<Record<TextField, string>>;

const SLUG_TAKEN = "That web address is already used by another attraction.";

/** The form values for a saved row, or an empty form for a new one. */
export function attractionFormValues(
  row: AttractionRow | null,
): AttractionFormValues {
  return {
    name: row?.name ?? "",
    slug: row?.slug ?? "",
    // A saved attraction keeps its address even when the name changes.
    slugTouched: row !== null,
    summary: row?.summary ?? "",
    description: row?.description ?? "",
    icon: (row?.icon as AttractionIcon | null | undefined) ?? null,
    coverMediaId: row?.cover_media_id ?? null,
    isFeatured: row?.is_featured ?? false,
    isPublished: row?.is_published ?? false,
  };
}

/** A web address from a name, empty while there is no name yet. */
function addressFor(name: string): string {
  return name.trim() === "" ? "" : slugify(name, SLUG_MAX);
}

type AttractionFormPageProps = {
  /** The saved attraction or experience, or null to create a new one. */
  row: AttractionRow | null;
  /** What a new one is. A saved row uses its own kind. */
  kind: AttractionKind;
  /** Every photo in the library. */
  media: MediaRow[];
  /** The extra photos of a saved attraction. */
  images: Row<"attraction_images">[];
};

/**
 * Create or edit one attraction or experience. An attraction has its own page
 * on the website, so it has an address, a description, extra photos and the
 * homepage switch. An experience is only a small card, so it has a name, a
 * summary, an icon and a photo. Columns the form does not offer are never sent,
 * so they keep whatever is stored.
 */
export function AttractionFormPage({
  row: initialRow,
  kind: newKind,
  media,
  images,
}: AttractionFormPageProps) {
  const toast = useToast();
  const navigate = useNavigate();
  const uid = useId();

  const [row, setRow] = useState(initialRow);
  const kind: AttractionKind =
    (row?.kind as AttractionKind | undefined) ?? newKind;
  const isAttraction = kind === "attraction";
  const noun = isAttraction ? "attraction" : "experience";

  const [values, setValues] = useState(() => attractionFormValues(initialRow));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [errorTick, setErrorTick] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Set once a new one is saved: the form is no longer dirty and we move on.
  const [destination, setDestination] = useState<string | null>(null);
  const [captionsDirty, setCaptionsDirty] = useState(false);
  const [library, setLibrary] = useState(media);
  const formRef = useRef<HTMLFormElement>(null);
  const messageRef = useRef<HTMLParagraphElement>(null);

  const saved = useMemo(() => attractionFormValues(row), [row]);
  const isDirty = JSON.stringify(values) !== JSON.stringify(saved);

  const { clear, restored } = useFormDraft(
    row ? `attraction:${row.id}` : `attraction:new:${kind}`,
    values,
    (draft) =>
      // A draft may name a photo that no longer exists: drop it, not the rest.
      setValues({
        ...draft,
        coverMediaId:
          draft.coverMediaId && library.some((m) => m.id === draft.coverMediaId)
            ? draft.coverMediaId
            : null,
      }),
  );

  // One leave prompt for the whole page (a router allows one blocker).
  const { leaveDialog } = useUnsavedChanges(
    (isDirty || captionsDirty) && destination === null,
  );

  useEffect(() => {
    if (destination !== null) void navigate(destination);
  }, [destination, navigate]);

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

  const cover = library.find((m) => m.id === values.coverMediaId) ?? null;
  const summaryCount = characterCount(values.summary);

  function clearError(field: TextField) {
    setErrors((e) => (e[field] ? { ...e, [field]: undefined } : e));
  }

  function setName(name: string) {
    setValues((v) => ({
      ...v,
      name,
      slug: v.slugTouched ? v.slug : addressFor(name),
    }));
    clearError("name");
    if (!values.slugTouched) clearError("slug");
  }

  function setSlug(slug: string) {
    // Emptying the address hands it back to the name.
    setValues((v) => ({
      ...v,
      slug,
      slugTouched: slug.trim() !== "",
    }));
    clearError("slug");
  }

  function setText(field: "summary" | "description", value: string) {
    setValues((v) => ({ ...v, [field]: value }));
    clearError(field);
  }

  const handleCaptionsDirty = useCallback(
    (dirty: boolean) => setCaptionsDirty(dirty),
    [],
  );

  async function create(parsed: AttractionInput) {
    const sort_order = await nextSortOrder("attractions", { kind });
    const common = {
      kind,
      name: parsed.name,
      summary: parsed.summary,
      icon: parsed.icon,
      cover_media_id: values.coverMediaId,
      is_published: parsed.isPublished,
      is_sample: false,
      sort_order,
    };
    if (isAttraction) {
      return insertRow("attractions", {
        ...common,
        slug: parsed.slug,
        description: parsed.description,
        is_featured: parsed.isFeatured,
      });
    }
    // An experience has no page, so its address is made from its name. If
    // that is taken, a short suffix makes it unique.
    const base = slugify(parsed.name, SLUG_MAX);
    try {
      return await insertRow("attractions", { ...common, slug: base });
    } catch (e) {
      if (toFriendlyError(e, { entity: noun }).code !== "23505") throw e;
      const suffix = shortId();
      const head = base.slice(0, SLUG_MAX - suffix.length - 1);
      return insertRow("attractions", {
        ...common,
        slug: `${head.replace(/-+$/g, "")}-${suffix}`,
      });
    }
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    setMessage(null);
    // Only what is offered for this kind is checked.
    const parsed = attractionSchema.safeParse({
      kind,
      name: values.name,
      slug: isAttraction ? values.slug : "",
      summary: values.summary,
      description: isAttraction ? values.description : "",
      icon: values.icon,
      isFeatured: isAttraction ? values.isFeatured : false,
      isPublished: values.isPublished,
    });
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
      const data = parsed.data;
      if (row === null) {
        const created = await create(data);
        const next = attractionFormValues(created);
        setValues(next);
        clear(next);
        toast.success(
          isAttraction
            ? `${created.name} added. You can now add more photos.`
            : `${created.name} added.`,
        );
        setDestination(
          isAttraction
            ? `/admin/attractions/${created.id}`
            : "/admin/attractions?kind=experience",
        );
        return;
      }
      // Only the offered columns are sent: the others keep what is stored.
      const updated = await updateRow("attractions", row.id, {
        name: data.name,
        summary: data.summary,
        icon: data.icon,
        cover_media_id: values.coverMediaId,
        is_published: data.isPublished,
        ...(isAttraction
          ? {
              slug: data.slug,
              description: data.description,
              is_featured: data.isFeatured,
            }
          : {}),
      });
      const next = attractionFormValues(updated);
      setRow(updated);
      setValues(next);
      clear(next);
      toast.success("Saved.");
    } catch (e) {
      const friendly = toFriendlyError(e, { entity: noun });
      if (friendly.code === "23505" && isAttraction) {
        setErrors({ slug: SLUG_TAKEN });
        setErrorTick((n) => n + 1);
      } else {
        setMessage(friendly.friendly);
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleConfirm() {
    if (!row) return;
    setBusy(true);
    setMessage(null);
    try {
      await markConfirmed("attractions", row.id);
      // Only the flag changes: edits in the form stay as they are.
      setRow((r) => (r ? { ...r, is_sample: false } : r));
      toast.success(`${row.name} marked as confirmed.`);
    } catch (e) {
      setMessage(toFriendlyError(e, { entity: noun }).friendly);
    } finally {
      setBusy(false);
    }
  }

  const title = `${row ? "Edit" : "Add"} ${noun}`;

  return (
    <section aria-labelledby="attraction-form-title">
      <Link
        to={
          isAttraction
            ? "/admin/attractions"
            : "/admin/attractions?kind=experience"
        }
        className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-forest-900 underline-offset-4 hover:underline"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        All {isAttraction ? "attractions" : "experiences"}
      </Link>
      <h1
        id="attraction-form-title"
        className="mt-2 font-serif text-3xl font-bold text-forest-900"
      >
        {title}
      </h1>
      <p className="mt-3 max-w-xl text-ink-600">
        {isAttraction
          ? "An attraction has its own page on the website."
          : "An experience is a small card with an icon on the Discover page."}{" "}
        {row
          ? "It is only shown to visitors while it is switched on."
          : "It stays hidden until you switch it on."}
      </p>

      {restored ? (
        <p role="status" className="mt-5 font-semibold text-earth-700">
          We restored your unsaved changes from this device. Save to keep them.
        </p>
      ) : null}
      {row?.is_sample ? (
        <div className="mt-5 flex flex-col gap-2">
          <SampleBadge onConfirm={() => void handleConfirm()} disabled={busy} />
          <p className="max-w-xl text-sm text-ink-600">
            After you&apos;ve checked this text, press Mark as confirmed to
            remove the Sample label on the website.
          </p>
        </div>
      ) : null}

      <form
        ref={formRef}
        noValidate
        onSubmit={(e) => void handleSave(e)}
        className="mt-8 flex max-w-3xl flex-col gap-6"
      >
        <PublishToggle
          checked={values.isPublished}
          onChange={(isPublished) => setValues((v) => ({ ...v, isPublished }))}
        />

        <FormField label="Name" name="name" error={errors.name}>
          <input
            type="text"
            value={values.name}
            onChange={(e) => setName(e.target.value)}
            className={CONTROL_CLASS}
          />
        </FormField>

        {isAttraction ? (
          <FormField
            label="Web address"
            name="slug"
            error={errors.slug}
            hint="The end of this attraction's page address on the website, such as hilltop-view-deck. Made from the name until you change it. Changing it later breaks old links to the page."
          >
            <input
              type="text"
              value={values.slug}
              onChange={(e) => setSlug(e.target.value)}
              autoCapitalize="none"
              spellCheck={false}
              className={CONTROL_CLASS}
            />
          </FormField>
        ) : null}

        <FormField
          label="Short summary"
          name="summary"
          error={errors.summary}
          hint="One or two sentences shown on the card."
        >
          {(props) => {
            const counterId = `${uid}-summary-count`;
            return (
              <>
                <textarea
                  {...props}
                  aria-describedby={[props["aria-describedby"], counterId]
                    .filter(Boolean)
                    .join(" ")}
                  rows={3}
                  value={values.summary}
                  onChange={(e) => setText("summary", e.target.value)}
                  className={CONTROL_CLASS}
                />
                <p
                  id={counterId}
                  className={`mt-1 text-sm ${
                    summaryCount > SUMMARY_MAX
                      ? "font-semibold text-red-700"
                      : "text-ink-600"
                  }`}
                >
                  {summaryCount} of {SUMMARY_MAX} characters
                </p>
              </>
            );
          }}
        </FormField>

        {isAttraction ? (
          <FormField
            label="Description"
            name="description"
            error={errors.description}
            optional
            hint="Shown on the attraction's own page. Leave a blank line between paragraphs."
          >
            <textarea
              rows={8}
              value={values.description}
              onChange={(e) => setText("description", e.target.value)}
              className={CONTROL_CLASS}
            />
          </FormField>
        ) : null}

        <FormField
          label="Icon"
          name="icon"
          error={errors.icon}
          optional={isAttraction}
        >
          {(props) => (
            <IconPicker
              {...props}
              label="Icon"
              allowNone={isAttraction}
              value={values.icon}
              onChange={(icon) => {
                setValues((v) => ({ ...v, icon }));
                clearError("icon");
              }}
            />
          )}
        </FormField>

        <div role="group" aria-labelledby={`${uid}-cover`}>
          <p
            id={`${uid}-cover`}
            className="mb-1.5 text-sm font-semibold text-ink-900"
          >
            {isAttraction ? "Main photo" : "Card photo"}
          </p>
          <ImagePicker
            value={cover}
            purpose={isAttraction ? "cover" : "gallery"}
            clearable
            onChange={(picked) => {
              if (picked)
                setLibrary((cur) =>
                  cur.some((m) => m.id === picked.id) ? cur : [...cur, picked],
                );
              setValues((v) => ({ ...v, coverMediaId: picked?.id ?? null }));
            }}
          />
        </div>

        {isAttraction ? (
          <div>
            <PublishToggle
              label="Show on homepage"
              checked={values.isFeatured}
              onChange={(isFeatured) =>
                setValues((v) => ({ ...v, isFeatured }))
              }
            />
            <p className="mt-0.5 max-w-xl text-sm text-ink-600">
              The homepage shows up to 3 featured attractions, in the order of
              the list.
            </p>
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
          <Button type="submit" disabled={busy}>
            Save
          </Button>
        </div>
      </form>

      {isAttraction ? (
        row ? (
          <AttractionPhotos
            attractionId={row.id}
            images={images}
            media={library}
            onDirtyChange={handleCaptionsDirty}
          />
        ) : (
          <section aria-labelledby="attraction-photos-title" className="mt-12">
            <h2
              id="attraction-photos-title"
              className="font-serif text-2xl font-bold text-forest-900"
            >
              More photos
            </h2>
            <p className="mt-2 max-w-xl text-ink-600">
              Save the attraction first, then you can add more photos here.
            </p>
          </section>
        )
      ) : null}
      {leaveDialog}
    </section>
  );
}
