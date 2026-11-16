import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { contrastRatio } from "../utils/contrast";

const css = readFileSync(resolve(process.cwd(), "src/app.css"), "utf8");

const tokens = new Map<string, string>();
for (const match of css.matchAll(
  /--color-([a-z]+-\d+):\s*(#[0-9a-fA-F]{6})/g,
)) {
  tokens.set(match[1], match[2].toUpperCase());
}

function hexOf(name: string): string {
  const hex = tokens.get(name);
  if (!hex) throw new Error(`Missing token ${name}`);
  return hex;
}

const readmeTokens: Record<string, string> = {
  "forest-900": "#183F32",
  "forest-800": "#244B3A",
  "ivory-50": "#F8F5EC",
  "cream-100": "#EEE8D9",
  "gold-500": "#D6AA55",
  "earth-600": "#806B50",
  "earth-700": "#6E5B43",
  "ink-900": "#262923",
  "ink-600": "#66675F",
  "ink-500": "#77786F",
};

describe("design tokens", () => {
  it.each(Object.entries(readmeTokens))("defines %s as %s", (name, hex) => {
    expect(tokens.get(name)).toBe(hex);
  });

  it("defines exactly the 10 README tokens", () => {
    expect([...tokens.keys()].sort()).toEqual(Object.keys(readmeTokens).sort());
  });

  it("defines the serif and sans font stacks", () => {
    expect(css).toMatch(/--font-serif:\s*"Playfair Display"/);
    expect(css).toMatch(/--font-sans:\s*[^;]*"DM Sans Variable"/);
  });

  const pairs: [string, string][] = [
    ["ink-900", "ivory-50"],
    ["ink-600", "ivory-50"],
    ["ink-600", "cream-100"],
    ["earth-700", "cream-100"],
    ["earth-600", "ivory-50"],
    ["ivory-50", "forest-900"],
    ["gold-500", "forest-900"],
    ["ink-900", "gold-500"],
  ];

  it.each(pairs)("%s on %s meets WCAG AA (>= 4.5)", (fg, bg) => {
    const ratio = contrastRatio(hexOf(fg), hexOf(bg));
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });
});
