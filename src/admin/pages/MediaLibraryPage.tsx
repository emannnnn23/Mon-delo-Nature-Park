import { useEffect, useRef, useState } from "react";

import { AdminModal } from "~/admin/components/AdminModal";
import { CONTROL_CLASS, FormField } from "~/admin/components/FormField";
import { FocalPointPicker } from "~/admin/components/FocalPointPicker";
import { MediaGrid } from "~/admin/components/MediaGrid";
import { MediaUploader } from "~/admin/components/MediaUploader";
import { useToast } from "~/admin/components/Toast";
import { Button } from "~/components/common/Button";
import { toFriendlyError } from "~/services/admin/errors";
import {
  MediaInUseError,
  deleteMedia,
  findMediaUsage,
  updateMedia,
} from "~/services/media";
import type { MediaRow } from "~/types/db-helpers";

type UsageState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; labels: string[] };

const SECONDARY =
  "inline-flex min-h-11 items-center justify-center rounded-full border px-6 py-2.5 text-sm font-semibold transition duration-200 disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none";

type EditorProps = {
  row: MediaRow;
  onClose: () => void;
  onSaved: (row: MediaRow) => void;
  onDeleted: (row: MediaRow) => void;
};

/** Edit one photo: description, focal point, where it is used, delete. */
function MediaEditor({ row, onClose, onSaved, onDeleted }: EditorProps) {
  const toast = useToast();
  const [alt, setAlt] = useState(row.alt_text);
  const [focal, setFocal] = useState({ x: row.focal_x, y: row.focal_y });
  const [altError, setAltError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [usage, setUsage] = useState<UsageState>({ status: "loading" });
  const cancelRef = useRef<HTMLButtonElement>(null);
  const deleteRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let cancelled = false;
    findMediaUsage(row.id).then(
      (labels) => {
        if (!cancelled) setUsage({ status: "ready", labels });
      },
      () => {
        if (!cancelled) setUsage({ status: "error" });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [row.id]);

  // The confirmation takes focus (on its safe choice); cancelling hands it
  // back to the Delete button.
  const wasConfirming = useRef(false);
  useEffect(() => {
    if (confirming) cancelRef.current?.focus();
    else if (wasConfirming.current) deleteRef.current?.focus();
    wasConfirming.current = confirming;
  }, [confirming]);

  const changed =
    alt.trim() !== row.alt_text ||
    focal.x !== row.focal_x ||
    focal.y !== row.focal_y;

  async function handleSave() {
    if (alt.trim() === "") {
      setAltError("Please describe this photo in a few words.");
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const saved = await updateMedia(row.id, {
        altText: alt,
        focalX: focal.x,
        focalY: focal.y,
      });
      toast.success("Photo saved.");
      onSaved(saved);
    } catch (e) {
      setMessage(toFriendlyError(e, { entity: "photo" }).friendly);
      setBusy(false);
    }
  }

  async function handleDelete() {
    setBusy(true);
    setMessage(null);
    try {
      const { storageCleanupFailed } = await deleteMedia(row);
      toast.success("Photo deleted.");
      if (storageCleanupFailed) {
        toast.warning(
          "The photo is deleted, but some of its files could not be removed from storage. They are no longer shown on the website.",
        );
      }
      onDeleted(row);
    } catch (e) {
      setConfirming(false);
      setBusy(false);
      setMessage(
        e instanceof MediaInUseError
          ? e.friendly
          : toFriendlyError(e, { entity: "photo" }).friendly,
      );
    }
  }

  return (
    <AdminModal title="Edit photo" onClose={onClose} wide>
      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <p className="mb-2 text-sm font-semibold text-ink-900">Focal point</p>
          <p className="mb-3 text-sm text-ink-600">
            Click the most important part of the photo. The website keeps it in
            view when the photo is cropped.
          </p>
          <FocalPointPicker
            media={{
              ...row,
              alt_text: alt,
              focal_x: focal.x,
              focal_y: focal.y,
            }}
            onChange={({ focalX, focalY }) =>
              setFocal({ x: focalX, y: focalY })
            }
          />
        </div>

        <div className="flex flex-col gap-5">
          <FormField
            label="Photo description"
            name="alt_text"
            error={altError ?? undefined}
            hint="A few words about what the photo shows, for people who can't see it."
          >
            <input
              type="text"
              value={alt}
              onChange={(e) => {
                setAlt(e.target.value);
                setAltError(null);
              }}
              className={CONTROL_CLASS}
            />
          </FormField>

          <section aria-labelledby="media-used-by">
            <h3
              id="media-used-by"
              className="text-sm font-semibold text-ink-900"
            >
              Used by
            </h3>
            {usage.status === "loading" ? (
              <p role="status" className="mt-1 text-sm text-ink-600">
                Checking where this photo is used…
              </p>
            ) : usage.status === "error" ? (
              <p className="mt-1 text-sm text-ink-600">
                We couldn&rsquo;t check where this photo is used.
              </p>
            ) : usage.labels.length === 0 ? (
              <p className="mt-1 text-sm text-ink-600">
                Not used anywhere yet.
              </p>
            ) : (
              <ul className="mt-1 list-disc pl-5 text-sm text-ink-600">
                {usage.labels.map((label) => (
                  <li key={label}>{label}</li>
                ))}
              </ul>
            )}
          </section>

          {message ? (
            <p role="alert" className="font-semibold text-red-700">
              {message}
            </p>
          ) : null}

          {confirming ? (
            <div
              role="group"
              aria-labelledby="media-delete-title"
              className="rounded-xl border border-red-700 p-4"
            >
              <h3
                id="media-delete-title"
                className="font-semibold text-ink-900"
              >
                Delete this photo?
              </h3>
              <p className="mt-1 text-sm text-ink-600">
                It is removed from the library for good. A photo that is still
                used somewhere cannot be deleted.
              </p>
              <div className="mt-4 flex flex-col-reverse gap-3 sm:flex-row">
                <button
                  ref={cancelRef}
                  type="button"
                  disabled={busy}
                  onClick={() => setConfirming(false)}
                  className={`${SECONDARY} border-forest-900 text-forest-900 hover:bg-forest-900 hover:text-ivory-50`}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleDelete()}
                  className={`${SECONDARY} border-red-700 bg-red-700 text-white hover:brightness-110`}
                >
                  Delete photo
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
              <button
                ref={deleteRef}
                type="button"
                disabled={busy}
                onClick={() => {
                  setMessage(null);
                  setConfirming(true);
                }}
                className={`${SECONDARY} border-red-700 text-red-700 hover:bg-red-700 hover:text-white`}
              >
                Delete
              </button>
              <Button
                type="button"
                disabled={busy || !changed}
                onClick={() => void handleSave()}
              >
                Save changes
              </Button>
            </div>
          )}
        </div>
      </div>
    </AdminModal>
  );
}

/**
 * The photo library: every uploaded photo with its description. Click a photo
 * to edit it; upload new ones from the button at the top.
 */
export function MediaLibraryPage({
  initialMedia,
}: {
  initialMedia: MediaRow[];
}) {
  const [rows, setRows] = useState(initialMedia);
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const editing = rows.find((r) => r.id === editingId) ?? null;
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [deletions, setDeletions] = useState(0);

  // The photo that was focused is gone: continue from the page heading.
  useEffect(() => {
    if (deletions > 0) headingRef.current?.focus();
  }, [deletions]);

  return (
    <section aria-labelledby="media-title">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1
            id="media-title"
            ref={headingRef}
            tabIndex={-1}
            className="font-serif text-3xl font-bold text-forest-900 focus:outline-none"
          >
            Media library
          </h1>
          <p className="mt-3 max-w-xl text-ink-600">
            Every photo used on the website. Click a photo to change its
            description or focal point, or to delete it.
          </p>
        </div>
        <Button
          type="button"
          aria-expanded={uploading}
          onClick={() => setUploading((v) => !v)}
        >
          {uploading ? "Close upload" : "Upload photos"}
        </Button>
      </div>

      {uploading ? (
        <div className="mt-6 rounded-2xl border border-cream-100 bg-white p-5 sm:p-7">
          <MediaUploader
            purpose="gallery"
            multiple
            onUploaded={(added) => setRows((cur) => [...added, ...cur])}
          />
        </div>
      ) : null}

      <div className="mt-8">
        {rows.length === 0 ? (
          <p className="text-ink-600">
            There are no photos yet. Choose &ldquo;Upload photos&rdquo; to add
            the first one.
          </p>
        ) : (
          <MediaGrid rows={rows} onSelect={(row) => setEditingId(row.id)} />
        )}
      </div>

      {editing ? (
        <MediaEditor
          key={editing.id}
          row={editing}
          onClose={() => setEditingId(null)}
          onSaved={(saved) => {
            setRows((cur) => cur.map((r) => (r.id === saved.id ? saved : r)));
            setEditingId(null);
          }}
          onDeleted={(gone) => {
            setRows((cur) => cur.filter((r) => r.id !== gone.id));
            setEditingId(null);
            setDeletions((n) => n + 1);
          }}
        />
      ) : null}
    </section>
  );
}
