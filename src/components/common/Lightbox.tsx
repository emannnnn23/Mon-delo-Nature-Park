import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useEffect, useRef, type TouchEvent } from "react";
import { createPortal } from "react-dom";
import { useFocusTrap } from "../../hooks/useFocusTrap";
import { publicMediaUrl } from "../../lib/media";
import type { MediaAsset } from "../../types/content";
import { pickFallbackSrc } from "../../utils/imageVariants";
import { PlaceholderImage } from "./PlaceholderImage";

export type LightboxItem = { image: MediaAsset; caption: string | null };

type LightboxProps = {
  items: LightboxItem[];
  /** Index of the image on show, or null while the viewer is closed. */
  index: number | null;
  onClose: () => void;
  onIndexChange: (index: number) => void;
};

/** Smallest horizontal travel, in pixels, that counts as a swipe. */
const SWIPE_DISTANCE = 50;

const navButton =
  "inline-flex size-12 shrink-0 items-center justify-center rounded-full bg-ink-900/60 text-ivory-50 hover:bg-ink-900/85 sm:size-14";

/**
 * Full-screen image viewer. A modal dialog rendered into `document.body`:
 * Tab stays inside, Escape closes, arrow keys and horizontal swipes move
 * between images (wrapping at the ends), body scroll is locked, and focus
 * returns to whatever opened it. Shows the largest variant of each image.
 */
export function Lightbox({
  items,
  index,
  onClose,
  onIndexChange,
}: LightboxProps) {
  const open = index !== null && index >= 0 && index < items.length;
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const count = items.length;
  const current = open ? index : 0;
  const go = (step: number) => onIndexChange((current + step + count) % count);
  const goRef = useRef(go);
  useEffect(() => {
    goRef.current = go;
  });

  useFocusTrap(dialogRef, open, onClose, { initialFocusRef: closeRef });

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") {
        event.preventDefault();
        goRef.current(1);
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        goRef.current(-1);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  if (!open) return null;

  const { image, caption } = items[current];
  const several = count > 1;

  const onTouchStart = (event: TouchEvent) => {
    const touch = event.touches[0];
    touchStart.current = touch ? { x: touch.clientX, y: touch.clientY } : null;
  };
  const onTouchEnd = (event: TouchEvent) => {
    const start = touchStart.current;
    const touch = event.changedTouches[0];
    touchStart.current = null;
    if (!start || !touch || !several) return;
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    if (Math.abs(dx) >= SWIPE_DISTANCE && Math.abs(dx) > Math.abs(dy)) {
      go(dx < 0 ? 1 : -1);
    }
  };

  return createPortal(
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label="Image viewer"
      data-surface="dark"
      className="fixed inset-0 z-[60] flex animate-fade-in flex-col bg-ink-900/95 text-ivory-50 motion-reduce:animate-none"
    >
      <div className="flex items-center justify-between px-4 py-3 sm:px-6">
        <p
          aria-live="polite"
          aria-atomic="true"
          className="text-sm font-medium tabular-nums"
        >
          {current + 1} / {count}
        </p>
        <button
          ref={closeRef}
          type="button"
          aria-label="Close image viewer"
          onClick={onClose}
          className="-mr-2 inline-flex size-11 items-center justify-center rounded-full hover:bg-ivory-50/10"
        >
          <X aria-hidden="true" className="size-6" />
        </button>
      </div>

      <div
        role="presentation"
        data-testid="lightbox-stage"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onClick={(event) => {
          if (event.target === event.currentTarget) onClose();
        }}
        className="relative flex min-h-0 flex-1 touch-pan-y items-center justify-center gap-2 px-2 sm:gap-4 sm:px-6"
      >
        {several ? (
          <button
            type="button"
            aria-label="Previous image"
            onClick={() => go(-1)}
            className={`${navButton} max-sm:absolute max-sm:top-1/2 max-sm:left-2 max-sm:z-10 max-sm:-translate-y-1/2`}
          >
            <ChevronLeft aria-hidden="true" className="size-7" />
          </button>
        ) : null}
        {Object.keys(image.variants).length === 0 ? (
          // No file to show: never point an <img> at the bucket root.
          <div className="aspect-[4/3] max-h-full w-full max-w-3xl overflow-hidden rounded-sm">
            <PlaceholderImage />
          </div>
        ) : (
          <img
            key={image.id}
            src={publicMediaUrl(pickFallbackSrc(image.variants, 2400))}
            alt={image.alt}
            width={image.width}
            height={image.height}
            decoding="async"
            className="max-h-full min-w-0 animate-fade-in rounded-sm object-contain motion-reduce:animate-none"
          />
        )}
        {several ? (
          <button
            type="button"
            aria-label="Next image"
            onClick={() => go(1)}
            className={`${navButton} max-sm:absolute max-sm:top-1/2 max-sm:right-2 max-sm:z-10 max-sm:-translate-y-1/2`}
          >
            <ChevronRight aria-hidden="true" className="size-7" />
          </button>
        ) : null}
      </div>

      <div className="min-h-16 px-5 py-4 text-center sm:px-8">
        {caption ? (
          <p className="mx-auto max-w-2xl text-sm leading-relaxed text-ivory-50/90 sm:text-base">
            {caption}
          </p>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
