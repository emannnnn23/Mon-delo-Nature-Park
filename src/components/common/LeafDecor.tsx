type LeafDecorProps = {
  position: "left" | "right";
  /** Surface the leaves sit on: soft sage on light, brighter green on dark. */
  surface?: "light" | "dark";
  className?: string;
};

const LEAVES = [
  { rotate: -28, scale: 1 },
  { rotate: -2, scale: 1.15 },
  { rotate: 26, scale: 0.95 },
  { rotate: 52, scale: 0.7 },
];

/**
 * Large leaf silhouettes tucked into a section corner, as in the reference.
 * Purely decorative: hidden from assistive tech and from small screens. The
 * parent must be `relative` and clip overflow.
 */
export function LeafDecor({
  position,
  surface = "light",
  className = "",
}: LeafDecorProps) {
  const side = position === "left" ? "left-0 -scale-x-100" : "right-0";
  const color =
    surface === "dark"
      ? "text-forest-800 opacity-90"
      : "text-forest-800 opacity-[0.07]";
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute bottom-0 hidden h-64 w-56 md:block ${side} ${color} ${className}`.trim()}
    >
      <svg viewBox="0 0 220 260" className="h-full w-full" focusable="false">
        {LEAVES.map(({ rotate, scale }) => (
          <g
            key={rotate}
            transform={`translate(175 270) rotate(${rotate}) scale(${scale})`}
          >
            <path
              d="M0 0 C34 -44 40 -118 0 -190 C-40 -118 -34 -44 0 0Z"
              fill="currentColor"
            />
            <path
              d="M0 -6 V-170"
              fill="none"
              stroke="#f8f5ec"
              strokeWidth="1.5"
              strokeLinecap="round"
              opacity="0.35"
            />
          </g>
        ))}
      </svg>
    </div>
  );
}
