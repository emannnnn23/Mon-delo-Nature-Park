import { useLayoutEffect, useRef, useState } from "react";

type InView = {
  ref: React.RefObject<HTMLElement | null>;
  /** True until the element is armed, then true again once it scrolls in. */
  inView: boolean;
  /** True once the element was below the fold and is being watched. */
  armed: boolean;
};

/**
 * Reports when an element first scrolls into view. The default state is
 * "in view", so prerendered HTML, no-JS visitors and browsers without
 * IntersectionObserver all see the content. Only an element that starts
 * below the fold is armed (hidden) and then revealed once, at `threshold`.
 */
export function useInView(threshold = 0.15): InView {
  const ref = useRef<HTMLElement | null>(null);
  const [armed, setArmed] = useState(false);
  const [inView, setInView] = useState(true);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;

    const rect = el.getBoundingClientRect();
    const alreadyVisible =
      rect.top < window.innerHeight * (1 - threshold) && rect.bottom > 0;
    // Pixels already on screen when the page loads are never animated.
    if (alreadyVisible && rect.height > 0) return;

    setArmed(true);
    setInView(false);
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, inView, armed };
}
