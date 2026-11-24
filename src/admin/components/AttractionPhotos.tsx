import { Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { AdminModal } from "~/admin/components/AdminModal";
import { ConfirmDialog } from "~/admin/components/ConfirmDialog";
import { CONTROL_CLASS, FormField } from "~/admin/components/FormField";
import { MediaUploader } from "~/admin/components/MediaUploader";
import { ReorderButtons } from "~/admin/components/ReorderButtons";
import { useToast } from "~/admin/components/Toast";
import { mediaPreviewUrl } from "~/admin/lib/mediaImage";
import { applySwap, neighbour, sortRows } from "~/admin/lib/reorder";
import { Button } from "~/components/common/Button";
import { useFormDraft } from "~/hooks/useFormDraft";
import {
  deleteRow,
  insertRow,
  nextSortOrder,
  swapOrder,
  updateRow,
} from "~/services/admin/crud";
import { toFriendlyError } from "~/services/admin/errors";
import type { MediaRow, Row } from "~/types/db-helpers";

type ImageRow = Row<"attraction_images">;

type AttractionPhotosProps = {
  attractionId: string;
  images: ImageRow[];
  /** Every photo in the library, to show the ones attached here. */
  media: MediaRow[];
  /** Called when a caption gains or loses unsaved edits (for the leave prompt). */
  onDirtyChange?: (dirty: boolean) => void;
};

/** A copy of the edits without one photo's entry. */
function without(
  edits: Record<string, string>,
  id: string,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(edits).filter(([key]) => key !== id),
  );
}

/**
 * The extra photos of one attraction (the ones under the main photo on its
 * page): upload several, give each a caption, change their order, or remove
 * one. Each action is saved straight away; a caption is saved with its own
 * button. Removing a photo only detaches it: it stays in the media library.
 */
