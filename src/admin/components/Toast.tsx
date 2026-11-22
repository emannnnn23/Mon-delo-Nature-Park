import { CircleAlert, CircleCheck, X } from "lucide-react";
import { useMemo, useSyncExternalStore } from "react";

type ToastKind = "success" | "error";
type ToastItem = { id: number; kind: ToastKind; message: string };

const SUCCESS_MS = 5000;

// A tiny module-level store, so any page can raise a toast with `useToast()`
// while a single `<Toast />` in the admin layout renders them.
let toasts: ToastItem[] = [];
let nextId = 1;
const listeners = new Set<() => void>();
const timers = new Map<number, ReturnType<typeof setTimeout>>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return toasts;
}

function dismiss(id: number) {
  const timer = timers.get(id);
  if (timer !== undefined) clearTimeout(timer);
  timers.delete(id);
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

function show(kind: ToastKind, message: string) {
  const id = nextId++;
  toasts = [...toasts, { id, kind, message }];
  // Successes fade on their own. Errors stay until dismissed: the owner has
  // to read them and may need to act.
  if (kind === "success")
    timers.set(
      id,
      setTimeout(() => dismiss(id), SUCCESS_MS),
    );
  emit();
}

/** Removes every toast. Used when the admin signs out, and by tests. */
export function dismissAllToasts() {
  for (const timer of timers.values()) clearTimeout(timer);
  timers.clear();
  toasts = [];
  emit();
}

/** Raise a toast from any admin page: `const toast = useToast(); toast.success("Saved.")`. */
export function useToast() {
  return useMemo(
    () => ({
      success: (message: string) => show("success", message),
      error: (message: string) => show("error", message),
      dismiss,
    }),
    [],
  );
}

function ToastCard({ toast }: { toast: ToastItem }) {
  const isError = toast.kind === "error";
  const Icon = isError ? CircleAlert : CircleCheck;
  return (
    <div
      className={`pointer-events-auto flex animate-fade-in items-start gap-3 rounded-xl border bg-white p-3 pl-4 shadow-lg motion-reduce:animate-none ${
        isError ? "border-red-700" : "border-forest-800"
      }`}
    >
      <Icon
        aria-hidden="true"
        className={`mt-2.5 size-5 shrink-0 ${isError ? "text-red-700" : "text-forest-800"}`}
      />
      <p className="flex-1 py-2.5 text-sm font-semibold text-ink-900">
        {toast.message}
      </p>
      <button
        type="button"
        aria-label="Dismiss message"
        onClick={() => dismiss(toast.id)}
        className="inline-flex size-11 shrink-0 items-center justify-center rounded-full text-ink-600 hover:bg-cream-100"
      >
        <X aria-hidden="true" className="size-5" />
      </button>
    </div>
  );
}

/**
 * Renders the current toasts. Mount it once (in the admin layout). Two live
 * regions stay mounted so screen readers announce what is added: successes
 * politely (`status`), errors assertively (`alert`).
 */
export function Toast() {
  const items = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[70] flex flex-col items-center gap-3 p-4">
      <div role="status" className="flex w-full max-w-md flex-col gap-3">
        {items
          .filter((t) => t.kind === "success")
          .map((t) => (
            <ToastCard key={t.id} toast={t} />
          ))}
      </div>
      <div role="alert" className="flex w-full max-w-md flex-col gap-3">
        {items
          .filter((t) => t.kind === "error")
          .map((t) => (
            <ToastCard key={t.id} toast={t} />
          ))}
      </div>
    </div>
  );
}
