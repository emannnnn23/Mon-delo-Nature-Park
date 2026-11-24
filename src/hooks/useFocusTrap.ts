import { useEffect, useRef, type RefObject } from "react";

const FOCUSABLE = [
  "a[href]",
  "area[href]",
  "button:not([disabled])",
  'input:not([disabled]):not([type="hidden"])',
  "select:not([disabled])",
  "textarea:not([disabled])",
  "summary",
  "iframe",
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
].join(", ");

/**
 * True when the document has no layout engine (jsdom: `getClientRects()` is
 * empty for every element, even visible ones). The root element always has a
 * box in a real browser, so an empty list on it means there is no layout and
 * "has a box" cannot be used to decide visibility.
 */
function hasNoLayout(): boolean {
  return document.documentElement.getClientRects().length === 0;
}

/** Hidden by markup or inline/author style, checked without needing layout. */
function isHiddenByStyle(el: HTMLElement): boolean {
  for (let node: HTMLElement | null = el; node; node = node.parentElement) {
    const style = getComputedStyle(node);
    if (style.display === "none" || style.visibility === "hidden") return true;
  }
  return false;
}

/**
 * A tab stop a keyboard user can actually reach: tabindex >= 0, not inside a
 * `[hidden]` or `[inert]` subtree, and rendered. "Rendered" means it has a box
 * (`getClientRects().length > 0`), which catches `display:none` anywhere up
 * the tree, and `checkVisibility` (where the browser has it) also catches
 * `visibility:hidden`. Environments without layout (jsdom) cannot answer that, so there
 * the check falls back to computed `display:none` / `visibility:hidden` on the
 * element and its ancestors, which is all such an environment can observe.
 */
function isTabbable(el: HTMLElement, noLayout: boolean): boolean {
  if (el.tabIndex < 0) return false;
  if (el.closest("[hidden], [inert]")) return false;
  if (noLayout) return !isHiddenByStyle(el);
  if (el.getClientRects().length === 0) return false;
  // Catches `visibility:hidden` (which still has a box) where supported.
  return el.checkVisibility?.({ visibilityProperty: true }) ?? true;
}

type FocusTrapOptions = {
  /** Focused when the trap activates. Defaults to nothing. */
  initialFocusRef?: RefObject<HTMLElement | null>;
  /**
   * Receives focus when the trap releases. Defaults to whatever element was
   * focused when the trap activated.
   */
  returnFocusRef?: RefObject<HTMLElement | null>;
};

/**
 * Modal behaviour for a dialog: while `active`, Tab and Shift+Tab cycle inside
 * `containerRef`, Escape calls `onEscape`, body scroll is locked, and focus
 * returns to the opener on release.
 */
export function useFocusTrap(
  containerRef: RefObject<HTMLElement | null>,
  active: boolean,
  onEscape: () => void,
  { initialFocusRef, returnFocusRef }: FocusTrapOptions = {},
) {
  const onEscapeRef = useRef(onEscape);
  useEffect(() => {
    onEscapeRef.current = onEscape;
  }, [onEscape]);

  useEffect(() => {
    if (!active) return;
    const returnTo =
      returnFocusRef?.current ??
      (document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    initialFocusRef?.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onEscapeRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      const container = containerRef.current;
      if (!container) return;
      const noLayout = hasNoLayout();
      const items = Array.from(
        container.querySelectorAll<HTMLElement>(FOCUSABLE),
      ).filter((el) => isTabbable(el, noLayout));
      if (items.length === 0) {
        // Nothing to tab to (e.g. every button is disabled while busy): keep
        // focus on the container rather than letting it leave the dialog.
        event.preventDefault();
        container.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const current = document.activeElement as HTMLElement | null;
      if (!current || !container.contains(current)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (event.shiftKey && current === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && current === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      returnTo?.focus();
    };
  }, [active, containerRef, initialFocusRef, returnFocusRef]);
}
