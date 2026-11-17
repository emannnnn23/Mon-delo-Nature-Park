import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

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
    expect(trap?.closest("[aria-hidden='true']")).not.toBeNull();
    expect(
      screen.queryByRole("textbox", { name: /website/i }),
    ).not.toBeInTheDocument();
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
    render(<ContactForm onSubmit={onSubmit} />);
    await fillValid(user);
    const button = sendButton();
    await user.click(button);
    await waitFor(() => expect(button).toBeDisabled());
    await user.click(button);
    expect(onSubmit).toHaveBeenCalledTimes(1);
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
});
