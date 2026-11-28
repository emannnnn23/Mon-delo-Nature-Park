const ROWS = [0, 1, 2];

/**
 * Placeholder for an admin page while its data loads: a heading bar and three
 * list rows. Decorative; the one polite "Loading" status is what a screen
 * reader hears. The pulse stops under reduced motion.
 */
export function AdminListSkeleton() {
  return (
    <div role="status" aria-label="Loading">
      <span className="sr-only">Loading…</span>
      <div aria-hidden="true">
        <div className="h-9 w-56 animate-pulse rounded-lg bg-cream-100 motion-reduce:animate-none" />
        <ul className="mt-8 flex flex-col gap-3">
          {ROWS.map((row) => (
            <li
              key={row}
              data-testid="skeleton-row"
              className="flex h-20 animate-pulse items-center gap-4 rounded-xl border border-cream-100 bg-white px-4 motion-reduce:animate-none"
            >
              <div className="flex-1">
                <div className="h-4 w-2/5 rounded bg-cream-100" />
                <div className="mt-3 h-3 w-3/5 rounded bg-cream-100" />
              </div>
              <div className="h-9 w-24 rounded-full bg-cream-100" />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
