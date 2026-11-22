import { TriangleAlert } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";

import { useFocusTrap } from "~/hooks/useFocusTrap";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  body: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  /** Styles the confirm button as a warning (deleting, discarding). */
  destructive?: boolean;
  /** Disables both buttons while the confirmed action runs. */
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

const BUTTON =
  "inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border px-6 py-2.5 text-sm font-semibold transition duration-200 disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none";

/**
 * Modal confirmation. Rendered only while `open`. Cancel has initial focus
 * (the safe choice), Tab stays inside, Escape and the backdrop cancel, and
 * focus returns to whatever opened it.
 */
export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  cancelLabel = "Cancel",
  destructive = false,
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const bodyId = useId();
  // While the confirmed action runs, Escape and the backdrop do nothing.
  const cancel = () => {
    if (!busy) onCancel();
  };
  useFocusTrap(panelRef, open, cancel, { initialFocusRef: cancelRef });

  // Both buttons are disabled while busy, which would drop focus to the page
  // behind the dialog: park it on the panel instead.
  useEffect(() => {
    if (open && busy) panelRef.current?.focus();
  }, [open, busy]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-ink-900/60"
        onClick={cancel}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        tabIndex={-1}
        className="relative w-full max-w-md animate-fade-in rounded-2xl border border-cream-100 bg-white p-6 shadow-2xl focus:outline-none motion-reduce:animate-none sm:p-7"
      >
        <div className="flex items-start gap-3">
          {destructive ? (
            <TriangleAlert
              aria-hidden="true"
              className="mt-1 size-5 shrink-0 text-red-700"
            />
          ) : null}
          <div>
            <h2
              id={titleId}
              className="font-serif text-xl font-bold text-forest-900"
            >
              {title}
            </h2>
            <div id={bodyId} className="mt-2 text-ink-600">
              {body}
            </div>
          </div>
        </div>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            disabled={busy}
            className={`${BUTTON} border-forest-900 text-forest-900 hover:bg-forest-900 hover:text-ivory-50`}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={`${BUTTON} ${
              destructive
                ? "border-red-700 bg-red-700 text-white hover:brightness-110"
                : "border-gold-500 bg-gold-500 text-ink-900 hover:brightness-110"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
