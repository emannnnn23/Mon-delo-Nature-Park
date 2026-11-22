import { useCallback, useEffect, useRef, useState } from "react";

const PREFIX = "mondelos-admin-draft:";

// Every storage call is wrapped: sessionStorage throws in some private modes
// and when site data is blocked, and a draft is a convenience, never a need.
function readDraft(storageKey: string): unknown {
  try {
    const raw = sessionStorage.getItem(storageKey);
    return raw === null ? null : (JSON.parse(raw) as unknown);
  } catch {
    return null;
  }
}

function writeDraft(storageKey: string, serialized: string): void {
  try {
    sessionStorage.setItem(storageKey, serialized);
  } catch {
    // No storage: the form still works, it just cannot be restored.
  }
}

function removeDraft(storageKey: string): void {
  try {
    sessionStorage.removeItem(storageKey);
  } catch {
    // See writeDraft.
  }
}

function serialize(values: unknown): string | null {
  try {
    return JSON.stringify(values);
  } catch {
    return null;
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Keeps a form's in-progress values in `sessionStorage` so a reload, an
 * accidental navigation or a session-expiry sign-in does not lose them.
 *
 * - While the values differ from what the form started with (or from the last
 *   `clear()`), they are saved under `key`; when they match again the draft is
 *   removed.
 * - On mount a saved draft is merged over the starting values with `setValues`
 *   and `restored` is true, so the page can say so.
 * - Call `clear(savedValues)` after a successful save, passing what the form
 *   is reset to (usually the row the server returned: it is trimmed, with ''
 *   turned into null). That becomes the new starting point, so only later
 *   edits create a draft again. Without an argument the latest rendered
 *   values are used, which can be stale if the form is reset from the server
 *   right after.
 *
 * Values must be JSON-serialisable (File objects and the like are not kept).
 * `key` should be unique per form and record, e.g. `attraction:<id>`.
 */
export function useFormDraft<T>(
  key: string,
  values: T,
  setValues: (values: T) => void,
): { clear: (savedValues?: T) => void; restored: boolean } {
  const storageKey = PREFIX + key;
  const serialized = serialize(values);

  const [initialValues] = useState(values);
  const [draft] = useState(() => readDraft(storageKey));
  const [restored, setRestored] = useState(draft !== null);
  const baseline = useRef(serialize(initialValues));
  const latest = useRef(serialized);
  const setValuesRef = useRef(setValues);

  useEffect(() => {
    latest.current = serialized;
    setValuesRef.current = setValues;
  });

  // Restore once, on mount.
  useEffect(() => {
    if (draft === null) return;
    setValuesRef.current(
      isPlainObject(draft) && isPlainObject(initialValues)
        ? ({ ...initialValues, ...draft } as T)
        : (draft as T),
    );
  }, [draft, initialValues]);

  // Save while dirty, drop the draft when the values are back to the baseline.
  useEffect(() => {
    if (serialized === null) return;
    if (serialized === baseline.current) removeDraft(storageKey);
    else writeDraft(storageKey, serialized);
  }, [serialized, storageKey]);

  const clear = useCallback(
    (savedValues?: T) => {
      removeDraft(storageKey);
      baseline.current =
        savedValues === undefined ? latest.current : serialize(savedValues);
      setRestored(false);
    },
    [storageKey],
  );

  return { clear, restored };
}
