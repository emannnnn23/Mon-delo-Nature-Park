import type { Tone } from "./Eyebrow";

type LogoProps = {
  /** "light" = ivory text for dark backgrounds, "dark" = forest text for light ones. */
  tone?: Tone;
  className?: string;
};

const GOLD = "#d6aa55";

/** Mondelos mark (sun over a gold ridge and green hills) with the wordmark. */
export function Logo({ tone = "dark", className = "" }: LogoProps) {
  const isLight = tone === "light";
  const hillBack = isLight ? "#4f8a63" : "#244b3a";
  const hillFront = isLight ? "#7fb48c" : "#183f32";

  return (
    <span
      role="img"
      aria-label="Mondelos Nature Park"
      className={`inline-flex items-center gap-3 ${className}`.trim()}
    >
      <svg
        aria-hidden="true"
        focusable="false"
        viewBox="0 0 64 44"
        className="h-10 w-auto shrink-0"
      >
        <circle cx="45" cy="10" r="5.5" fill={GOLD} />
        <path d="M3 32 L21 8 L30 21 L36 14 L57 32 Z" fill={GOLD} />
        <path
          d="M0 33 C11 27 21 27 30 31 C39 35 50 34 64 26 V36 C64 40 62 42 58 42 H6 C2 42 0 40 0 36 Z"
          fill={hillBack}
        />
        <path
          d="M0 39 C13 33 25 35 34 38 C43 41 53 40 64 34 V38 C64 41 62 42 58 42 H6 C2 42 0 41 0 38 Z"
          fill={hillFront}
        />
      </svg>
      <span aria-hidden="true" className="flex flex-col leading-none">
        <span
          className={`font-serif text-xl font-semibold tracking-[0.16em] ${
            isLight ? "text-ivory-50" : "text-forest-900"
          }`}
        >
          MONDELOS
        </span>
        <span
          className={`mt-1.5 font-sans text-[0.625rem] font-medium tracking-[0.36em] ${
            isLight ? "text-ivory-50/80" : "text-earth-700"
          }`}
        >
          NATURE PARK
        </span>
      </span>
    </span>
  );
}
