import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { usePrefersReducedMotion } from "../../hooks/usePrefersReducedMotion";
import type { Testimonial } from "../../types/content";

type TestimonialSliderProps = { testimonials: Testimonial[] };

const ADVANCE_MS = 7000;

const arrowClass =
  "inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-ivory-50/40 text-ivory-50 transition-colors hover:border-gold-500 hover:text-gold-500";

/**
 * One review at a time with previous/next buttons and dots. Auto-advances
 * every 7s unless reduced motion is on or the slider is hovered or focused;
 * whenever it is not auto-advancing, changes are announced politely.
 */
export function TestimonialSlider({ testimonials }: TestimonialSliderProps) {
  const reduced = usePrefersReducedMotion();
  const [index, setIndex] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const count = testimonials.length;
  const autoAdvance = count > 1 && !reduced && !hovered && !focused;

  useEffect(() => {
    if (!autoAdvance) return;
    const timer = window.setInterval(
      () => setIndex((i) => (i + 1) % count),
      ADVANCE_MS,
    );
    return () => window.clearInterval(timer);
  }, [autoAdvance, count]);

  if (count === 0) return null;
  const current = testimonials[index % count];
  const go = (next: number) => setIndex((next + count) % count);

  return (
    <div
      className="w-full"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setFocused(false);
        }
      }}
    >
      <div className="flex items-center gap-3 sm:gap-5">
        {count > 1 ? (
          <button
            type="button"
            aria-label="Previous review"
            onClick={() => go(index - 1)}
            className={arrowClass}
          >
            <ChevronLeft aria-hidden="true" className="size-5" />
          </button>
        ) : null}
        <figure
          aria-live={autoAdvance ? "off" : "polite"}
          className="min-h-36 flex-1 text-center"
        >
          <blockquote className="font-serif text-lg leading-relaxed text-ivory-50 italic md:text-xl">
            <p>&ldquo;{current.quote}&rdquo;</p>
          </blockquote>
          <figcaption className="mt-4 text-sm font-medium text-ivory-50/80">
            — {current.authorName}
          </figcaption>
        </figure>
        {count > 1 ? (
          <button
            type="button"
            aria-label="Next review"
            onClick={() => go(index + 1)}
            className={arrowClass}
          >
            <ChevronRight aria-hidden="true" className="size-5" />
          </button>
        ) : null}
      </div>

      {count > 1 ? (
        <div className="mt-2 flex justify-center">
          {testimonials.map((t, i) => (
            <button
              key={t.id}
              type="button"
              aria-label={`Show review ${i + 1} of ${count}`}
              aria-current={i === index % count ? "true" : undefined}
              onClick={() => go(i)}
              className="group inline-flex size-11 items-center justify-center rounded-full"
            >
              <span
                aria-hidden="true"
                className={`block size-2 rounded-full transition-colors ${
                  i === index % count
                    ? "bg-gold-500"
                    : "bg-ivory-50/40 group-hover:bg-ivory-50/70"
                }`}
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
