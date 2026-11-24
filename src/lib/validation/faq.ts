import { z } from "zod";

/**
 * Frequently asked questions. The rules mirror public.faqs: a question of
 * 5-200 characters and an answer of 5-2000. Lengths count code points of the
 * trimmed text (as Postgres does), not UTF-16 units.
 */

export const faqSchema = z
  .object({
    question: z.string().trim(),
    answer: z.string().trim(),
  })
  .superRefine((value, ctx) => {
    const add = (path: string, message: string) =>
      ctx.addIssue({ code: "custom", path: [path], message });

    const questionLength = [...value.question].length;
    if (questionLength === 0) add("question", "Please enter the question.");
    else if (questionLength < 5)
      add("question", "The question must be at least 5 characters.");
    else if (questionLength > 200)
      add("question", "The question must be 200 characters or fewer.");

    const answerLength = [...value.answer].length;
    if (answerLength === 0) add("answer", "Please enter the answer.");
    else if (answerLength < 5)
      add("answer", "The answer must be at least 5 characters.");
    else if (answerLength > 2000)
      add("answer", "The answer must be 2000 characters or fewer.");
  });

export type FaqInput = z.infer<typeof faqSchema>;
