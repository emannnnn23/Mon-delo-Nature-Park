import { ImagePlus, X } from "lucide-react";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent as ReactDragEvent,
} from "react";

import { FormField, CONTROL_CLASS } from "~/admin/components/FormField";
import { Button } from "~/components/common/Button";
import { toFriendlyError } from "~/services/admin/errors";
import { uploadImage } from "~/services/media";
import type { MediaRow } from "~/types/db-helpers";
import { validateImageFile } from "~/utils/encodeImage";
import { wordsFromFilename } from "~/utils/slug";

type MediaUploaderProps = {
  purpose: "cover" | "gallery";
  multiple?: boolean;
  onUploaded: (rows: MediaRow[]) => void;
  /** Called with true while uploads run, so a dialog can refuse to close. */
  onBusyChange?: (busy: boolean) => void;
};

type Item = {
  id: number;
  file: File;
  alt: string;
  altError: string | null;
  /** Why this file can never be uploaded (wrong type, too big, too small). */
  error: string | null;
  /** The last upload attempt failed; trying again may work. */
  uploadError: string | null;
  /** A gallery photo that is small: allowed, but may look blurry. */
  small: boolean;
  progress: { done: number; total: number } | null;
};

const SMALL_EDGE = 800;
const ACCEPT = "image/jpeg,image/png,image/webp";

/** Pixel size of a photo, or null where the browser cannot tell. */
async function measure(
  file: File,
): Promise<{ width: number; height: number } | null> {
  try {
    if (typeof createImageBitmap !== "function") return null;
    const bitmap = await createImageBitmap(file);
    const size = { width: bitmap.width, height: bitmap.height };
    bitmap.close?.();
    return size;
  } catch {
    return null;
  }
}

/**
 * Choose or drop photos, describe each one, and upload. Every photo needs a
 * short description (it is the alt text for people who cannot see it) before
 * anything is sent. Photos that upload are reported through `onUploaded` and
 * leave the list; ones that fail stay with their message so they can be
 * retried or removed.
 */
