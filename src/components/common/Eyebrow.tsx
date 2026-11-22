import type { ReactNode } from "react";

export type Tone = "light" | "dark";

type EyebrowProps = {
  /** "light" = light text for dark surfaces, "dark" = dark text for light ones. */
  tone?: Tone;
  align?: "left" | "center";
  className?: string;
  children: ReactNode;
};

/** Small tracked label with a gold hairline, as in the visual reference. */
export function Eyebrow({
  tone = "dark",
  align = "left",
  className = "",
  children,
}: EyebrowProps) {
  const color = tone === "light" ? "text-gold-500" : "text-earth-700";
  const rule = (
    <span aria-hidden="true" className="h-px w-10 bg-gold-500 md:w-14" />
  );
  return (
    <p
      className={`inline-flex items-center gap-3 text-sm font-medium tracking-[0.22em] uppercase ${color} ${className}`.trim()}
    >
      {align === "center" ? rule : null}
      <span>{children}</span>
      {rule}
    </p>
  );
}
