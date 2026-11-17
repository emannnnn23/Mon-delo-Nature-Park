import { Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";

import { contactSchema, type ContactInput } from "../../lib/validation/contact";
import { Button } from "../common/Button";
import { Field } from "./Field";

export type ContactOutcome = "ok" | "rate_limited" | "error";

export type ContactSubmit = (
  input: ContactInput & { honeypot: string; elapsedMs: number },
) => Promise<ContactOutcome>;

type ContactFormProps = {
  onSubmit: ContactSubmit;
};

type FieldName = "fullName" | "email" | "phone" | "subject" | "message";
type Errors = Partial<Record<FieldName, string>>;
type Status = "idle" | "sending" | ContactOutcome;

const FIELD_ORDER: FieldName[] = [
  "fullName",
  "email",
  "phone",
  "subject",
  "message",
];

const MESSAGES: Record<ContactOutcome, string> = {
  ok: "Thank you — your message has been sent. We'll get back to you soon.",
  rate_limited:
    "You've sent several messages recently. Please try again in a little while.",
  error: "Something went wrong sending your message. Please try again.",
};

/**
 * The honeypot is hidden by moving it off-screen inside an aria-hidden
 * wrapper, not with display:none or the hidden attribute: simple bots skip
 * inputs that are not rendered, but still fill one that is merely off-screen.
 * Sighted users never see it, assistive technology ignores the wrapper, and
 * the input itself is out of the tab order with autofill off.
 */
const HONEYPOT_WRAPPER =
  "absolute top-auto -left-[10000px] h-px w-px overflow-hidden";

export function ContactForm({ onSubmit }: ContactFormProps) {
  const [status, setStatus] = useState<Status>("idle");
  const [errors, setErrors] = useState<Errors>({});
  const mountedAt = useRef<number | null>(null);
  const sending = useRef(false);

  // Set in an effect so server rendering and hydration stay identical.
  useEffect(() => {
    mountedAt.current = Date.now();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending.current) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const text = (key: string) => {
      const value = data.get(key);
      return typeof value === "string" ? value : "";
    };

    const parsed = contactSchema.safeParse({
      fullName: text("fullName"),
      email: text("email"),
      phone: text("phone"),
      subject: text("subject"),
      message: text("message"),
    });

    if (!parsed.success) {
      const next: Errors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as FieldName;
        if (!next[key]) next[key] = issue.message;
      }
      setErrors(next);
      setStatus("idle");
      const first = FIELD_ORDER.find((key) => next[key]);
      if (first) {
        (form.elements.namedItem(first) as HTMLElement | null)?.focus();
      }
      return;
    }

    setErrors({});
    sending.current = true;
    setStatus("sending");
    let outcome: ContactOutcome;
    try {
      outcome = await onSubmit({
        ...parsed.data,
        honeypot: text("website"),
        elapsedMs: mountedAt.current ? Date.now() - mountedAt.current : 0,
      });
    } catch {
      outcome = "error";
    } finally {
      sending.current = false;
    }
    if (outcome === "ok") form.reset();
    setStatus(outcome);
  }

  const isSending = status === "sending";
  const outcomeText =
    status === "ok" || status === "rate_limited" || status === "error"
      ? MESSAGES[status]
      : null;

  return (
    <form
      noValidate
      onSubmit={handleSubmit}
      aria-busy={isSending}
      className="relative grid gap-5"
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label="Full name"
          name="fullName"
          required
          autoComplete="name"
          maxLength={100}
          error={errors.fullName}
        />
        <Field
          label="Email"
          name="email"
          type="email"
          required
          autoComplete="email"
          inputMode="email"
          maxLength={254}
          error={errors.email}
        />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label="Phone (optional)"
          name="phone"
          type="tel"
          autoComplete="tel"
          inputMode="tel"
          maxLength={30}
          error={errors.phone}
        />
        <Field
          label="Subject"
          name="subject"
          required
          maxLength={150}
          error={errors.subject}
        />
      </div>
      <Field
        label="Message"
        name="message"
        multiline
        required
        maxLength={5000}
        error={errors.message}
      />

      <div aria-hidden="true" className={HONEYPOT_WRAPPER}>
        <label>
          Leave this field empty
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <Button
          type="submit"
          variant="gold"
          icon={Send}
          disabled={isSending}
          className="disabled:cursor-not-allowed disabled:opacity-60"
        >
          Send Message
        </Button>
        <div aria-live="polite" role="status" className="min-h-6">
          {isSending ? (
            <span className="text-sm text-ink-600">Sending…</span>
          ) : null}
          {outcomeText ? (
            <p
              className={`text-sm font-medium ${
                status === "ok" ? "text-forest-800" : "text-red-700"
              }`}
            >
              {outcomeText}
            </p>
          ) : null}
        </div>
      </div>
    </form>
  );
}
