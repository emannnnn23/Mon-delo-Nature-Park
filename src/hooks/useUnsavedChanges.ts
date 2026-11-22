import { createElement, useEffect, type ReactElement } from "react";
import { useBlocker } from "react-router";

import { ConfirmDialog } from "~/admin/components/ConfirmDialog";

/**
 * Guards a form with unsaved edits.
 *
 * - In-app navigation (links, back/forward) is held by React Router's
 *   `useBlocker`; render the returned `leaveDialog` so the owner can choose to
 *   stay or leave.
 * - Closing or reloading the tab triggers the browser's own prompt through
 *   `beforeunload` (the browser shows its generic text, not ours).
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
  const blocker = useBlocker(isDirty);

  useEffect(() => {
    if (!isDirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      // Some browsers only prompt when returnValue is set.
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty]);

  const isBlocked = blocker.state === "blocked";
  const leaveDialog = createElement(ConfirmDialog, {
    open: isBlocked,
    title: "Leave without saving?",
    body: "You have changes that haven't been saved. If you leave now, they will be lost.",
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
