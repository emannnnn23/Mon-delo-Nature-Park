import type { LucideIcon } from "lucide-react";
import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  ReactNode,
} from "react";
import { Link, type LinkProps } from "react-router";

export type ButtonVariant = "gold" | "outline-light" | "outline-dark";

const VARIANTS: Record<ButtonVariant, string> = {
  gold: "border-gold-500 bg-gold-500 text-ink-900 hover:brightness-110 disabled:hover:brightness-100",
  "outline-light":
    "border-ivory-50/80 text-ivory-50 hover:border-ivory-50 hover:bg-ivory-50/10 disabled:hover:border-ivory-50/80 disabled:hover:bg-transparent",
  "outline-dark":
    "border-forest-900 text-forest-900 hover:bg-forest-900 hover:text-ivory-50 disabled:hover:bg-transparent disabled:hover:text-forest-900",
};

const BASE =
  "group inline-flex min-h-11 items-center justify-center gap-2 rounded-full border px-6 py-2.5 text-sm font-semibold transition duration-200 active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100 disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100";

type Shared = {
  variant?: ButtonVariant;
  /** Trailing Lucide icon, e.g. ArrowRight. */
  icon?: LucideIcon;
  /**
   * Extra utilities appended after the base and variant classes, for layout
   * such as margins or width. It cannot override the base `display`, border
   * or colour utilities: Tailwind orders those by its own rules, not by class
   * order, so a conflicting class may lose. To change those, wrap the button
   * in an element instead.
   */
  className?: string;
  children: ReactNode;
};

type AsRouterLink = Shared &
  Omit<LinkProps, keyof Shared | "to"> & { to: string; href?: never };
type AsAnchor = Shared &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof Shared | "href"> & {
    href: string;
    to?: never;
  };
type AsButton = Shared &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof Shared> & {
    to?: never;
    href?: never;
  };

export type ButtonProps = AsRouterLink | AsAnchor | AsButton;

/**
 * Pill button. Renders a router Link for `to`, an anchor for `href` and a
 * button otherwise. Minimum height is 44px.
 */
export function Button(props: ButtonProps) {
  const {
    variant = "gold",
    icon: Icon,
    className = "",
    children,
    ...rest
  } = props;
  const classes = `${BASE} ${VARIANTS[variant]} ${className}`.trim();
  const content = (
    <>
      {children}
      {Icon ? (
        <Icon
          aria-hidden="true"
          className="size-4 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none"
        />
      ) : null}
    </>
  );

  if ("to" in rest && rest.to !== undefined) {
    return (
      <Link {...(rest as Omit<AsRouterLink, keyof Shared>)} className={classes}>
        {content}
      </Link>
    );
  }
  if ("href" in rest && rest.href !== undefined) {
    return (
      <a {...(rest as Omit<AsAnchor, keyof Shared>)} className={classes}>
        {content}
      </a>
    );
  }
  const { type = "button", ...buttonRest } = rest as Omit<
    AsButton,
    keyof Shared
  >;
  return (
    <button {...buttonRest} type={type} className={classes}>
      {content}
    </button>
  );
}
