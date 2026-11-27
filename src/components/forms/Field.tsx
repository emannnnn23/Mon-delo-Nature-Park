import { useId } from "react";
import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

type FieldProps = {
  label: string;
  name: string;
  error?: string;
  /** Helper text under the control, linked with aria-describedby. */
  hint?: string;
  required?: boolean;
  /** Renders a textarea instead of an input. */
  multiline?: boolean;
  className?: string;
} & Omit<
  InputHTMLAttributes<HTMLInputElement> &
    TextareaHTMLAttributes<HTMLTextAreaElement>,
  "name" | "required" | "className"
>;

const CONTROL =
  "block min-h-11 w-full rounded-xl border bg-white px-4 py-2.5 text-base text-ink-900 transition-colors placeholder:text-ink-500 focus-visible:border-forest-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-900";

/**
 * Labelled form control. The label is always visible; a required field is
 * marked with an asterisk and the `required` attribute; an error is linked
 * with aria-describedby and flagged with aria-invalid.
 */
export function Field({
  label,
  name,
  error,
  hint,
  required = false,
  multiline = false,
  className = "",
  ...controlProps
}: FieldProps) {
  const uid = useId();
  const id = `${uid}-${name}`;
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy =
    [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ") ||
    undefined;
  const shared = {
    id,
    name,
    required,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": describedBy,
    className: `${CONTROL} ${error ? "border-red-700" : "border-earth-600/50"}`,
  };

  return (
    <div className={className}>
      <label
        htmlFor={id}
        className="mb-1.5 block text-sm font-medium text-ink-900"
      >
        {label}
        {required ? (
          <span aria-hidden="true" className="ml-0.5 text-red-700">
            *
          </span>
        ) : null}
      </label>
      {multiline ? (
        <textarea rows={6} {...shared} {...controlProps} />
      ) : (
        <input {...shared} {...controlProps} />
      )}
      {hint ? (
        <p id={hintId} className="mt-1.5 text-sm text-ink-600">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="mt-1.5 text-sm text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
