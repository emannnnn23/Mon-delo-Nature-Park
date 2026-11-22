import { useId, type KeyboardEvent, type MouseEvent } from "react";

import { mediaPreviewUrl } from "~/admin/lib/mediaImage";
import type { MediaRow } from "~/types/db-helpers";

type FocalPointPickerProps = {
  media: Pick<MediaRow, "variants" | "alt_text" | "focal_x" | "focal_y">;
  onChange: (focal: { focalX: number; focalY: number }) => void;
};

const STEP = 5;

const clamp = (n: number) => Math.min(100, Math.max(0, Math.round(n)));

/**
 * Choose the part of a photo that must stay visible when the website crops it.
 * Click (or tap) the photo, or focus it and use the arrow keys (5% a step).
 * The marker shows the current point.
 */
export function FocalPointPicker({ media, onChange }: FocalPointPickerProps) {
  const statusId = useId();
  const x = media.focal_x;
  const y = media.focal_y;

  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    // Enter or Space on the button also fires a click, with no pointer
    // position: that is not a choice of point.
    if (event.detail === 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    onChange({
      focalX: clamp(((event.clientX - rect.left) / rect.width) * 100),
      focalY: clamp(((event.clientY - rect.top) / rect.height) * 100),
    });
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const delta: Record<string, [number, number]> = {
      ArrowLeft: [-STEP, 0],
      ArrowRight: [STEP, 0],
      ArrowUp: [0, -STEP],
      ArrowDown: [0, STEP],
    };
    const move = delta[event.key];
    if (!move) return;
    event.preventDefault();
    onChange({ focalX: clamp(x + move[0]), focalY: clamp(y + move[1]) });
  }

  return (
    <div>
      <button
        type="button"
        aria-label="Focal point: click the photo or use the arrow keys to move it"
        aria-describedby={statusId}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className="relative block w-full cursor-crosshair overflow-hidden rounded-xl border border-earth-600/50 bg-cream-100"
      >
        <img
          src={mediaPreviewUrl(media, 960)}
          alt=""
          draggable={false}
          className="block h-auto w-full select-none"
        />
        <span
          aria-hidden="true"
          style={{ left: `${x}%`, top: `${y}%` }}
          className="pointer-events-none absolute size-7 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-ivory-50 bg-gold-500/60 shadow-[0_0_0_2px_var(--color-forest-900)]"
        />
      </button>
      <p id={statusId} aria-live="polite" className="mt-2 text-sm text-ink-600">
        Focal point: {x}% from the left, {y}% from the top.
      </p>
    </div>
  );
}
