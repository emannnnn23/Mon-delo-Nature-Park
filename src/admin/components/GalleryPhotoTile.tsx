import { Trash2 } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";

import { CONTROL_CLASS, FormField } from "~/admin/components/FormField";
import { PublishToggle } from "~/admin/components/PublishToggle";
import { ReorderButtons } from "~/admin/components/ReorderButtons";
import { SampleBadge } from "~/admin/components/SampleBadge";
import { HIDDEN_CATEGORY_HINT, categoryLabel } from "~/admin/lib/categoryLabel";
import { mediaPreviewUrl } from "~/admin/lib/mediaImage";
import { Button } from "~/components/common/Button";
import { useFormDraft } from "~/hooks/useFormDraft";
import { galleryImageSchema } from "~/lib/validation/gallery";
import type { MediaRow, Row } from "~/types/db-helpers";

type GalleryImageRow = Row<"gallery_images">;
type CategoryRow = Row<"gallery_categories">;

/** Whether the homepage will really show a photo marked for it. */
export type HomepageState = "shown" | "not-shown" | null;

type GalleryPhotoTileProps = {
  image: GalleryImageRow;
  /** The photo in the library, or undefined while it is not loaded. */
  media: MediaRow | undefined;
  /** Position in the grid being shown, from 1. */
  number: number;
  total: number;
  categories: CategoryRow[];
  homepage: HomepageState;
  busy: boolean;
  /** Saves the caption and resolves to the saved text, or null if it failed. */
  onSaveCaption: (
    image: GalleryImageRow,
    caption: string,
  ) => Promise<string | null>;
  onDirtyChange: (id: string, dirty: boolean) => void;
  onCategory: (image: GalleryImageRow, categoryId: string | null) => void;
  onFeatured: (image: GalleryImageRow, next: boolean) => void;
  onPublish: (image: GalleryImageRow, next: boolean) => void;
  onMove: (image: GalleryImageRow, direction: "up" | "down") => void;
  onDelete: (image: GalleryImageRow) => void;
  onConfirm: (image: GalleryImageRow) => void;
};

/**
 * One photo of the gallery: thumbnail, caption (saved with its own button),
 * category, the homepage and website switches, order and delete. The caption
 * is kept as a draft on this device until it is saved.
 */
export function GalleryPhotoTile({
  image,
  media,
  number,
  total,
  categories,
  homepage,
  busy,
  onSaveCaption,
  onDirtyChange,
  onCategory,
  onFeatured,
  onPublish,
  onMove,
  onDelete,
  onConfirm,
}: GalleryPhotoTileProps) {
  const saved = image.caption ?? "";
  const [caption, setCaption] = useState(saved);
  const [error, setError] = useState<string | undefined>(undefined);
  const { clear } = useFormDraft(
    `gallery-caption:${image.id}`,
    { caption },
    (draft) => setCaption(draft.caption),
  );

  const dirty = caption !== saved;
  useEffect(() => {
    onDirtyChange(image.id, dirty);
  }, [onDirtyChange, image.id, dirty]);

  const name = saved.trim() || media?.alt_text || `Photo ${number}`;

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    const parsed = galleryImageSchema.safeParse({
      caption,
      categoryId: image.category_id,
      isFeatured: image.is_featured,
      isPublished: image.is_published,
    });
    if (!parsed.success) {
      // Never save past a failed check. A caption problem is the owner's to
      // fix; anything else is about the stored photo, not what was typed.
      const issue = parsed.error.issues.find((i) => i.path[0] === "caption");
      setError(
        issue?.message ??
          "This photo couldn't be saved. Please reload the page and try again.",
      );
      document.getElementById(`caption-${image.id}`)?.focus();
      return;
    }
    setError(undefined);
    const next = await onSaveCaption(image, caption.trim());
    if (next === null) return;
    setCaption(next);
    clear({ caption: next });
  }

  return (
    <li>
      <div
        role="group"
        aria-label={name}
        tabIndex={-1}
        data-tile-id={image.id}
        className="flex h-full flex-col gap-3 rounded-2xl border border-cream-100 bg-white p-4 focus:outline-none"
      >
        {media ? (
          <img
            src={mediaPreviewUrl(media, 480)}
            alt={media.alt_text}
            loading="lazy"
            className="aspect-[4/3] w-full rounded-xl border border-cream-100 bg-cream-100 object-cover"
          />
        ) : (
          <div className="flex aspect-[4/3] w-full items-center justify-center rounded-xl border border-dashed border-earth-600/50 bg-ivory-50 text-sm text-ink-600">
            Photo {number}
          </div>
        )}

        {image.is_featured || image.is_sample ? (
          <div className="flex flex-wrap items-center gap-3">
            {homepage === "shown" ? (
              <span className="text-sm font-semibold text-earth-700">
                On the homepage
              </span>
            ) : homepage === "not-shown" ? (
              <span className="text-sm font-semibold text-ink-600">
                Featured — not shown yet
              </span>
            ) : null}
            {image.is_sample ? (
              <SampleBadge disabled={busy} onConfirm={() => onConfirm(image)} />
            ) : null}
          </div>
        ) : null}

        <form
          onSubmit={(e) => void handleSave(e)}
          className="flex flex-col gap-2"
        >
          <FormField
            label={`Caption for photo ${number}`}
            name={`caption-${image.id}`}
            error={error}
          >
            <input
              id={`caption-${image.id}`}
              type="text"
              value={caption}
              onChange={(e) => {
                setCaption(e.target.value);
                setError(undefined);
              }}
              className={CONTROL_CLASS}
            />
          </FormField>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="submit"
              variant="outline-dark"
              aria-label={`Save caption for photo ${number}`}
              disabled={busy || !dirty}
            >
              Save caption
            </Button>
            {dirty ? (
              <span className="text-sm font-semibold text-earth-700">
                Unsaved
              </span>
            ) : null}
          </div>
        </form>

        <FormField
          label={`Category for photo ${number}`}
          name="category"
          hint={
            categories.some(
              (c) => c.id === image.category_id && !c.is_published,
            )
              ? HIDDEN_CATEGORY_HINT
              : undefined
          }
        >
          <select
            value={image.category_id ?? ""}
            disabled={busy}
            onChange={(e) => onCategory(image, e.target.value || null)}
            className={CONTROL_CLASS}
          >
            <option value="">No category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {categoryLabel(c)}
              </option>
            ))}
          </select>
        </FormField>

        <div className="flex flex-col items-start gap-1">
          <PublishToggle
            label={`Show photo ${number} on homepage`}
            checked={image.is_featured}
            disabled={busy}
            onChange={(next) => onFeatured(image, next)}
          />
          <PublishToggle
            label={`Publish photo ${number} on website`}
            checked={image.is_published}
            disabled={busy}
            onChange={(next) => onPublish(image, next)}
          />
        </div>

        <div className="mt-auto flex flex-wrap items-center gap-3">
          <ReorderButtons
            horizontal
            label={`photo ${number}`}
            disableUp={busy || number === 1}
            disableDown={busy || number === total}
            onUp={() => onMove(image, "up")}
            onDown={() => onMove(image, "down")}
          />
          <button
            type="button"
            aria-label={`Delete photo ${number}`}
            disabled={busy}
            onClick={() => onDelete(image)}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-red-700 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Trash2 aria-hidden="true" className="size-4" />
            Delete
          </button>
        </div>
      </div>
    </li>
  );
}
