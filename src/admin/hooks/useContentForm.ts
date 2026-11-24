import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type RefObject,
} from "react";

import { useFormDraft } from "~/hooks/useFormDraft";
import { toFriendlyError } from "~/services/admin/errors";

/** What a form's `validate` returns: the checked data, or a message per field. */
export type Validation<D, F extends string> =
  { ok: true; data: D } | { ok: false; errors: Partial<Record<F, string>> };

/** The first message for each field of a Zod error. */
export function issuesToErrors<F extends string>(
  issues: { path: PropertyKey[]; message: string }[],
): Partial<Record<F, string>> {
  const errors: Partial<Record<F, string>> = {};
  for (const issue of issues) {
    const field = issue.path[0] as F;
    errors[field] ??= issue.message;
  }
  return errors;
}

type Options<V, D, F extends string> = {
  /** Unique per form and record, e.g. `testimonial:<id>` or `testimonial:new`. */
  draftKey: string;
  /** The values the form opens with (a saved row, or the blank form). */
  initial: V;
  validate: (values: V) => Validation<D, F>;
  /** Writes the checked data and resolves to the form values of what was stored. */
  save: (data: D) => Promise<V>;
  /** What the owner calls the item, for error messages ("testimonial"). */
  entity: string;
  /** Called when unsaved edits appear or go away (and false on unmount). */
  onDirtyChange?: (dirty: boolean) => void;
  /** Called after a successful save, to close the dialog. */
  onSaved: () => void;
};

export type ContentForm<V, F extends string> = {
  values: V;
  setField: <K extends keyof V>(field: K, value: V[K]) => void;
  errors: Partial<Record<F, string>>;
  message: string | null;
  busy: boolean;
  restored: boolean;
  formRef: RefObject<HTMLFormElement | null>;
  messageRef: RefObject<HTMLParagraphElement | null>;
  submit: (event: FormEvent) => void;
};

/**
 * The state of one add/edit dialog: its values (kept as a draft on this
 * device while unsaved), field errors, the failure message and the save. Field
 * errors move focus to the first invalid field; a failure message takes focus.
 */
export function useContentForm<V extends object, D, F extends string>({
  draftKey,
  initial,
  validate,
  save,
  entity,
  onDirtyChange,
  onSaved,
}: Options<V, D, F>): ContentForm<V, F> {
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState<Partial<Record<F, string>>>({});
  const [errorTick, setErrorTick] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const formRef = useRef<HTMLFormElement | null>(null);
  const messageRef = useRef<HTMLParagraphElement | null>(null);

  const { clear, restored } = useFormDraft(draftKey, values, setValues);

  const [startingPoint] = useState(() => JSON.stringify(initial));
  const isDirty = useMemo(
    () => JSON.stringify(values) !== startingPoint,
    [values, startingPoint],
  );

  useEffect(() => {
    onDirtyChange?.(isDirty);
    return () => onDirtyChange?.(false);
  }, [onDirtyChange, isDirty]);

  useEffect(() => {
    if (message) messageRef.current?.focus();
  }, [message]);

  useEffect(() => {
    if (errorTick === 0) return;
    formRef.current
      ?.querySelector<HTMLElement>('[aria-invalid="true"]')
      ?.focus();
  }, [errorTick]);

  const setField = useCallback(<K extends keyof V>(field: K, value: V[K]) => {
    setValues((cur) => ({ ...cur, [field]: value }));
    setErrors((cur) =>
      cur[field as unknown as F] ? { ...cur, [field]: undefined } : cur,
    );
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setMessage(null);
    const result = validate(values);
    if (!result.ok) {
      setErrors(result.errors);
      setErrorTick((n) => n + 1);
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      const stored = await save(result.data);
      clear(stored);
      onSaved();
    } catch (e) {
      setMessage(toFriendlyError(e, { entity }).friendly);
      setBusy(false);
    }
  }

  return {
    values,
    setField,
    errors,
    message,
    busy,
    restored,
    formRef,
    messageRef,
    submit: (event) => void handleSubmit(event),
  };
}
