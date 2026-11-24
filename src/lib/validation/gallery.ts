import { z } from "zod";

import { SLUG_MAX, SLUG_PATTERN } from "~/lib/validation/attraction";

/**
 * Gallery categories and photos. The rules mirror public.gallery_categories
 * (a name that is not blank, a slug of lowercase words joined by single
 * hyphens) and public.gallery_images (a nullable category id). The database
 * sets no upper limit on the name, slug or caption; the limits here (60, 80,
 * 200) only keep them sensible. Lengths count code points of the trimmed text
 * (as Postgres does), not UTF-16 units. Empty optional strings become null
 * when written (see `emptyToNull` in the admin CRUD service).
 */

export const CATEGORY_NAME_MAX = 60;
export const CAPTION_MAX = 200;

/** Any id in the 8-4-4-4-12 form, as the other admin routes accept. */
const ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const galleryCategorySchema = z
  .object({
    name: z.string().trim(),
    slug: z.string().trim(),
    isPublished: z.boolean(),
  })
  .superRefine((value, ctx) => {
    const add = (path: string, message: string) =>
      ctx.addIssue({ code: "custom", path: [path], message });

    if (value.name === "") add("name", "Please enter a name.");
    else if ([...value.name].length > CATEGORY_NAME_MAX)
      add("name", "The name must be 60 characters or fewer.");

    if (value.slug === "") add("slug", "Please enter a web address.");
    else if (!SLUG_PATTERN.test(value.slug))
      add(
        "slug",
        "Use lowercase letters, numbers and single hyphens, like sunrise-views.",
      );
    else if ([...value.slug].length > SLUG_MAX)
      add("slug", "The web address must be 80 characters or fewer.");
  });

export const galleryImageSchema = z
  .object({
    caption: z.string().trim(),
    categoryId: z
      .string()
      .regex(ID_PATTERN, { error: "Choose one of the categories." })
      .nullable(),
    isFeatured: z.boolean(),
    isPublished: z.boolean(),
  })
  .superRefine((value, ctx) => {
    if ([...value.caption].length > CAPTION_MAX) {
      ctx.addIssue({
        code: "custom",
        path: ["caption"],
        message: "The caption must be 200 characters or fewer.",
      });
    }
  });

export type GalleryCategoryInput = z.infer<typeof galleryCategorySchema>;
export type GalleryImageInput = z.infer<typeof galleryImageSchema>;
