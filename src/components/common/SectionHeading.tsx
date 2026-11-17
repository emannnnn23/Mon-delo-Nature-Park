import { Eyebrow, type Tone } from "./Eyebrow";

type SectionHeadingProps = {
  as?: "h1" | "h2" | "h3";
  eyebrow?: string | null;
  title: string;
  subtitle?: string | null;
  /** "light" = light text for dark surfaces, "dark" = dark text for light ones. */
  tone?: Tone;
  align?: "left" | "center";
  className?: string;
};

export function SectionHeading({
  as: Heading = "h2",
  eyebrow,
  title,
  subtitle,
  tone = "dark",
  align = "left",
  className = "",
}: SectionHeadingProps) {
  const isLight = tone === "light";
  const alignment =
    align === "center" ? "items-center text-center" : "items-start";
  return (
    <div className={`flex flex-col gap-3 ${alignment} ${className}`.trim()}>
      {eyebrow ? (
        <Eyebrow tone={tone} align={align}>
          {eyebrow}
        </Eyebrow>
      ) : null}
      <Heading
        className={`font-serif text-3xl leading-tight font-bold text-balance md:text-4xl ${
          isLight ? "text-ivory-50" : "text-forest-900"
        }`}
      >
        {title}
      </Heading>
      {subtitle ? (
        <p
          className={`max-w-prose text-base leading-relaxed md:text-lg ${
            isLight ? "text-ivory-50/85" : "text-ink-600"
          }`}
        >
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}
