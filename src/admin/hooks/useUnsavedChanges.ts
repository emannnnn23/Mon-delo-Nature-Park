import {
  createElement,
  useCallback,
  useEffect,
  type ReactElement,
} from "react";
import { useBlocker, type BlockerFunction } from "react-router";

import { ConfirmDialog } from "~/admin/components/ConfirmDialog";

// Module state so the layout can ask "is any form dirty?" before signing out,
// and can let its own confirmed sign-out through the guard.
let dirtyForms = 0;
let guardSuspended = false;

/** True while any form using `useUnsavedChanges` has unsaved edits. */
export function hasUnsavedChanges(): boolean {
  return dirtyForms > 0;
}

/**
 * Runs `fn` with the leave prompt turned off. For a navigation the owner has
 * already confirmed another way (the layout's "Sign out without saving?").
 */
export async function withUnsavedGuardSuspended<T>(
  fn: () => Promise<T>,
): Promise<T> {
  guardSuspended = true;
  try {
    return await fn();
  } finally {
    guardSuspended = false;
  }
}

/**
 * Guards a form with unsaved edits.
 *
 * - Navigation to a different page (links, back/forward) is held by React
 *   Router's `useBlocker`; render the returned `leaveDialog` so the owner can
 *   choose to stay or leave. Changing only the search params of the same page
 *   (a tab, a filter) is not held.
 * - Closing or reloading the tab triggers the browser's own prompt through
 *   `beforeunload` (the browser shows its generic text, not ours).
 *
 * The dialog says the changes are kept as a draft on this device, so a form
 * using this hook must also use `useFormDraft` (draft kept on leave, cleared
 * only by `clear()` after a save).
 *
 * Pass `isDirty && !saved`: after a successful save the form must stop
 * counting as dirty *before* it navigates away, or the guard blocks that
 * navigation too. Requires a data router (framework mode provides one).
 */
export function useUnsavedChanges(isDirty: boolean): {
  /** Render this once inside the form page. It is empty unless navigation is held. */
  leaveDialog: ReactElement;
  /** True while a navigation is held and the dialog is showing. */
  isBlocked: boolean;
} {
  const shouldBlock = useCallback<BlockerFunction>(
    ({ currentLocation, nextLocation }) =>
      isDirty &&
      !guardSuspended &&
      currentLocation.pathname !== nextLocation.pathname,
    [isDirty],
  );
  const blocker = useBlocker(shouldBlock);

  useEffect(() => {
    if (!isDirty) return;
    dirtyForms += 1;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      // Some browsers only prompt when returnValue is set.
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      dirtyForms -= 1;
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [isDirty]);

  const isBlocked = blocker.state === "blocked";
  const leaveDialog = createElement(ConfirmDialog, {
    open: isBlocked,
    title: "Leave without saving?",
    body: "Your changes are kept as a draft on this device.",
    confirmLabel: "Leave without saving",
    cancelLabel: "Stay",
    destructive: true,
    onConfirm: () => {
      if (blocker.state === "blocked") blocker.proceed();
    },
    onCancel: () => {
      if (blocker.state === "blocked") blocker.reset();
    },
  });

  return { leaveDialog, isBlocked };
}
