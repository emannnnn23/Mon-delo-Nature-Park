import { z } from "zod";

import { ATTRACTION_ICONS } from "~/types/content";

/**
 * One attraction or experience. The rules mirror public.attractions: the slug
 * pattern, the icon list, "an experience needs an icon", a name that is not
 * blank and a summary of 1 to 160 characters after trimming. The database
 * sets no upper limit on the name, slug or description; the limits here (120,
 * 80, 8000) only keep them sensible. Lengths count code points (as Postgres
 * does), not UTF-16 units. Empty optional strings become null when written
 * (see `emptyToNull` in the admin CRUD service).
 *
 * Only what the form offers is checked. An experience has no web address
 * field and no description (the website shows neither), so those two are not
 * checked for an experience.
 */

/** attractions_slug_check: lowercase words joined by single hyphens. */
export const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export const SLUG_MAX = 80;
export const SUMMARY_MAX = 160;

export const EXPERIENCE_ICON_MESSAGE = "Experiences need an icon.";

/** Characters as the database counts them: code points of the trimmed text. */
export function characterCount(value: string): number {
  return [...value.trim()].length;
}

export const attractionSchema = z
  .object({
    kind: z.enum(["attraction", "experience"], {
      error: "Choose attraction or experience.",
    }),
    name: z.string().trim(),
    slug: z.string().trim(),
    summary: z.string().trim(),
    description: z.string().trim(),
    icon: z
      .enum(ATTRACTION_ICONS, { error: "Choose one of the icons." })
      .nullable(),
    isFeatured: z.boolean(),
    isPublished: z.boolean(),
  })
  .superRefine((value, ctx) => {
    const add = (path: string, message: string) =>
      ctx.addIssue({ code: "custom", path: [path], message });

    if (value.name === "") add("name", "Please enter a name.");
    else if ([...value.name].length > 120)
      add("name", "The name must be 120 characters or fewer.");

    if (value.summary === "") add("summary", "Please add a short summary.");
    else if ([...value.summary].length > SUMMARY_MAX)
      add("summary", "The summary must be 160 characters or fewer.");

    if (value.kind === "experience" && value.icon === null) {
      add("icon", EXPERIENCE_ICON_MESSAGE);
    }

    if (value.kind === "attraction") {
      if (value.slug === "") add("slug", "Please enter a web address.");
      else if (!SLUG_PATTERN.test(value.slug))
        add(
          "slug",
          "Use lowercase letters, numbers and single hyphens, like hilltop-view-deck.",
        );
      else if ([...value.slug].length > SLUG_MAX)
        add("slug", "The web address must be 80 characters or fewer.");

      if ([...value.description].length > 8000)
        add("description", "The description must be 8000 characters or fewer.");
    }
  });

export type AttractionInput = z.infer<typeof attractionSchema>;
