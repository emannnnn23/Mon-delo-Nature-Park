import { z } from "zod";

/**
 * Contact form input. Limits mirror the database constraints on
 * public.contact_messages and submit_contact_message exactly. `.trim()` strips
 * all whitespace (tabs and newlines included) before the length checks.
 */
export const contactSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Please enter your full name.")
    .max(100, "Your name must be 100 characters or fewer."),
  email: z
    .string()
    .trim()
    .max(254, "Your email must be 254 characters or fewer.")
    .pipe(z.email("Please enter a valid email address.")),
  phone: z
    .string()
    .trim()
    .regex(
      /^[0-9 +()-]{0,30}$/,
      "Use digits, spaces and + ( ) - only, up to 30 characters.",
    )
    .optional()
    .transform((value) => (value === "" ? undefined : value)),
  subject: z
    .string()
    .trim()
    .min(2, "Please enter a subject.")
    .max(150, "The subject must be 150 characters or fewer."),
  message: z
    .string()
    .trim()
    .min(10, "Please write a message of at least 10 characters.")
    .max(5000, "The message must be 5000 characters or fewer."),
});

export type ContactInput = z.infer<typeof contactSchema>;
