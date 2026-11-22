type PublishToggleProps = {
  checked: boolean;
  onChange: (next: boolean) => void;
  /** Accessible name, and the visible text unless `compact`. */
  label?: string;
  /** Hides the label visually and shows a short status instead (for list rows). */
  compact?: boolean;
  disabled?: boolean;
};

/**
 * On/off switch for "is this shown on the public website". A button with
 * `role="switch"`, at least 44px tall, so it works by keyboard and screen
 * reader without a hidden checkbox.
 */
export function PublishToggle({
  checked,
  onChange,
  label = "Publish on website",
  compact = false,
  disabled = false,
}: PublishToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={compact ? label : undefined}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="inline-flex min-h-11 items-center gap-3 rounded-full py-1 pr-2 text-left text-sm font-semibold text-ink-900 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <span
        aria-hidden="true"
        className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-colors duration-200 motion-reduce:transition-none ${
          checked
            ? "border-forest-900 bg-forest-900"
            : "border-earth-600 bg-cream-100"
        }`}
      >
        <span
          className={`absolute top-0.5 size-5 rounded-full transition-transform duration-200 motion-reduce:transition-none ${
            checked
              ? "translate-x-[1.375rem] bg-ivory-50"
              : "translate-x-0.5 bg-earth-700"
          }`}
        />
      </span>
      {compact ? (
        <span aria-hidden="true">{checked ? "On website" : "Hidden"}</span>
      ) : (
        label
      )}
    </button>
  );
}
