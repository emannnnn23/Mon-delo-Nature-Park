import { X } from "lucide-react";
import { useId, useRef, type ReactNode } from "react";

import { useFocusTrap } from "~/hooks/useFocusTrap";

type AdminModalProps = {
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** Wider panel for grids. */
  wide?: boolean;
};

/**
 * Content dialog (a photo grid, an editor). Render it only while open. Same
 * behaviour as ConfirmDialog: Tab stays inside, Escape and the backdrop close
 * it, focus starts on the close button and returns to the opener. Do not open
 * another dialog on top of it: put any confirmation inside the panel.
 */
export function AdminModal({
  title,
  onClose,
  children,
  wide = false,
}: AdminModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  useFocusTrap(panelRef, true, onClose, { initialFocusRef: closeRef });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-ink-900/60"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`relative flex max-h-[calc(100dvh-2rem)] w-full animate-fade-in flex-col rounded-2xl border border-cream-100 bg-white shadow-2xl focus:outline-none motion-reduce:animate-none ${
          wide ? "max-w-4xl" : "max-w-2xl"
        }`}
      >
        <div className="flex items-start justify-between gap-3 border-b border-cream-100 p-5 sm:px-7">
          <h2
            id={titleId}
            className="font-serif text-xl font-bold text-forest-900"
          >
            {title}
          </h2>
          <button
            ref={closeRef}
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="-mt-1 -mr-2 inline-flex size-11 shrink-0 items-center justify-center rounded-full text-ink-600 hover:bg-cream-100"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-7">
          {children}
        </div>
      </div>
    </div>
  );
}
