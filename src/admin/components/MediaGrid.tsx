import { mediaPreviewUrl } from "~/admin/lib/mediaImage";
import type { MediaRow } from "~/types/db-helpers";

type MediaGridProps = {
  rows: MediaRow[];
  onSelect: (row: MediaRow) => void;
  /** A reason this photo cannot be chosen (it is then shown but disabled). */
  disabledReason?: (row: MediaRow) => string | null;
  /** Id of the photo to mark as the current choice. */
  selectedId?: string | null;
};

/** Photos as a grid of buttons, each showing the thumbnail and its alt text. */
export function MediaGrid({
  rows,
  onSelect,
  disabledReason,
  selectedId,
}: MediaGridProps) {
  return (
    <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {rows.map((row) => {
        const reason = disabledReason?.(row) ?? null;
        const selected = row.id === selectedId;
        return (
          <li key={row.id}>
            <button
              type="button"
              disabled={reason !== null}
              aria-pressed={selectedId === undefined ? undefined : selected}
              onClick={() => onSelect(row)}
              className={`flex h-full w-full flex-col overflow-hidden rounded-xl border bg-white text-left transition hover:border-forest-800 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:border-cream-100 ${
                selected
                  ? "border-forest-900 ring-2 ring-forest-900"
                  : "border-cream-100"
              }`}
            >
              <img
                src={mediaPreviewUrl(row, 480)}
                alt=""
                loading="lazy"
                className="aspect-[4/3] w-full bg-cream-100 object-cover"
              />
              <span className="p-3 text-sm font-semibold text-ink-900">
                {row.alt_text}
              </span>
              {reason ? (
                <span className="px-3 pb-3 text-sm text-ink-600">{reason}</span>
              ) : null}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
