import { useNavigation } from "react-router";

/**
 * A 2px gold bar across the top of the window while a navigation is loading.
 * Decorative (`aria-hidden`, not a live region): the page itself announces
 * nothing until it changes. It grows slowly while the loaders run and is a
 * plain full-width bar under reduced motion. The router's first load,
 * including the hydration `clientLoader` pass, is not a navigation, so the
 * state is idle then and nothing shows.
 */
export function NavigationProgress() {
  const { state } = useNavigation();
  if (state === "idle") return null;
  return (
    <div
      aria-hidden="true"
      data-testid="navigation-progress"
      className="pointer-events-none fixed inset-x-0 top-0 z-[70] h-0.5 overflow-hidden"
    >
      <div className="h-full w-full origin-left animate-nav-progress bg-gold-500 motion-reduce:animate-none" />
    </div>
  );
}
