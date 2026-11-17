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
});