export function AttractionPhotos({
  attractionId,
  images: initialImages,
  media,
  onDirtyChange,
}: AttractionPhotosProps) {
  const toast = useToast();
  const [images, setImages] = useState(() => sortRows(initialImages));
  const [library, setLibrary] = useState(media);
  // Captions edited and not yet saved, by photo id. Kept as a draft on this
  // device, like the rest of the form.
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<ImageRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const messageRef = useRef<HTMLParagraphElement>(null);

  const { restored } = useFormDraft(
    `attraction-captions:${attractionId}`,
    edits,
    (draft) =>
      // A draft may name a photo that has since been removed: drop that part.
      setEdits(
        Object.fromEntries(
          Object.entries(draft).filter(([id]) =>
            initialImages.some((i) => i.id === id),
          ),
        ),
      ),
  );

  const dirty = Object.keys(edits).length > 0;
  useEffect(() => {
    onDirtyChange?.(dirty);
    return () => onDirtyChange?.(false);
  }, [onDirtyChange, dirty]);

  useEffect(() => {
    if (message) messageRef.current?.focus();
  }, [message]);

  const captionOf = (image: ImageRow) => edits[image.id] ?? image.caption ?? "";

  function setCaption(image: ImageRow, value: string) {
    setEdits((cur) => {
      // Back to what is saved: nothing to keep.
      if (value === (image.caption ?? "")) return without(cur, image.id);
      return { ...cur, [image.id]: value };
    });
  }

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setMessage(null);
    try {
      await action();
    } catch (e) {
      setMessage(toFriendlyError(e, { entity: "photo" }).friendly);
    } finally {
      setBusy(false);
    }
  }

  function handleUploaded(rows: MediaRow[]) {
    setAdding(false);
    setLibrary((cur) => [
      ...cur,
      ...rows.filter((r) => !cur.some((m) => m.id === r.id)),
    ]);
    void run(async () => {
      const added: ImageRow[] = [];
      try {
        for (const row of rows) {
          const sort_order = await nextSortOrder("attraction_images", {
            attraction_id: attractionId,
          });
          added.push(
            await insertRow("attraction_images", {
              attraction_id: attractionId,
              media_id: row.id,
              sort_order,
            }),
          );
        }
      } finally {
        if (added.length > 0) {
          setImages((cur) => sortRows([...cur, ...added]));
          toast.success(
            added.length === 1
              ? "1 photo added."
              : `${added.length} photos added.`,
          );
        }
      }
    });
  }

  const handleSaveCaption = (image: ImageRow) =>
    run(async () => {
      const updated = await updateRow("attraction_images", image.id, {
        caption: captionOf(image),
      });
      setImages((cur) => cur.map((i) => (i.id === image.id ? updated : i)));
      setEdits((cur) => without(cur, image.id));
      toast.success("Caption saved.");
    });

  const handleReorder = (image: ImageRow, direction: "up" | "down") => {
    const other = neighbour(images, image, direction);
    if (!other) return;
    void run(async () => {
      await swapOrder("attraction_images", image, other);
      setImages((cur) => applySwap(cur, image, other));
    });
  };

  const handleRemove = (image: ImageRow) =>
    run(async () => {
      await deleteRow("attraction_images", image.id);
      setImages((cur) => cur.filter((i) => i.id !== image.id));
      setEdits((cur) => without(cur, image.id));
      toast.success("Photo removed from this attraction.");
    });

  const removingNumber = removing
    ? images.findIndex((i) => i.id === removing.id) + 1
    : 0;

  return (
    <section aria-labelledby="attraction-photos-title" className="mt-12">
      <h2
        id="attraction-photos-title"
        className="font-serif text-2xl font-bold text-forest-900"
      >
        More photos
      </h2>
      <p className="mt-2 max-w-xl text-ink-600">
        Extra photos shown below the main photo on this attraction&apos;s page.
        Changes here are saved straight away.
      </p>
      {restored ? (
        <p role="status" className="mt-3 font-semibold text-earth-700">
          We restored your unsaved captions from this device. Save each one to
          keep it.
        </p>
      ) : null}

      {message ? (
        <p
          ref={messageRef}
          tabIndex={-1}
          role="alert"
          className="mt-4 font-semibold text-red-700 focus:outline-none"
        >
          {message}
        </p>
      ) : null}

      {images.length === 0 ? (
        <p className="mt-5 rounded-xl border border-dashed border-earth-600/50 bg-white px-5 py-8 text-center text-ink-600">
          No extra photos yet.
        </p>
      ) : (
        <ul className="mt-5 flex flex-col gap-4">
          {images.map((image, index) => {
            const number = index + 1;
            const photo = library.find((m) => m.id === image.media_id);
            const edited = image.id in edits;
            return (
              <li
                key={image.id}
                className="flex flex-col gap-4 rounded-2xl border border-cream-100 bg-white p-4 sm:flex-row sm:items-start"
              >
                {photo ? (
                  <img
                    src={mediaPreviewUrl(photo, 480)}
                    alt={photo.alt_text}
                    className="aspect-[4/3] w-full shrink-0 rounded-xl border border-cream-100 bg-cream-100 object-cover sm:w-44"
                  />
                ) : (
                  <div className="flex aspect-[4/3] w-full shrink-0 items-center justify-center rounded-xl border border-dashed border-earth-600/50 bg-ivory-50 text-sm text-ink-600 sm:w-44">
                    Photo {number}
                  </div>
                )}
                <div className="flex min-w-0 flex-1 flex-col gap-3">
                  <FormField
                    label={`Caption for photo ${number}`}
                    name="caption"
                    optional
                  >
                    <input
                      type="text"
                      value={captionOf(image)}
                      onChange={(e) => setCaption(image, e.target.value)}
                      className={CONTROL_CLASS}
                    />
                  </FormField>
                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      type="button"
                      variant="outline-dark"
                      aria-label={`Save caption for photo ${number}`}
                      disabled={busy || !edited}
                      onClick={() => void handleSaveCaption(image)}
                    >
                      Save caption
                    </Button>
                    {edited ? (
                      <span className="text-sm font-semibold text-earth-700">
                        Unsaved
                      </span>
                    ) : null}
                    <ReorderButtons
                      label={`photo ${number}`}
                      disableUp={busy || index === 0}
                      disableDown={busy || index === images.length - 1}
                      onUp={() => handleReorder(image, "up")}
                      onDown={() => handleReorder(image, "down")}
                    />
                    <button
                      type="button"
                      aria-label={`Remove photo ${number}`}
                      disabled={busy}
                      onClick={() => setRemoving(image)}
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-red-700 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Trash2 aria-hidden="true" className="size-4" />
                      Remove
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-5">
        <Button
          type="button"
          variant="outline-dark"
          disabled={busy}
          onClick={() => setAdding(true)}
        >
          Add photos
        </Button>
      </div>

      {adding ? (
        <AdminModal
          title="Add photos"
          busy={uploading}
          onClose={() => setAdding(false)}
        >
          <MediaUploader
            purpose="gallery"
            multiple
            onBusyChange={setUploading}
            onUploaded={handleUploaded}
          />
        </AdminModal>
      ) : null}

      <ConfirmDialog
        open={removing !== null}
        title={`Remove photo ${removingNumber}?`}
        body="It is removed from this attraction only. The photo stays in your media library."
        confirmLabel="Remove"
        destructive
        onCancel={() => setRemoving(null)}
        onConfirm={() => {
          const image = removing;
          setRemoving(null);
          if (image) void handleRemove(image);
        }}
      />
    </section>
  );
}
