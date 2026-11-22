import { useEffect, useState } from "react";

import { AdminModal } from "~/admin/components/AdminModal";
import { MediaGrid } from "~/admin/components/MediaGrid";
import { MediaUploader } from "~/admin/components/MediaUploader";
import { mediaPreviewUrl } from "~/admin/lib/mediaImage";
import { toFriendlyError } from "~/services/admin/errors";
import { listMedia } from "~/services/media";
import type { MediaRow } from "~/types/db-helpers";

type ImagePickerProps = {
  value: MediaRow | null;
  onChange: (row: MediaRow | null) => void;
  purpose: "cover" | "gallery";
  /** Shows "Remove photo" while one is chosen, for fields that may be empty. */
  clearable?: boolean;
};

const ACTION =
  "inline-flex min-h-11 items-center justify-center rounded-full border border-forest-900 px-5 py-2 text-sm font-semibold text-forest-900 transition duration-200 hover:bg-forest-900 hover:text-ivory-50 motion-reduce:transition-none";

const MIN_COVER_EDGE = 800;

type LibraryState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; rows: MediaRow[] };

function LibraryDialog({
  purpose,
  selectedId,
  onSelect,
  onClose,
}: {
  purpose: "cover" | "gallery";
  selectedId: string | null;
  onSelect: (row: MediaRow) => void;
  onClose: () => void;
}) {
  const [state, setState] = useState<LibraryState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    listMedia().then(
      (rows) => {
        if (!cancelled) setState({ status: "ready", rows });
      },
      (e: unknown) => {
        if (!cancelled)
          setState({
            status: "error",
            message: toFriendlyError(e, { entity: "photo" }).friendly,
          });
      },
    );
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <AdminModal title="Choose a photo" onClose={onClose} wide>
      {state.status === "loading" ? (
        <p role="status" className="text-ink-600">
          Loading photos…
        </p>
      ) : state.status === "error" ? (
        <p role="alert" className="font-semibold text-red-700">
          {state.message}
        </p>
      ) : state.rows.length === 0 ? (
        <p className="text-ink-600">
          There are no photos yet. Close this and choose &ldquo;Upload
          new&rdquo;.
        </p>
      ) : (
        <MediaGrid
          rows={state.rows}
          selectedId={selectedId}
          onSelect={onSelect}
          disabledReason={(row) =>
            purpose === "cover" &&
            Math.max(row.width, row.height) < MIN_COVER_EDGE
              ? "Too small for a large image"
              : null
          }
        />
      )}
    </AdminModal>
  );
}

/**
 * Field for choosing one photo: shows the current one, and lets the owner pick
 * another from the library or upload a new one. For a `cover` photo, photos
 * under 800 px cannot be picked.
 */
export function ImagePicker({
  value,
  onChange,
  purpose,
  clearable = false,
}: ImagePickerProps) {
  const [dialog, setDialog] = useState<"library" | "upload" | null>(null);

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
      <div className="w-full shrink-0 sm:w-48">
        {value ? (
          <img
            src={mediaPreviewUrl(value, 480)}
            alt={value.alt_text}
            className="aspect-[4/3] w-full rounded-xl border border-cream-100 bg-cream-100 object-cover"
          />
        ) : (
          <div className="flex aspect-[4/3] w-full items-center justify-center rounded-xl border border-dashed border-earth-600/50 bg-ivory-50 p-3 text-center text-sm text-ink-600">
            No photo chosen
          </div>
        )}
      </div>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => setDialog("library")}
          className={ACTION}
        >
          Choose from library
        </button>
        <button
          type="button"
          onClick={() => setDialog("upload")}
          className={ACTION}
        >
          Upload new
        </button>
        {clearable && value ? (
          <button
            type="button"
            onClick={() => onChange(null)}
            className={`${ACTION} border-red-700 text-red-700 hover:bg-red-700 hover:text-white`}
          >
            Remove photo
          </button>
        ) : null}
      </div>

      {dialog === "library" ? (
        <LibraryDialog
          purpose={purpose}
          selectedId={value?.id ?? null}
          onClose={() => setDialog(null)}
          onSelect={(row) => {
            onChange(row);
            setDialog(null);
          }}
        />
      ) : null}
      {dialog === "upload" ? (
        <AdminModal title="Upload a photo" onClose={() => setDialog(null)}>
          <MediaUploader
            purpose={purpose}
            onUploaded={(rows) => {
              if (rows[0]) onChange(rows[0]);
              setDialog(null);
            }}
          />
        </AdminModal>
      ) : null}
    </div>
  );
}
