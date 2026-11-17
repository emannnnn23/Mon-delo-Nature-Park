import type { ReactNode } from "react";
import { Eyebrow } from "../components/common/Eyebrow";
import { LeafDecor } from "../components/common/LeafDecor";

type StatusScreenProps = {
  eyebrow: string;
  title: string;
  children: ReactNode;
  /** The buttons under the message. */
  actions: ReactNode;
};

/**
 * Shared look of the "page not found" and "something went wrong" screens: a
 * quiet ivory panel with a trail-map motif, the h1, one line and the buttons.
 * Renders a section, so it fits inside the layout's (or root's) main.
 */
export function StatusScreen({
  eyebrow,
  title,
  children,
  actions,
}: StatusScreenProps) {
  return (
    <section
      aria-labelledby="route-error-title"
      className="relative isolate flex flex-1 items-center overflow-hidden bg-ivory-50 px-5 py-20 sm:px-8 md:py-28"
    >
      <LeafDecor position="right" className="-z-10" />
      {/* Faint contour lines, like a trail map that runs off the page. */}
      <svg
        aria-hidden="true"
        focusable="false"
        viewBox="0 0 600 400"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 -z-20 h-full w-full text-forest-900"
      >
        <g fill="none" stroke="currentColor" strokeOpacity="0.06">
          {[70, 120, 175, 235, 300, 370].map((r, i) => (
            <ellipse
              key={r}
              cx="470"
              cy="120"
              rx={r * 1.3}
              ry={r * 0.8}
              strokeWidth="1.5"
              transform={`rotate(${-12 + i * 3} 470 120)`}
            />
          ))}
        </g>
      </svg>
      <div className="mx-auto w-full max-w-2xl">
        <Eyebrow>{eyebrow}</Eyebrow>
        <h1
          id="route-error-title"
          className="mt-4 font-serif text-4xl leading-tight font-bold text-balance text-forest-900 md:text-6xl"
        >
          {title}
        </h1>
        <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink-600">
          {children}
        </p>
        <div className="mt-9 flex flex-wrap gap-3">{actions}</div>
      </div>
    </section>
  );
}
