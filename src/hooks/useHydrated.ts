import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * False on the server and during hydration, true on every client render after
 * it. Lets client-only state (such as URL search params, which a prerendered
 * page cannot know) apply only once the markup has been hydrated.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
