/**
 * Splits plain text into paragraphs on blank lines. Each paragraph is trimmed;
 * empty ones are dropped. Returns [] for null or blank text.
 */
export function splitParagraphs(text: string | null | undefined): string[] {
  if (!text) return [];
  return text
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 0);
}
