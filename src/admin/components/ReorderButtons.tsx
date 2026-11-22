import { ArrowDown, ArrowUp } from "lucide-react";

type ReorderButtonsProps = {
  onUp: () => void;
  onDown: () => void;
  disableUp?: boolean;
  disableDown?: boolean;
  /** The item's name, so screen readers hear "Move Beautiful Gardens up". */
  label?: string;
};

const BUTTON =
  "inline-flex size-11 items-center justify-center rounded-full border border-earth-600/50 text-forest-900 hover:bg-cream-100 aria-disabled:cursor-not-allowed aria-disabled:opacity-40 aria-disabled:hover:bg-transparent";

/**
 * Up and down buttons for changing an item's position in a list. An
 * unavailable button is `aria-disabled` rather than `disabled`: it stays
 * focusable, so keyboard focus is not dropped when the pressed button becomes
 * unavailable (an item moved to an end), and its click does nothing.
 */
export function ReorderButtons({
  onUp,
  onDown,
  disableUp = false,
  disableDown = false,
  label,
}: ReorderButtonsProps) {
  const subject = label ? ` ${label}` : "";
  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={() => {
          if (!disableUp) onUp();
        }}
        aria-disabled={disableUp || undefined}
        data-reorder="up"
        aria-label={`Move${subject} up`}
        className={BUTTON}
      >
        <ArrowUp aria-hidden="true" className="size-5" />
      </button>
      <button
        type="button"
        onClick={() => {
          if (!disableDown) onDown();
        }}
        aria-disabled={disableDown || undefined}
        data-reorder="down"
        aria-label={`Move${subject} down`}
        className={BUTTON}
      >
        <ArrowDown aria-hidden="true" className="size-5" />
      </button>
    </div>
  );
}
