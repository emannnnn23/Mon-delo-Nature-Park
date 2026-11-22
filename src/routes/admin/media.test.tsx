import { render, screen } from "@testing-library/react";
import { createRoutesStub } from "react-router";

import { AdminError } from "~/services/admin/errors";

import { ErrorBoundary } from "./media";

function renderFailing(error: unknown) {
  const Stub = createRoutesStub([
    {
      path: "/",
      Component: () => {
        throw error;
      },
      ErrorBoundary,
    },
  ]);
  return render(<Stub />);
}

beforeEach(() => {
  // React logs the thrown error; keep the test output quiet.
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("media route ErrorBoundary", () => {
  it("shows the friendly text of a known error", async () => {
    renderFailing(
      new AdminError(
        "42501",
        "Your session has expired — please sign in again.",
      ),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Your session has expired — please sign in again.",
    );
  });

  it("does not blame the connection for an unknown error", async () => {
    renderFailing(new Error("kaboom"));
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Something went wrong. Please try again.");
    expect(alert).not.toHaveTextContent(/connection/i);
    expect(alert).not.toHaveTextContent("kaboom");
  });
});
