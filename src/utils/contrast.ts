function channelToLinear(value: number): number {
  const srgb = value / 255;
  return srgb <= 0.03928 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance(hex: string): number {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) {
    throw new Error(`Invalid hex colour: ${hex}`);
  }
  const int = parseInt(match[1], 16);
  const r = channelToLinear((int >> 16) & 0xff);
  const g = channelToLinear((int >> 8) & 0xff);
  const b = channelToLinear(int & 0xff);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG 2.1 contrast ratio between two #RRGGBB colours, rounded to 2 decimals. */
export function contrastRatio(hexA: string, hexB: string): number {
  const a = relativeLuminance(hexA);
  const b = relativeLuminance(hexB);
  const lighter = Math.max(a, b);
  const darker = Math.min(a, b);
  return Math.round(((lighter + 0.05) / (darker + 0.05)) * 100) / 100;
}