export function MediaUploader({
  purpose,
  multiple = false,
  onUploaded,
  onBusyChange,
}: MediaUploaderProps) {
  const [items, setItems] = useState<Item[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [summary, setSummary] = useState("");
  const nextId = useRef(1);
  const focusInvalid = useRef(false);
  const busyRef = useRef(onBusyChange);
  const listRef = useRef<HTMLUListElement>(null);
  const inputId = useId();

  useEffect(() => {
    busyRef.current = onBusyChange;
  });
  useEffect(() => {
    busyRef.current?.(uploading);
  }, [uploading]);

  // After a refused upload, move to the first description that needs filling.
  useEffect(() => {
    if (!focusInvalid.current) return;
    focusInvalid.current = false;
    listRef.current
      ?.querySelector<HTMLInputElement>('input[aria-invalid="true"]')
      ?.focus();
  }, [items]);

  function patch(id: number, changes: Partial<Item>) {
    setItems((cur) => cur.map((i) => (i.id === id ? { ...i, ...changes } : i)));
  }

  async function addFiles(files: File[]) {
    if (files.length === 0 || uploading) return;
    const chosen = multiple ? files : files.slice(0, 1);
    const added: Item[] = chosen.map((file) => {
      const check = validateImageFile(file, purpose);
      return {
        id: nextId.current++,
        file,
        alt: wordsFromFilename(file.name),
        altError: null,
        error: check.ok ? null : check.message,
        uploadError: null,
        small: false,
        progress: null,
      };
    });
    setSummary("");
    setItems((cur) => (multiple ? [...cur, ...added] : added));

    // Measure the valid ones to warn early (cover too small, gallery small).
    for (const item of added) {
      if (item.error) continue;
      const dims = await measure(item.file);
      if (!dims) continue;
      const check = validateImageFile(item.file, purpose, dims);
      patch(item.id, {
        error: check.ok ? null : check.message,
        small: Math.max(dims.width, dims.height) < SMALL_EDGE,
      });
    }
  }

  function handleInput(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    // So choosing the same file again later still fires a change.
    event.target.value = "";
    void addFiles(files);
  }

  function handleDrop(event: ReactDragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    void addFiles(Array.from(event.dataTransfer.files));
  }

  async function handleUpload() {
    const ready = items.filter((i) => !i.error);
    const missing = ready.filter((i) => i.alt.trim() === "");
    if (missing.length > 0) {
      setItems((cur) =>
        cur.map((i) =>
          missing.some((m) => m.id === i.id)
            ? { ...i, altError: "Please describe this photo in a few words." }
            : i,
        ),
      );
      focusInvalid.current = true;
      return;
    }

    setUploading(true);
    setSummary("");
    const uploaded: MediaRow[] = [];
    for (const item of ready) {
      patch(item.id, { uploadError: null, progress: { done: 0, total: 1 } });
      try {
        const row = await uploadImage(
          item.file,
          item.alt,
          purpose,
          (done, total) => patch(item.id, { progress: { done, total } }),
        );
        uploaded.push(row);
        setItems((cur) => cur.filter((i) => i.id !== item.id));
      } catch (e) {
        patch(item.id, {
          progress: null,
          uploadError: toFriendlyError(e, { entity: "photo" }).friendly,
        });
      }
    }
    setUploading(false);
    if (uploaded.length > 0) {
      setSummary(
        uploaded.length === 1
          ? "1 photo uploaded."
          : `${uploaded.length} photos uploaded.`,
      );
      onUploaded(uploaded);
    }
  }

  const uploadable = items.filter((i) => !i.error).length;

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed p-6 text-center ${
          dragging
            ? "border-forest-900 bg-cream-100"
            : "border-earth-600/50 bg-ivory-50"
        }`}
      >
        <ImagePlus aria-hidden="true" className="size-8 text-forest-800" />
        <p className="text-ink-600">
          {multiple ? "Drag photos here, or" : "Drag a photo here, or"}
        </p>
        <input
          id={inputId}
          type="file"
          accept={ACCEPT}
          multiple={multiple}
          disabled={uploading}
          onChange={handleInput}
          className="peer sr-only"
        />
        <label
          htmlFor={inputId}
          className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-full border border-forest-900 px-6 py-2.5 text-sm font-semibold text-forest-900 transition duration-200 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-forest-900 peer-disabled:cursor-not-allowed peer-disabled:opacity-60 hover:bg-forest-900 hover:text-ivory-50"
        >
          {multiple ? "Choose photos" : "Choose a photo"}
        </label>
        <p className="text-sm text-ink-600">
          JPG, PNG or WebP, up to 15 MB each.
        </p>
      </div>

      {items.length > 0 ? (
        <ul ref={listRef} className="mt-5 flex flex-col gap-4">
          {items.map((item) => (
            <li
              key={item.id}
              className="rounded-xl border border-cream-100 bg-white p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="min-w-0 truncate font-semibold text-ink-900">
                  {item.file.name}
                </p>
                <button
                  type="button"
                  aria-label={`Remove ${item.file.name}`}
                  disabled={uploading}
                  onClick={() =>
                    setItems((cur) => cur.filter((i) => i.id !== item.id))
                  }
                  className="-mt-2 -mr-2 inline-flex size-11 shrink-0 items-center justify-center rounded-full text-ink-600 hover:bg-cream-100 disabled:opacity-60"
                >
                  <X aria-hidden="true" className="size-5" />
                </button>
              </div>

              {item.error ? (
                <p
                  role="alert"
                  className="mt-1 text-sm font-semibold text-red-700"
                >
                  {item.error}
                </p>
              ) : (
                <>
                  {item.small ? (
                    <p className="mt-1 text-sm font-semibold text-earth-700">
                      Small photo — it may look blurry
                    </p>
                  ) : null}
                  {item.uploadError ? (
                    <p
                      role="alert"
                      className="mt-1 text-sm font-semibold text-red-700"
                    >
                      {item.uploadError}
                    </p>
                  ) : null}
                  <div className="mt-3">
                    <FormField
                      label={`Describe ${item.file.name}`}
                      name="alt"
                      error={item.altError ?? undefined}
                      hint="A few words about what the photo shows, for people who can't see it."
                    >
                      <input
                        type="text"
                        value={item.alt}
                        disabled={uploading}
                        onChange={(e) =>
                          patch(item.id, {
                            alt: e.target.value,
                            altError: null,
                          })
                        }
                        className={CONTROL_CLASS}
                      />
                    </FormField>
                  </div>
                  {item.progress ? (
                    <div className="mt-3">
                      <progress
                        aria-label={`Uploading ${item.file.name}`}
                        max={item.progress.total}
                        value={item.progress.done}
                        className="h-2 w-full accent-forest-800"
                      />
                      <p className="mt-1 text-sm text-ink-600">Uploading…</p>
                    </div>
                  ) : null}
                </>
              )}
            </li>
          ))}
        </ul>
      ) : null}

      {items.length > 0 ? (
        <div className="mt-5">
          <Button
            type="button"
            onClick={() => void handleUpload()}
            disabled={uploading || uploadable === 0}
          >
            {uploading
              ? "Uploading…"
              : multiple
                ? "Upload photos"
                : "Upload photo"}
          </Button>
        </div>
      ) : null}

      <p role="status" className="mt-3 text-sm font-semibold text-forest-800">
        {summary}
      </p>
    </div>
  );
}
