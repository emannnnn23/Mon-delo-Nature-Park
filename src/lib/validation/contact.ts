import { z } from "zod";

/** Longest message the database accepts, in characters (code points). */
export const MESSAGE_MAX_LENGTH = 5000;

/**
 * Fewest milliseconds between a form appearing and its submission. The
 * database function public.submit_contact_message drops (but reports "ok" for)
 * anything sent sooner, as an anti-bot check, so the form waits this long
 * before sending. Keep it equal to `p_elapsed_ms < 3000` in
 * supabase/migrations/20261117000006_contact.sql.
 */
export const MIN_FILL_MS = 3000;

/**
 * Contact form input. Limits mirror the database constraints on
 * public.contact_messages and submit_contact_message exactly. `.trim()` strips
 * all whitespace (tabs and newlines included) before the length checks. Zod
 * measures string length in code points, like Postgres `char_length`, so an
 * emoji counts as one character (contact.test.ts guards this).
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
    .max(
      MESSAGE_MAX_LENGTH,
      `The message must be ${MESSAGE_MAX_LENGTH} characters or fewer.`,
    ),
});

export type ContactInput = z.infer<typeof contactSchema>;
