import { act, render, screen, waitFor } from "@testing-library/react";
import { createRoutesStub, data, useRouteError } from "react-router";

import { AdminRouteError } from "~/admin/components/AdminRouteError";
import { RouteErrorContent } from "~/pages/RouteErrorContent";

function PublicBoundary() {
  return <RouteErrorContent error={useRouteError()} />;
}

function AdminBoundary() {
  return <AdminRouteError title="Photos" entity="photo" />;
}

function renderBoundary(
  Boundary: () => React.ReactNode,
  loader: () => unknown,
) {
  const Stub = createRoutesStub([
    { path: "/", loader, Component: () => null, ErrorBoundary: Boundary },
  ]);
  return render(<Stub initialEntries={["/"]} />);
}

describe.each([
  ["a public route", PublicBoundary, /couldn't load this page/i],
  ["an admin route", AdminBoundary, /retry/i],
] as const)("%s error boundary logging", (_name, Boundary, shown) => {
  let error: ReturnType<typeof vi.spyOn>;
  const logged = () =>
    error.mock.calls.filter((c: unknown[]) =>
      String(c[0]).startsWith("Route error boundary"),
    );
  beforeEach(() => {
    error = vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => error.mockRestore());

  it("logs a generic error once, with its name and message only", async () => {
    renderBoundary(Boundary, () => {
      throw Object.assign(new Error("db down"), {
        details: "ana@example.com 0917 000 0000",
      });
    });
    await screen.findByText(shown);
    // The log is written by a passive effect, which may run after the
    // boundary text appears.
    await waitFor(() =>
      expect(logged()).toEqual([["Route error boundary: Error: db down"]]),
    );
    // And it stays a single entry after any further effects have run.
    await act(async () => {});
    expect(logged()).toHaveLength(1);
  });

  it("does not log a 404", async () => {
    renderBoundary(Boundary, () => {
      throw data(null, { status: 404 });
    });
    await screen.findByRole("heading");
    // Flush pending effects first, so an absent log means "not written", not
    // "not written yet".
    await act(async () => {});
    expect(logged()).toHaveLength(0);
  });
});
