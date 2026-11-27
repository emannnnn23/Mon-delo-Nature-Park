import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { MemoryRouter } from "react-router";

import { placeholders } from "~/content/placeholders";

import Visit from "./visit";

const submitContactMessage = vi.hoisted(() => vi.fn());
vi.mock("~/services/contact", () => ({ submitContactMessage }));

describe("Visit route contact form", () => {
  it("sends the form through the contact service", async () => {
    submitContactMessage.mockResolvedValue("ok");
    const user = userEvent.setup();
    const loaderData = {
      sections: placeholders.sections.visit,
      faqs: placeholders.faqs,
      settings: placeholders.settings,
    };
    const props = { loaderData } as unknown as ComponentProps<typeof Visit>;
    render(
      <MemoryRouter>
        <Visit {...props} />
      </MemoryRouter>,
    );
    await user.type(screen.getByLabelText(/full name/i), "Ana Reyes");
    await user.type(screen.getByLabelText(/email/i), "ana@example.com");
    await user.type(screen.getByLabelText(/subject/i), "A question");
    await user.type(
      screen.getByRole("textbox", { name: /^message/i }),
      "I would like to ask about visiting.",
    );
    await user.click(screen.getByRole("button", { name: /send message/i }));

    await waitFor(() => expect(submitContactMessage).toHaveBeenCalledTimes(1));
    expect(submitContactMessage.mock.calls[0][0]).toMatchObject({
      fullName: "Ana Reyes",
      email: "ana@example.com",
      honeypot: "",
    });
    expect(await screen.findByText(/thank you/i)).toBeInTheDocument();
  });
});
