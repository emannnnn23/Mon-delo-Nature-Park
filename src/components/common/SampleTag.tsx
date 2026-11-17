/** Marks content that is placeholder and not yet confirmed by the park. */
export function SampleTag({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full bg-cream-100 px-2.5 py-0.5 text-xs font-semibold tracking-wider text-earth-700 uppercase ring-1 ring-earth-700/25 ${className}`.trim()}
    >
      Sample
    </span>
  );
}
