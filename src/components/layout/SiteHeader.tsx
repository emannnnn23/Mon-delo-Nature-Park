import { ArrowRight, Menu } from "lucide-react";
import { useRef, useState } from "react";
import { Link, NavLink } from "react-router";
import { useScrolled } from "../../hooks/useScrolled";
import { Button } from "../common/Button";
import { Logo } from "../common/Logo";
import { MobileMenu } from "./MobileMenu";
import { NAV_LINKS } from "./navLinks";

export { NAV_LINKS };

type SiteHeaderProps = {
  /** True on pages that open with a full-bleed hero the header floats over. */
  overHero: boolean;
};

/**
 * Sticky top bar. Over a hero it is transparent until the page scrolls;
 * everywhere else it is solid forest. The bar is 5rem tall: the hero page pulls
 * its content up by the same amount so the hero sits behind it.
 */
export function SiteHeader({ overHero }: SiteHeaderProps) {
  const scrolled = useScrolled(24);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const solid = !overHero || scrolled;

  return (
    <header
      data-surface="dark"
      className={`sticky top-0 z-40 h-20 text-ivory-50 transition-colors duration-300 ${
        overHero ? "-mb-20" : ""
      } ${solid ? "bg-forest-900 shadow-[0_1px_0_0_rgb(248_245_236/0.08)]" : "bg-transparent"}`}
    >
      <div className="mx-auto flex h-full max-w-7xl items-center justify-between gap-6 px-5 sm:px-8 lg:grid lg:grid-cols-[1fr_auto_1fr]">
        <Link
          to="/"
          aria-label="Mondelos Nature Park, home"
          className="inline-flex min-h-11 items-center justify-self-start rounded-sm"
        >
          <Logo tone="light" />
        </Link>

        <nav aria-label="Main" className="hidden lg:block">
          <ul className="flex items-center gap-8">
            {NAV_LINKS.map(({ to, label }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={to === "/"}
                  className={({ isActive }) =>
                    `relative inline-flex min-h-11 items-center px-1 font-serif text-base transition-colors after:absolute after:inset-x-0 after:bottom-1 after:h-0.5 after:bg-gold-500 after:transition-opacity ${
                      isActive
                        ? "text-gold-500 after:opacity-100"
                        : "text-ivory-50 after:opacity-0 hover:text-gold-500"
                    }`
                  }
                >
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center justify-self-end">
          {/* Wrapped: a `hidden` class on Button loses to its base `inline-flex`. */}
          <div className="hidden lg:block">
            <Button to="/visit" variant="gold" icon={ArrowRight}>
              Plan Your Visit
            </Button>
          </div>
          <button
            ref={menuButtonRef}
            type="button"
            aria-label="Open menu"
            aria-haspopup="dialog"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(true)}
            className="-mr-2 inline-flex size-11 items-center justify-center rounded-full hover:bg-ivory-50/10 lg:hidden"
          >
            <Menu aria-hidden="true" className="size-6" />
          </button>
        </div>
      </div>

      {menuOpen ? (
        <MobileMenu
          onClose={() => setMenuOpen(false)}
          returnFocusRef={menuButtonRef}
        />
      ) : null}
    </header>
  );
}
