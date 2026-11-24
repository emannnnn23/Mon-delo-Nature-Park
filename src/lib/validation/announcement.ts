import { z } from "zod";

import { CTA_HREF_PATTERN } from "~/lib/validation/pageSection";

/**
 * Announcements. The rules mirror public.announcements: a title of 2-120
 * characters, a message of at most 500, a link that is a label and an address
 * together or neither (the address a site path or https://), a start, and an
 * optional end after the start. Lengths count code points of the trimmed text.
 *
 * The start and end are date-times from the form (a `datetime-local` value is
 * the device's own time) or any other string `Date` reads. A valid one is
 * returned as an ISO timestamp, so the database gets an unambiguous instant;
 * an empty end stays empty (written as null).
 */

export const LINK_PAIR_MESSAGE =
  "Add both a link label and a link, or leave both empty.";

function instant(value: string): number {
  return value === "" ? Number.NaN : new Date(value).getTime();
}

export const announcementSchema = z
  .object({
    title: z.string().trim(),
    body: z.string().trim(),
    linkLabel: z.string().trim(),
    linkHref: z.string().trim(),
    startsAt: z.string().trim(),
    endsAt: z.string().trim(),
  })
  .superRefine((value, ctx) => {
    const add = (path: string, message: string) =>
      ctx.addIssue({ code: "custom", path: [path], message });

    const titleLength = [...value.title].length;
    if (titleLength === 0) add("title", "Please enter a title.");
    else if (titleLength < 2)
      add("title", "The title must be at least 2 characters.");
    else if (titleLength > 120)
      add("title", "The title must be 120 characters or fewer.");

    if ([...value.body].length > 500)
      add("body", "The message must be 500 characters or fewer.");

    if (value.linkHref !== "" && !CTA_HREF_PATTERN.test(value.linkHref)) {
      add(
        "linkHref",
        "Use a page on this site (starting with /) or a full address starting with https://.",
      );
    } else if ((value.linkLabel === "") !== (value.linkHref === "")) {
      add("linkHref", LINK_PAIR_MESSAGE);
    }

    const start = instant(value.startsAt);
    if (value.startsAt === "") add("startsAt", "Choose when it starts.");
    else if (Number.isNaN(start))
      add("startsAt", "Choose a valid start date and time.");

    if (value.endsAt !== "") {
      const end = instant(value.endsAt);
      if (Number.isNaN(end)) add("endsAt", "Choose a valid end date and time.");
      else if (!Number.isNaN(start) && end <= start)
        add("endsAt", "The end date must be after the start date.");
    }
  })
  .transform((value) => ({
    ...value,
    startsAt: new Date(value.startsAt).toISOString(),
    endsAt: value.endsAt === "" ? "" : new Date(value.endsAt).toISOString(),
  }));

export type AnnouncementInput = z.output<typeof announcementSchema>;
