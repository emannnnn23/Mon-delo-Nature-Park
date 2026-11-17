import { createElement, type ElementType, type ReactNode } from "react";
import { useInView } from "../../hooks/useInView";
import { usePrefersReducedMotion } from "../../hooks/usePrefersReducedMotion";

type RevealProps = {
  as?: ElementType;
  /** Delay in milliseconds, for staggering siblings. */
  delay?: number;
  className?: string;
  children: ReactNode;
};

/**
 * Fades and lifts its children 16px once they scroll into view. With reduced
 * motion, without IntersectionObserver, or for anything already on screen at
 * load, it renders plain and visible: there is never an `opacity-0` class
 * unless the element is actually waiting to be revealed.
 */
export function Reveal({
  as = "div",
  delay = 0,
  className = "",
  children,
}: RevealProps) {
  const reduced = usePrefersReducedMotion();
  const { ref, inView, armed } = useInView(0.15);

  let motion = "";
  if (!reduced && armed) {
    motion = inView
      ? "translate-y-0 opacity-100 transition duration-600 ease-out"
      : "translate-y-4 opacity-0";
  }

  return createElement(
    as,
    {
      ref,
      className: `${motion} ${className}`.trim(),
      style:
        !reduced && armed && inView && delay
          ? { transitionDelay: `${delay}ms` }
          : undefined,
    },
    children,
  );
}
