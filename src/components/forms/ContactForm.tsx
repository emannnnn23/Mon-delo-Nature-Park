import { Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";

import {
  contactSchema,
  MESSAGE_MAX_LENGTH,
  MIN_FILL_MS,
  type ContactInput,
} from "../../lib/validation/contact";
import { useHydrated } from "../../hooks/useHydrated";
import { Button } from "../common/Button";
import { Field } from "./Field";

export type ContactOutcome = "ok" | "rate_limited" | "error";

export type ContactSubmit = (
  input: ContactInput & { honeypot: string; elapsedMs: number },
) => Promise<ContactOutcome>;

type ContactFormProps = {
  /** Without a handler the form cannot be sent and says so. */
  onSubmit?: ContactSubmit;
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
  const [messageLength, setMessageLength] = useState(0);
  const mountedAt = useRef<number | null>(null);
  const submittingRef = useRef(false);
  const statusRef = useRef<HTMLDivElement>(null);
  const hydrated = useHydrated();

  // `elapsedMs` is the time since the form first rendered in the browser. It is
  // set in an effect so server rendering and hydration stay identical.
  // `hydrated` is false on the server and during hydration, and the submit
  // button stays disabled until it flips: a prerendered form submitted before
  // the page hydrates would otherwise reload the page with the typed details in
  // the address bar.
  useEffect(() => {
    mountedAt.current = Date.now();
  }, []);

  // After a send, focus moves to the status line so keyboard and screen reader
  // users land on the result. Validation errors keep their own focus handling.
  useEffect(() => {
    if (status === "ok" || status === "rate_limited" || status === "error") {
      statusRef.current?.focus();
    }
  }, [status]);

  const elapsedMs = () => {
    mountedAt.current ??= Date.now();
    return Date.now() - mountedAt.current;
  };

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current || !onSubmit) return;
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
    submittingRef.current = true;
    setStatus("sending");
    let outcome: ContactOutcome;
    try {
      // The database silently discards a message sent within MIN_FILL_MS of
      // the form appearing (anti-bot). A quick real visitor would be told
      // "thank you" for a message that was never stored, so the send waits
      // out the rest of that time first. Timers can fire a hair early, hence
      // the loop on the clock rather than one fixed wait.
      let remaining = MIN_FILL_MS - elapsedMs();
      while (remaining > 0) {
        await new Promise((resolve) => setTimeout(resolve, remaining));
        remaining = MIN_FILL_MS - elapsedMs();
      }
      outcome = await onSubmit({
        ...parsed.data,
        honeypot: text("website"),
        elapsedMs: elapsedMs(),
      });
    } catch {
      outcome = "error";
    } finally {
      submittingRef.current = false;
    }
    if (outcome === "ok") {
      form.reset();
      setMessageLength(0);
    }
    setStatus(outcome);
  }

  const isSending = status === "sending";
  const messageTooLong = messageLength > MESSAGE_MAX_LENGTH;
  const outcomeText =
    status === "ok" || status === "rate_limited" || status === "error"
      ? MESSAGES[status]
      : null;

  return (
    <form
      method="post"
      noValidate
      onSubmit={handleSubmit}
      aria-busy={isSending}
      className="relative grid gap-5"
    >
      <p className="text-sm text-ink-600">* required</p>
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
        // No maxLength: the browser would cut text silently. The count below
        // and the schema message explain the limit instead.
        hint={`${messageLength} / ${MESSAGE_MAX_LENGTH}${
          messageTooLong ? " — too long" : ""
        }`}
        aria-invalid={messageTooLong || errors.message ? true : undefined}
        // Count what the schema measures (trimmed code points), so "too
        // long" never shows for a message the form accepts.
        onChange={(event) =>
          setMessageLength([...event.currentTarget.value.trim()].length)
        }
        error={errors.message}
      />

      <div aria-hidden="true" className={HONEYPOT_WRAPPER}>
        <label>
          Leave this field empty
          <input
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            data-1p-ignore
            data-lpignore="true"
            data-bwignore
            data-form-type="other"
          />
        </label>
      </div>

      {onSubmit ? null : (
        <p className="text-sm font-medium text-ink-900">
          Online messages open soon — please check back.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-4">
        <Button
          type="submit"
          variant="gold"
          icon={Send}
          disabled={isSending || !hydrated || !onSubmit}
          className="disabled:cursor-not-allowed disabled:opacity-60"
        >
          Send Message
        </Button>
        <div
          ref={statusRef}
          tabIndex={-1}
          aria-live="polite"
          role="status"
          className="min-h-6 outline-none"
        >
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
