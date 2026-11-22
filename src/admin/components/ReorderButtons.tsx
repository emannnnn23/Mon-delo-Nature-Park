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
  "inline-flex size-11 items-center justify-center rounded-full border border-earth-600/50 text-forest-900 hover:bg-cream-100 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent";

/** Up and down buttons for changing an item's position in a list. */
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
        onClick={onUp}
        disabled={disableUp}
        aria-label={`Move${subject} up`}
        className={BUTTON}
      >
        <ArrowUp aria-hidden="true" className="size-5" />
      </button>
      <button
        type="button"
        onClick={onDown}
        disabled={disableDown}
        aria-label={`Move${subject} down`}
        className={BUTTON}
      >
        <ArrowDown aria-hidden="true" className="size-5" />
      </button>
    </div>
  );
}
