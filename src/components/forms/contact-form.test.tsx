import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderToString } from "react-dom/server";

import { ContactForm, type ContactSubmit } from "./ContactForm";

async function fillValid(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/full name/i), "Ana Reyes");
  await user.type(screen.getByLabelText(/email/i), "ana@example.com");
  await user.type(screen.getByLabelText(/subject/i), "A question");
  await user.type(
    screen.getByLabelText(/message/i),
    "I would like to ask about visiting.",
  );
}

const sendButton = () => screen.getByRole("button", { name: /send message/i });

describe("ContactForm", () => {
  it("shows four errors on an empty submit and links them to the fields", async () => {
    const onSubmit = vi.fn<ContactSubmit>().mockResolvedValue("ok");
    const user = userEvent.setup();
    render(<ContactForm onSubmit={onSubmit} />);
    await user.click(sendButton());

    expect(screen.getAllByRole("alert")).toHaveLength(4);
    const name = screen.getByLabelText(/full name/i);
    expect(name).toHaveAttribute("aria-invalid", "true");
    const describedBy = name.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    expect(document.getElementById(describedBy as string)).toHaveTextContent(
      /name/i,
    );
    expect(name).toHaveFocus();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("marks required fields and leaves phone optional", () => {
    render(<ContactForm onSubmit={vi.fn<ContactSubmit>()} />);
    expect(screen.getByLabelText(/full name/i)).toBeRequired();
    expect(screen.getByLabelText(/email/i)).toBeRequired();
    expect(screen.getByLabelText(/subject/i)).toBeRequired();
    expect(screen.getByLabelText(/message/i)).toBeRequired();
    expect(screen.getByLabelText(/phone/i)).not.toBeRequired();
  });

  it("hides the honeypot from assistive technology and the tab order", () => {
    const { container } = render(
      <ContactForm onSubmit={vi.fn<ContactSubmit>()} />,
    );
    const trap = container.querySelector<HTMLInputElement>(
      "input[name='website']",
    );
    expect(trap).not.toBeNull();
    expect(trap).toHaveAttribute("tabindex", "-1");
    expect(trap).toHaveAttribute("autocomplete", "off");
    expect(trap).toHaveAttribute("data-1p-ignore");
    expect(trap).toHaveAttribute("data-lpignore", "true");
    expect(trap).toHaveAttribute("data-bwignore");
    expect(trap).toHaveAttribute("data-form-type", "other");
    const wrapper = trap?.closest("[aria-hidden='true']");
    expect(wrapper).not.toBeNull();
    expect(wrapper).toContainElement(trap);
    // The wrapper is hidden from the accessibility tree, so the label that
    // would name the trap is not exposed as a textbox.
    expect(wrapper?.textContent).toMatch(/leave this field empty/i);
    expect(
      screen.queryByRole("textbox", { name: /leave this field empty/i }),
    ).not.toBeInTheDocument();
    expect(screen.getAllByRole("textbox")).toHaveLength(5);
  });

  it("posts, so a submit before hydration never puts details in the URL", () => {
    const { container } = render(
      <ContactForm onSubmit={vi.fn<ContactSubmit>()} />,
    );
    expect(container.querySelector("form")).toHaveAttribute("method", "post");
  });

  it("renders the submit button disabled before hydration, enabled after", () => {
    const html = renderToString(
      <ContactForm onSubmit={vi.fn<ContactSubmit>()} />,
    );
    expect(html).toMatch(/<button[^>]*disabled/);
    render(<ContactForm onSubmit={vi.fn<ContactSubmit>()} />);
    expect(sendButton()).toBeEnabled();
  });

  it("notes that starred fields are required", () => {
    render(<ContactForm onSubmit={vi.fn<ContactSubmit>()} />);
    expect(screen.getByText("* required")).toBeInTheDocument();
  });

  it("without a handler stays closed: note shown, button disabled, nothing sent", async () => {
    const user = userEvent.setup();
    const { container } = render(<ContactForm />);
    expect(
      screen.getByText("Online messages open soon — please check back."),
    ).toBeInTheDocument();
    expect(sendButton()).toBeDisabled();
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    await fillValid(user);
    fireEvent.submit(container.querySelector("form") as HTMLFormElement);
    expect(screen.queryByText(/thank you/i)).not.toBeInTheDocument();
  });

  it("with a handler shows no pre-launch note", () => {
    render(<ContactForm onSubmit={vi.fn<ContactSubmit>()} />);
    expect(screen.queryByText(/open soon/i)).not.toBeInTheDocument();
  });

  it("submits valid input with an empty honeypot and the elapsed time", async () => {
    const onSubmit = vi.fn<ContactSubmit>().mockResolvedValue("ok");
    const user = userEvent.setup();
    render(<ContactForm onSubmit={onSubmit} />);
    await fillValid(user);
    await user.click(sendButton());

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const arg = onSubmit.mock.calls[0][0];
    expect(arg.honeypot).toBe("");
    expect(typeof arg.elapsedMs).toBe("number");
    expect(arg.elapsedMs).toBeGreaterThanOrEqual(0);
    expect(arg.fullName).toBe("Ana Reyes");
    expect(arg.phone).toBeUndefined();
    expect(
      await screen.findByText(
        "Thank you — your message has been sent. We'll get back to you soon.",
      ),
    ).toBeInTheDocument();
  });

  it("passes on what a bot typed in the honeypot", async () => {
    const onSubmit = vi.fn<ContactSubmit>().mockResolvedValue("ok");
    const user = userEvent.setup();
    const { container } = render(<ContactForm onSubmit={onSubmit} />);
    await fillValid(user);
    const trap = container.querySelector(
      "input[name='website']",
    ) as HTMLInputElement;
    await user.type(trap, "http://spam.example");
    await user.click(sendButton());
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0].honeypot).toBe("http://spam.example");
  });

  it("shows the rate-limit message", async () => {
    const onSubmit = vi.fn<ContactSubmit>().mockResolvedValue("rate_limited");
    const user = userEvent.setup();
    render(<ContactForm onSubmit={onSubmit} />);
    await fillValid(user);
    await user.click(sendButton());
    expect(
      await screen.findByText(
        "You've sent several messages recently. Please try again in a little while.",
      ),
    ).toBeInTheDocument();
  });

  it("shows the error message and keeps what was typed", async () => {
    const onSubmit = vi.fn<ContactSubmit>().mockResolvedValue("error");
    const user = userEvent.setup();
    render(<ContactForm onSubmit={onSubmit} />);
    await fillValid(user);
    await user.click(sendButton());
    expect(
      await screen.findByText(
        "Something went wrong sending your message. Please try again.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/full name/i)).toHaveValue("Ana Reyes");
  });

  it("treats a rejected submit as an error", async () => {
    const onSubmit = vi
      .fn<ContactSubmit>()
      .mockRejectedValue(new Error("boom"));
    const user = userEvent.setup();
    render(<ContactForm onSubmit={onSubmit} />);
    await fillValid(user);
    await user.click(sendButton());
    expect(
      await screen.findByText(/something went wrong/i),
    ).toBeInTheDocument();
  });

  it("disables the button while sending and ignores a second submit", async () => {
    let resolve: (v: "ok") => void = () => {};
    const onSubmit = vi.fn<ContactSubmit>().mockImplementation(
      () =>
        new Promise((r) => {
          resolve = r;
        }),
    );
    const user = userEvent.setup();
    const { container } = render(<ContactForm onSubmit={onSubmit} />);
    await fillValid(user);
    const form = container.querySelector("form") as HTMLFormElement;
    // Two submits in the same tick, before React can re-render the disabled
    // button: only the ref guard stops the second.
    fireEvent.submit(form);
    fireEvent.submit(form);
    expect(onSubmit).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(sendButton()).toBeDisabled());
    resolve("ok");
    await screen.findByText(/thank you/i);
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("announces outcomes in a polite live region", async () => {
    const onSubmit = vi.fn<ContactSubmit>().mockResolvedValue("ok");
    const user = userEvent.setup();
    render(<ContactForm onSubmit={onSubmit} />);
    await fillValid(user);
    await user.click(sendButton());
    const text = await screen.findByText(/thank you/i);
    expect(text.closest("[aria-live='polite']")).not.toBeNull();
  });

  it("sends once on a double click", async () => {
    const onSubmit = vi
      .fn<ContactSubmit>()
      .mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve("ok"), 20)),
      );
    const user = userEvent.setup();
    render(<ContactForm onSubmit={onSubmit} />);
    await fillValid(user);
    await user.dblClick(sendButton());
    await screen.findByText(/thank you/i);
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("lets the ref, not the disabled button, stop a repeat submit while one is pending", async () => {
    // The submit event is fired on the form itself, so the disabled button
    // cannot stop it: only the ref guard can, even after React re-rendered.
    let resolve: (v: "ok") => void = () => {};
    const onSubmit = vi.fn<ContactSubmit>().mockImplementation(
      () =>
        new Promise((r) => {
          resolve = r;
        }),
    );
    const user = userEvent.setup();
    const { container } = render(<ContactForm onSubmit={onSubmit} />);
    await fillValid(user);
    const form = container.querySelector("form") as HTMLFormElement;
    fireEvent.submit(form);
    await waitFor(() => expect(sendButton()).toBeDisabled());
    fireEvent.submit(form);
    fireEvent.submit(form);
    expect(onSubmit).toHaveBeenCalledTimes(1);
    resolve("ok");
    await screen.findByText(/thank you/i);
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("allows another send after a failed one", async () => {
    const onSubmit = vi
      .fn<ContactSubmit>()
      .mockResolvedValueOnce("error")
      .mockResolvedValueOnce("ok");
    const user = userEvent.setup();
    render(<ContactForm onSubmit={onSubmit} />);
    await fillValid(user);
    await user.click(sendButton());
    await screen.findByText(/something went wrong/i);
    expect(sendButton()).toBeEnabled();
    await user.click(sendButton());
    await screen.findByText(/thank you/i);
    expect(onSubmit).toHaveBeenCalledTimes(2);
  });

  it("allows another send after a rejected one", async () => {
    const onSubmit = vi
      .fn<ContactSubmit>()
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValueOnce("ok");
    const user = userEvent.setup();
    render(<ContactForm onSubmit={onSubmit} />);
    await fillValid(user);
    await user.click(sendButton());
    await screen.findByText(/something went wrong/i);
    await user.click(sendButton());
    await screen.findByText(/thank you/i);
    expect(onSubmit).toHaveBeenCalledTimes(2);
  });

  it("shows a live character count against the real limit", async () => {
    const user = userEvent.setup();
    render(<ContactForm onSubmit={vi.fn<ContactSubmit>()} />);
    const message = screen.getByLabelText(/message/i);
    expect(screen.getByText("0 / 5000")).toBeInTheDocument();
    await user.type(message, "Hello there");
    expect(screen.getByText("11 / 5000")).toBeInTheDocument();
    expect(message).toHaveAccessibleDescription("11 / 5000");
  });

  it("counts characters the way the database does and never truncates", () => {
    render(<ContactForm onSubmit={vi.fn<ContactSubmit>()} />);
    const message = screen.getByLabelText(/message/i);
    expect(message).not.toHaveAttribute("maxlength");
    fireEvent.change(message, { target: { value: "\u{1F33F}".repeat(3) } });
    expect(screen.getByText("3 / 5000")).toBeInTheDocument();
    fireEvent.change(message, { target: { value: "a".repeat(5001) } });
    expect(screen.getByText("5001 / 5000 — too long")).toBeInTheDocument();
    expect(message).toHaveValue("a".repeat(5001));
  });

  it("flags an over-long message with words and aria-invalid, not live announcements", () => {
    render(<ContactForm onSubmit={vi.fn<ContactSubmit>()} />);
    const message = screen.getByLabelText(/message/i);
    fireEvent.change(message, { target: { value: "a".repeat(5000) } });
    expect(screen.getByText("5000 / 5000")).toBeInTheDocument();
    expect(message).not.toHaveAttribute("aria-invalid");
    fireEvent.change(message, { target: { value: "a".repeat(5001) } });
    const hint = screen.getByText("5001 / 5000 — too long");
    expect(message).toHaveAttribute("aria-invalid", "true");
    expect(message).toHaveAccessibleDescription("5001 / 5000 — too long");
    expect(hint.closest("[aria-live]")).toBeNull();
    expect(hint).not.toHaveAttribute("role");
    fireEvent.change(message, { target: { value: "a".repeat(4000) } });
    expect(message).not.toHaveAttribute("aria-invalid");
    expect(screen.getByText("4000 / 5000")).toBeInTheDocument();
  });

  it("explains an over-long message on submit instead of cutting it", async () => {
    const onSubmit = vi.fn<ContactSubmit>().mockResolvedValue("ok");
    const user = userEvent.setup();
    render(<ContactForm onSubmit={onSubmit} />);
    await fillValid(user);
    fireEvent.change(screen.getByLabelText(/message/i), {
      target: { value: "a".repeat(5001) },
    });
    await user.click(sendButton());
    expect(
      await screen.findByText(/5000 characters or fewer/i),
    ).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("resets the count after a successful send", async () => {
    const onSubmit = vi.fn<ContactSubmit>().mockResolvedValue("ok");
    const user = userEvent.setup();
    render(<ContactForm onSubmit={onSubmit} />);
    await fillValid(user);
    await user.click(sendButton());
    await screen.findByText(/thank you/i);
    expect(screen.getByText("0 / 5000")).toBeInTheDocument();
  });

  it.each([
    ["ok", /thank you/i],
    ["rate_limited", /several messages recently/i],
    ["error", /something went wrong/i],
  ] as const)(
    "moves focus to the status line after %s",
    async (outcome, text) => {
      const onSubmit = vi.fn<ContactSubmit>().mockResolvedValue(outcome);
      const user = userEvent.setup();
      render(<ContactForm onSubmit={onSubmit} />);
      await fillValid(user);
      await user.click(sendButton());
      const line = (await screen.findByText(text)).closest("[role='status']");
      expect(line).not.toBeNull();
      expect(line).toHaveAttribute("aria-live", "polite");
      await waitFor(() => expect(line).toHaveFocus());
    },
  );

  it("keeps focus where it is until a result arrives", async () => {
    const onSubmit = vi
      .fn<ContactSubmit>()
      .mockImplementation(() => new Promise(() => {}));
    const user = userEvent.setup();
    render(<ContactForm onSubmit={onSubmit} />);
    await fillValid(user);
    await user.click(sendButton());
    await screen.findByText(/sending/i);
    expect(screen.getByRole("status")).not.toHaveFocus();
  });

  it.each([
    ["ok", /thank you/i],
    ["rate_limited", /several messages recently/i],
    ["error", /something went wrong/i],
  ] as const)(
    "never invents contact details in the %s message",
    async (outcome, text) => {
      const user = userEvent.setup();
      render(
        <ContactForm
          onSubmit={vi.fn<ContactSubmit>().mockResolvedValue(outcome)}
        />,
      );
      await fillValid(user);
      await user.click(sendButton());
      const line = await screen.findByText(text);
      expect(line.textContent).not.toMatch(/@|\d{3}|tel|call|phone|e-?mail/i);
    },
  );
});
