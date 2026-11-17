import { useEffect, useState } from "react";

/**
 * True once the page has scrolled more than `threshold` pixels. Starts false so
 * prerendered markup and the first client render agree.
 */
export function useScrolled(threshold: number): boolean {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const update = () => setScrolled(window.scrollY > threshold);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, [threshold]);

  return scrolled;
}
