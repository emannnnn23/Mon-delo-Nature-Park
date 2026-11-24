import { useEffect, useRef, useState, type FormEvent } from "react";

import { AdminModal } from "~/admin/components/AdminModal";
import { CONTROL_CLASS, FormField } from "~/admin/components/FormField";
import { Button } from "~/components/common/Button";
import { SLUG_MAX } from "~/lib/validation/attraction";
import {
  galleryCategorySchema,
  type GalleryCategoryInput,
} from "~/lib/validation/gallery";
import { toFriendlyError } from "~/services/admin/errors";
import type { Row } from "~/types/db-helpers";
import { slugify } from "~/utils/slug";

type CategoryRow = Row<"gallery_categories">;

export const CATEGORY_SLUG_TAKEN =
  "That web address is already used by another category.";

type Field = "name" | "slug";

type GalleryCategoryDialogProps = {
  /** The category being edited, or null to add a new one. */
  category: CategoryRow | null;
  onClose: () => void;
  /** Saves the checked values. It throws on failure; the dialog explains. */
  onSave: (values: GalleryCategoryInput) => Promise<void>;
};

/** A web address from a name, empty while there is no name yet. */
function addressFor(name: string): string {
  return name.trim() === "" ? "" : slugify(name, SLUG_MAX);
}

/**
 * Add or rename a gallery category. The web address follows the name until
 * the owner types in it (a saved category keeps its address). Whether the
 * category is on the website is switched in the list, not here.
 */
export function GalleryCategoryDialog({
  category,
  onClose,
  onSave,
}: GalleryCategoryDialogProps) {
  const [name, setName] = useState(category?.name ?? "");
  const [slug, setSlug] = useState(category?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(category !== null);
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [errorTick, setErrorTick] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const messageRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (errorTick === 0) return;
    formRef.current
      ?.querySelector<HTMLElement>('[aria-invalid="true"]')
      ?.focus();
  }, [errorTick]);

  useEffect(() => {
    if (message) messageRef.current?.focus();
  }, [message]);

  function changeName(next: string) {
    setName(next);
    if (!slugTouched) setSlug(addressFor(next));
    setErrors((e) => ({
      ...e,
      name: undefined,
      ...(slugTouched ? {} : { slug: undefined }),
    }));
  }

  function changeSlug(next: string) {
    setSlug(next);
    // Emptying the address hands it back to the name.
    setSlugTouched(next.trim() !== "");
    setErrors((e) => ({ ...e, slug: undefined }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setMessage(null);
    const parsed = galleryCategorySchema.safeParse({
      name,
      slug,
      isPublished: category?.is_published ?? false,
    });
    if (!parsed.success) {
      const next: Partial<Record<Field, string>> = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as Field;
        next[field] ??= issue.message;
      }
      setErrors(next);
      setErrorTick((n) => n + 1);
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      await onSave(parsed.data);
    } catch (e) {
      const friendly = toFriendlyError(e, { entity: "category" });
      if (friendly.code === "23505") {
        setErrors({ slug: CATEGORY_SLUG_TAKEN });
        setErrorTick((n) => n + 1);
      } else {
        setMessage(friendly.friendly);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminModal
      title={category ? "Edit category" : "Add category"}
      busy={busy}
      onClose={onClose}
    >
      <form
        ref={formRef}
        noValidate
        onSubmit={(e) => void handleSubmit(e)}
        className="flex flex-col gap-5"
      >
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
        <FormField label="Name" name="name" error={errors.name}>
          <input
            type="text"
            value={name}
            onChange={(e) => changeName(e.target.value)}
            className={CONTROL_CLASS}
          />
        </FormField>
        <FormField
          label="Web address"
          name="slug"
          hint="Lowercase letters, numbers and hyphens. Made from the name unless you change it."
          error={errors.slug}
        >
          <input
            type="text"
            value={slug}
            onChange={(e) => changeSlug(e.target.value)}
            className={CONTROL_CLASS}
          />
        </FormField>
        <div className="flex flex-wrap gap-3">
          <Button type="submit" disabled={busy}>
            Save
          </Button>
          <Button
            type="button"
            variant="outline-dark"
            disabled={busy}
            onClick={onClose}
          >
            Cancel
          </Button>
        </div>
      </form>
    </AdminModal>
  );
}
