import { z } from "zod";

/**
 * Testimonials. The rules mirror public.testimonials: a name of 2-100
 * characters, a quote of 10-600, a rating of 1-5 or none, a source of google,
 * facebook or direct, an https link or none, and a date or none. Lengths count
 * code points of the trimmed text (as Postgres does), not UTF-16 units. Empty
 * optional strings become null when written (see `emptyToNull` in the admin
 * CRUD service).
 */

export const TESTIMONIAL_SOURCES = ["google", "facebook", "direct"] as const;
export type TestimonialSource = (typeof TESTIMONIAL_SOURCES)[number];

/** testimonials_source_url_check: `^https://`. */
export const SOURCE_URL_PATTERN = /^https:\/\//;

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/** A real calendar day in the form 2026-11-02. */
function isIsoDate(value: string): boolean {
  const match = DATE_PATTERN.exec(value);
  if (!match) return false;
  const [year, month, day] = match.slice(1).map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export const testimonialSchema = z
  .object({
    authorName: z.string().trim(),
    quote: z.string().trim(),
    rating: z.number().nullable(),
    source: z.string(),
    sourceUrl: z.string().trim(),
    reviewDate: z.string().trim(),
  })
  .superRefine((value, ctx) => {
    const add = (path: string, message: string) =>
      ctx.addIssue({ code: "custom", path: [path], message });

    const nameLength = [...value.authorName].length;
    if (nameLength === 0) add("authorName", "Please enter the guest's name.");
    else if (nameLength < 2)
      add("authorName", "The name must be at least 2 characters.");
    else if (nameLength > 100)
      add("authorName", "The name must be 100 characters or fewer.");

    const quoteLength = [...value.quote].length;
    if (quoteLength === 0) add("quote", "Please enter what the guest wrote.");
    else if (quoteLength < 10)
      add("quote", "The review must be at least 10 characters.");
    else if (quoteLength > 600)
      add("quote", "The review must be 600 characters or fewer.");

    if (
      value.rating !== null &&
      !(
        Number.isInteger(value.rating) &&
        value.rating >= 1 &&
        value.rating <= 5
      )
    ) {
      add("rating", "Choose a rating from 1 to 5, or no rating.");
    }

    if (!(TESTIMONIAL_SOURCES as readonly string[]).includes(value.source)) {
      add("source", "Choose where the review came from.");
    }

    if (value.sourceUrl !== "" && !SOURCE_URL_PATTERN.test(value.sourceUrl)) {
      add("sourceUrl", "Use a full address starting with https://");
    }

    if (value.reviewDate !== "" && !isIsoDate(value.reviewDate)) {
      add("reviewDate", "Choose a valid date.");
    }
  });

export type TestimonialInput = z.infer<typeof testimonialSchema>;
