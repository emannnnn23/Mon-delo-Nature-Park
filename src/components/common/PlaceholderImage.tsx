import { Leaf } from "lucide-react";
import { useId } from "react";

type PlaceholderImageProps = {
  label?: string;
  className?: string;
};

/**
 * Stand-in for a missing photo: a quiet leaf-pattern tile that fills its
 * container (the parent sets the aspect ratio) and says so in plain words.
 */
export function PlaceholderImage({
  label = "Photo coming soon",
  className = "",
}: PlaceholderImageProps) {
  const patternId = `leaves-${useId().replace(/:/g, "")}`;
  return (
    <div
      role="img"
      aria-label={label}
      className={`relative flex h-full min-h-24 w-full items-center justify-center overflow-hidden bg-linear-to-br from-cream-100 to-ivory-50 ${className}`.trim()}
    >
      <svg
        aria-hidden="true"
        focusable="false"
        className="absolute inset-0 h-full w-full text-forest-800"
      >
        <defs>
          <pattern
            id={patternId}
            width="72"
            height="72"
            patternUnits="userSpaceOnUse"
          >
            <g fill="currentColor" stroke="none" opacity="0.1">
              <path
                transform="translate(18 20) rotate(32)"
                d="M0 -16 C10 -9 10 9 0 16 C-10 9 -10 -9 0 -16Z"
              />
              <path
                transform="translate(54 52) rotate(-48) scale(0.8)"
                d="M0 -16 C10 -9 10 9 0 16 C-10 9 -10 -9 0 -16Z"
              />
            </g>
            <g
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
              strokeLinecap="round"
              opacity="0.12"
            >
              <path transform="translate(18 20) rotate(32)" d="M0 -12 V12" />
              <path
                transform="translate(54 52) rotate(-48) scale(0.8)"
                d="M0 -12 V12"
              />
            </g>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${patternId})`} />
      </svg>
      <span className="relative mx-4 inline-flex items-center gap-2 rounded-full bg-ivory-50/90 px-4 py-2 text-sm font-medium text-earth-700 shadow-sm ring-1 ring-earth-700/15">
        <Leaf aria-hidden="true" className="size-4 text-forest-800" />
        {label}
      </span>
    </div>
  );
}
