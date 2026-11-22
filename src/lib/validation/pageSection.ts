import { z } from "zod";

/**
 * The editable text of one page section. Limits and the link rule mirror the
 * constraints on public.page_sections exactly, so a value that passes here is
 * accepted by the database. Every field is a trimmed string; empty strings
 * become null when written (see `emptyToNull` in the admin CRUD service).
 */

/** The database counts characters, so count code points, not UTF-16 units. */
function limited(max: number, message: string) {
  return z
    .string()
    .trim()
    .refine((value) => [...value].length <= max, message);
}

/**
 * page_sections_cta_href_check: `^(/([^/\\[:cntrl:]]|$)|https://)`. A path on
 * this site (not `//host`, not `/\host`, no control characters such as a tab)
 * or an https:// address.
 */
// The control characters are the point of the rule, not an accident.
// eslint-disable-next-line no-control-regex
export const CTA_HREF_PATTERN = /^(\/([^/\\\u0000-\u001f\u007f]|$)|https:\/\/)/;

export const CTA_PAIR_MESSAGE =
  "Add both a button label and a link, or leave both empty.";

export const pageSectionSchema = z
  .object({
    eyebrow: limited(60, "The small heading must be 60 characters or fewer."),
    heading: limited(160, "The title must be 160 characters or fewer."),
    body: limited(4000, "The text must be 4000 characters or fewer."),
    ctaLabel: limited(40, "The button label must be 40 characters or fewer."),
    ctaHref: z
      .string()
      .trim()
      .refine(
        (value) => value === "" || CTA_HREF_PATTERN.test(value),
        "Use a page on this site (starting with /) or a full address starting with https://.",
      ),
  })
  .superRefine((value, ctx) => {
    if ((value.ctaLabel === "") !== (value.ctaHref === "")) {
      ctx.addIssue({
        code: "custom",
        path: ["ctaHref"],
        message: CTA_PAIR_MESSAGE,
      });
    }
  });

export type PageSectionInput = z.infer<typeof pageSectionSchema>;
