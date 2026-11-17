import { render, screen } from "@testing-library/react";
import { createElement } from "react";
import { createRoutesStub } from "react-router";

import { ErrorBoundary, links } from "./root";

function renderBoundary(error: unknown) {
  const Stub = createRoutesStub([
    {
      path: "/",
      Component: () =>
        createElement(ErrorBoundary as never, { error, params: {} }),
    },
  ]);
  return render(createElement(Stub, { initialEntries: ["/"] }));
}

describe("root ErrorBoundary", () => {
  it("shows the styled not-found page for a 404 inside one main landmark", async () => {
    renderBoundary({
      status: 404,
      statusText: "Not Found",
      internal: false,
      data: null,
    });
    expect(
      await screen.findByRole("heading", { level: 1, name: "Page not found" }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("main")).toHaveLength(1);
    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute(
      "href",
      "/",
    );
    expect(screen.getByRole("link", { name: /visit us/i })).toHaveAttribute(
      "href",
      "/visit",
    );
    expect(screen.queryByText(/oops/i)).not.toBeInTheDocument();
  });

  it("shows the styled error page for any other error", async () => {
    renderBoundary(new Error("boom"));
    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "Something went wrong",
      }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("main")).toHaveLength(1);
    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute(
      "href",
      "/",
    );
  });
});

describe("root links", () => {
  it("preloads the Playfair weight the hero heading uses (bold, 700)", () => {
    const preloads = (links() as { rel: string; href: string }[]).filter(
      (link) => link.rel === "preload",
    );
    expect(preloads).toHaveLength(1);
    expect(preloads[0].href).toContain("playfair-display-latin-700-normal");
  });
});
