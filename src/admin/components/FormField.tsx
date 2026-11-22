import {
  cloneElement,
  isValidElement,
  useId,
  type ReactElement,
  type ReactNode,
} from "react";

/** The attributes FormField injects into its control. */
export type FieldControlProps = {
  id: string;
  name: string;
  "aria-describedby"?: string;
  "aria-invalid"?: true;
};

type FormFieldProps = {
  label: string;
  name: string;
  error?: string;
  hint?: string;
  /** Marks the label "(optional)" for fields the owner may leave empty. */
  optional?: boolean;
  /**
   * One control element (it receives `id`, `name`, `aria-describedby` and
   * `aria-invalid`; an `id` or `aria-describedby` it already has is kept and
   * merged), or a function that spreads those onto a custom control.
   */
  children: ReactElement | ((props: FieldControlProps) => ReactNode);
};

/** Shared look for text inputs, selects and textareas inside admin forms. */
export const CONTROL_CLASS =
  "block min-h-11 w-full rounded-lg border border-earth-600/50 bg-white px-3.5 py-2 text-base text-ink-900 placeholder:text-ink-500 aria-[invalid=true]:border-red-700";

/**
 * Label, control, hint and error as one unit. The control gets a unique id so
 * the label is its accessible name, and the hint and error are linked with
 * `aria-describedby`; an error also sets `aria-invalid`.
 */
export function FormField({
  label,
  name,
  error,
  hint,
  optional = false,
  children,
}: FormFieldProps) {
  const uid = useId();
  const child = isValidElement(children)
    ? (children as ReactElement<Record<string, unknown>>)
    : null;
  // A control that brings its own id or aria-describedby keeps it: the id is
  // reused (so the label still points at it) and the descriptions are merged.
  const ownId = typeof child?.props.id === "string" ? child.props.id : null;
  const ownDescribedBy =
    typeof child?.props["aria-describedby"] === "string"
      ? child.props["aria-describedby"]
      : null;
  const id = ownId ?? `${uid}-${name}`;
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy =
    [ownDescribedBy, hint ? hintId : null, error ? errorId : null]
      .filter(Boolean)
      .join(" ") || undefined;

  const props: FieldControlProps = {
    id,
    name,
    ...(describedBy ? { "aria-describedby": describedBy } : {}),
    ...(error ? { "aria-invalid": true as const } : {}),
  };

  return (
    <div>
      <label htmlFor={id} className="text-sm font-semibold text-ink-900">
        {label}
        {optional ? (
          <span className="ml-1 font-normal text-ink-600">(optional)</span>
        ) : null}
      </label>
      {hint ? (
        <p id={hintId} className="mt-0.5 text-sm text-ink-600">
          {hint}
        </p>
      ) : null}
      <div className="mt-1.5">
        {typeof children === "function"
          ? children(props)
          : child
            ? cloneElement(child, { ...props })
            : children}
      </div>
      {error ? (
        <p
          id={errorId}
          role="alert"
          className="mt-1.5 text-sm font-semibold text-red-700"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
