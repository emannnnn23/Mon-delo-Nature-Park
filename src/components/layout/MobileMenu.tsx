import { ArrowRight, X } from "lucide-react";
import { useEffect, useRef, type RefObject } from "react";
import { NavLink } from "react-router";
import { useFocusTrap } from "../../hooks/useFocusTrap";
import { Button } from "../common/Button";
import { Logo } from "../common/Logo";
import { NAV_LINKS } from "./navLinks";

type MobileMenuProps = {
  onClose: () => void;
  /** The button that opened the menu; focus returns to it on close. */
  returnFocusRef: RefObject<HTMLElement | null>;
};

const DESKTOP = "(min-width: 1024px)";

/**
 * Full-height dialog that slides in from the right below the lg breakpoint.
 * Mounted only while open. Traps Tab, closes on Escape, locks body scroll and
 * returns focus to the opener.
 */
export function MobileMenu({ onClose, returnFocusRef }: MobileMenuProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useFocusTrap(panelRef, true, onClose, {
    initialFocusRef: closeRef,
    returnFocusRef,
  });

  useEffect(() => {
    // The panel is hidden at lg and up, so release the scroll lock if the
    // viewport grows while it is open.
    let mql: MediaQueryList | undefined;
    const onResize = (event: MediaQueryListEvent) => {
      if (event.matches) onCloseRef.current();
    };
    if (typeof window.matchMedia === "function") {
      mql = window.matchMedia(DESKTOP);
      mql.addEventListener("change", onResize);
    }

    return () => {
      mql?.removeEventListener("change", onResize);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-ink-900/60"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Main menu"
        data-surface="dark"
        className="absolute inset-y-0 right-0 flex w-[min(22rem,100%)] animate-menu-in flex-col bg-forest-900 px-6 pb-8 text-ivory-50 shadow-2xl motion-reduce:animate-none"
      >
        <div className="flex h-20 items-center justify-between">
          <Logo tone="light" />
          <button
            ref={closeRef}
            type="button"
            aria-label="Close menu"
            onClick={onClose}
            className="-mr-2 inline-flex size-11 items-center justify-center rounded-full hover:bg-ivory-50/10"
          >
            <X aria-hidden="true" className="size-6" />
          </button>
        </div>

        <nav aria-label="Mobile" className="mt-6 flex-1 overflow-y-auto">
          <ul className="flex flex-col">
            {NAV_LINKS.map(({ to, label }) => (
              <li key={to} className="border-b border-ivory-50/10">
                <NavLink
                  to={to}
                  end={to === "/"}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex min-h-14 items-center font-serif text-2xl ${
                      isActive
                        ? "text-gold-500"
                        : "text-ivory-50 hover:text-gold-500"
                    }`
                  }
                >
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <Button
          to="/visit"
          variant="gold"
          icon={ArrowRight}
          onClick={onClose}
          className="mt-6 w-full"
        >
          Plan Your Visit
        </Button>
      </div>
    </div>
  );
}
