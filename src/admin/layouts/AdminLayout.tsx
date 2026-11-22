import { ExternalLink, LogOut, Menu, X } from "lucide-react";
import { useRef, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router";

import { Logo } from "~/components/common/Logo";
import { useFocusTrap } from "~/hooks/useFocusTrap";
import { useSession } from "~/hooks/useSession";
import { signOut } from "~/services/auth";

import { Toast } from "../components/Toast";
import { ADMIN_NAV } from "../nav";

type AdminLayoutProps = {
  /** The signed-in admin's email, shown above "Sign out". */
  email: string;
};

const ROW =
  "flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium";

type SidebarContentProps = {
  email: string;
  navLabel: string;
  onNavigate?: () => void;
  onSignOut: () => void;
};

/** Links, website shortcut and account, shared by the sidebar and the phone menu. */
function SidebarContent({
  email,
  navLabel,
  onNavigate,
  onSignOut,
}: SidebarContentProps) {
  return (
    <>
      <nav aria-label={navLabel} className="flex-1 overflow-y-auto">
        <ul className="flex flex-col gap-0.5">
          {ADMIN_NAV.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={to === "/admin"}
                onClick={onNavigate}
                className={({ isActive }) =>
                  `${ROW} ${
                    isActive
                      ? "bg-ivory-50/15 text-gold-500"
                      : "text-ivory-50 hover:bg-ivory-50/10"
                  }`
                }
              >
                <Icon aria-hidden="true" className="size-5 shrink-0" />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mt-4 border-t border-ivory-50/15 pt-4">
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className={`${ROW} text-ivory-50 hover:bg-ivory-50/10`}
        >
          <ExternalLink aria-hidden="true" className="size-5 shrink-0" />
          View website
          <span className="sr-only">(opens in a new tab)</span>
        </a>
        <p className="mt-2 truncate px-3 text-xs text-ivory-50/80">{email}</p>
        <button
          type="button"
          onClick={onSignOut}
          className={`${ROW} mt-1 text-ivory-50 hover:bg-ivory-50/10`}
        >
          <LogOut aria-hidden="true" className="size-5 shrink-0" />
          Sign out
        </button>
      </div>
    </>
  );
}

type PhoneMenuProps = SidebarContentProps & { onClose: () => void };

/** Dialog version of the sidebar, mounted only while open. */
function PhoneMenu({ onClose, onNavigate, ...rest }: PhoneMenuProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  useFocusTrap(panelRef, true, onClose, { initialFocusRef: closeRef });

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
        aria-label="Admin menu"
        data-surface="dark"
        className="absolute inset-y-0 right-0 flex w-[min(20rem,100%)] animate-menu-in flex-col bg-forest-900 px-4 pt-3 pb-6 text-ivory-50 shadow-2xl motion-reduce:animate-none"
      >
        <div className="mb-4 flex h-14 items-center justify-between">
          <Logo tone="light" />
          <button
            ref={closeRef}
            type="button"
            aria-label="Close menu"
            onClick={onClose}
            className="inline-flex size-11 items-center justify-center rounded-full hover:bg-ivory-50/10"
          >
            <X aria-hidden="true" className="size-6" />
          </button>
        </div>
        <SidebarContent
          {...rest}
          navLabel="Admin sections"
          onNavigate={() => {
            onNavigate?.();
            onClose();
          }}
        />
      </div>
    </div>
  );
}

/**
 * Shell of every signed-in admin page: forest sidebar from lg up, a top bar
 * with a menu button below it. Pages render in the one `<main id="main">`.
 */
export function AdminLayout({ email }: AdminLayoutProps) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  // The menu is open only for the path it was opened on, so navigating (links,
  // back button) closes it without an effect.
  const [openedAt, setOpenedAt] = useState<string | null>(null);
  const menuOpen = openedAt === pathname;

  useSession();

  async function handleSignOut() {
    await signOut();
    await navigate("/admin/login", { replace: true });
  }

  return (
    <div className="min-h-screen bg-ivory-50 lg:flex">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60] focus:rounded-full focus:bg-gold-500 focus:px-5 focus:py-3 focus:text-sm focus:font-semibold focus:text-ink-900"
      >
        Skip to content
      </a>

      <aside
        data-surface="dark"
        className="hidden w-64 shrink-0 flex-col bg-forest-900 px-4 py-6 text-ivory-50 lg:sticky lg:top-0 lg:flex lg:h-screen"
      >
        <div className="mb-8 px-1">
          <Logo tone="light" />
        </div>
        <SidebarContent
          email={email}
          navLabel="Admin"
          onSignOut={handleSignOut}
        />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header
          data-surface="dark"
          className="flex h-16 items-center justify-between bg-forest-900 px-4 text-ivory-50 lg:hidden"
        >
          <Logo tone="light" />
          <button
            type="button"
            aria-label="Open menu"
            aria-expanded={menuOpen}
            onClick={() => setOpenedAt(pathname)}
            className="inline-flex size-11 items-center justify-center rounded-full hover:bg-ivory-50/10"
          >
            <Menu aria-hidden="true" className="size-6" />
          </button>
        </header>

        <main
          id="main"
          tabIndex={-1}
          className="min-w-0 flex-1 px-5 py-8 focus:outline-none sm:px-8 lg:px-10 lg:py-10"
        >
          <Outlet />
        </main>
      </div>

      <Toast />

      {menuOpen ? (
        <PhoneMenu
          email={email}
          navLabel="Admin sections"
          onClose={() => setOpenedAt(null)}
          onSignOut={handleSignOut}
        />
      ) : null}
    </div>
  );
}
