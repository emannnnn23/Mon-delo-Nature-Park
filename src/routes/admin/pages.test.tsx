import { render, screen } from "@testing-library/react";
import { createRoutesStub, data } from "react-router";

import { listRows } from "~/services/admin/crud";
import { AdminError } from "~/services/admin/errors";
import { listMedia } from "~/services/media";

import { ErrorBoundary, clientLoader } from "./pages.$page";

vi.mock("~/services/admin/crud", () => ({ listRows: vi.fn() }));
vi.mock("~/services/media", () => ({ listMedia: vi.fn() }));

type LoaderArgs = Parameters<typeof clientLoader>[0];

function args(page: string): LoaderArgs {
  return { params: { page } } as unknown as LoaderArgs;
}

beforeEach(() => {
  // React logs the thrown error; keep the test output quiet.
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.mocked(listRows).mockResolvedValue([]);
  vi.mocked(listMedia).mockResolvedValue([]);
});

afterEach(() => {
  vi.mocked(listRows).mockReset();
  vi.mocked(listMedia).mockReset();
});

describe("admin pages route clientLoader", () => {
  it.each(["home", "about", "visit"])("loads the %s sections", async (page) => {
    const result = await clientLoader(args(page));
    expect(result.page).toBe(page);
    expect(listRows).toHaveBeenCalledWith("page_sections", {
      filter: { page },
    });
  });

  it.each(["gallery", "Home", "", "home/../x"])(
    "answers 404 for %j without reading the database",
    async (page) => {
      await expect(clientLoader(args(page))).rejects.toMatchObject({
        init: { status: 404 },
      });
      expect(listRows).not.toHaveBeenCalled();
    },
  );
});

function renderFailing(error: unknown) {
  const Stub = createRoutesStub([
    {
      path: "/",
      // Thrown from a loader, as the real route does, so a `data()` 404
      // becomes a route error response.
      loader: () => {
        throw error;
      },
      Component: () => null,
      ErrorBoundary,
    },
  ]);
  return render(<Stub />);
}

describe("admin pages route ErrorBoundary", () => {
  it("shows the admin Not found page for a 404", async () => {
    renderFailing(data(null, { status: 404 }));
    expect(
      await screen.findByRole("heading", { name: "Not found" }),
    ).toBeInTheDocument();
  });

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

  it("does not show a raw error message", async () => {
    renderFailing(new Error("kaboom"));
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Something went wrong. Please try again.");
    expect(alert).not.toHaveTextContent("kaboom");
  });
});
