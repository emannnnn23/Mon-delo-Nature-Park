import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";

import { NotFoundContent } from "./NotFoundPage";

describe("NotFoundContent", () => {
  it("asks search engines not to index the page it appears on", () => {
    render(
      <MemoryRouter>
        <NotFoundContent />
      </MemoryRouter>,
    );
    expect(
      screen.getByRole("heading", { level: 1, name: "Page not found" }),
    ).toBeInTheDocument();
    const robots = document.head.querySelector('meta[name="robots"]');
    expect(robots).toHaveAttribute("content", "noindex");
  });
});
