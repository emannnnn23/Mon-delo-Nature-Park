import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Link, createRoutesStub } from "react-router";

import { listRows } from "~/services/admin/crud";
import { AdminError } from "~/services/admin/errors";
import { listMedia } from "~/services/media";

import { ErrorBoundary, clientLoader, shouldRevalidate } from "./gallery";

vi.mock("~/services/admin/crud", () => ({ listRows: vi.fn() }));
vi.mock("~/services/media", () => ({ listMedia: vi.fn() }));

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.mocked(listRows).mockResolvedValue([]);
  vi.mocked(listMedia).mockResolvedValue([]);
});

afterEach(() => {
  vi.mocked(listRows).mockReset();
  vi.mocked(listMedia).mockReset();
});

function renderFailing(error: unknown) {
  const Stub = createRoutesStub([
    {
      path: "/",
      loader: () => {
        throw error;
      },
      Component: () => null,
      ErrorBoundary,
    },
  ]);
  return render(<Stub />);
}

describe("admin gallery clientLoader", () => {
  it("loads categories, photos and the media library", async () => {
    vi.mocked(listRows).mockImplementation((async (table: string) => [
      { table },
    ]) as never);
    vi.mocked(listMedia).mockResolvedValue([{ id: "m" }] as never);
    const result = await clientLoader();
    expect(listRows).toHaveBeenCalledWith("gallery_categories");
    expect(listRows).toHaveBeenCalledWith("gallery_images");
    expect(listMedia).toHaveBeenCalled();
    expect(result).toEqual({
      categories: [{ table: "gallery_categories" }],
      images: [{ table: "gallery_images" }],
      media: [{ id: "m" }],
    });
  });
});

describe("admin gallery ErrorBoundary", () => {
  it("shows friendly text only", async () => {
    renderFailing(new Error("kaboom"));
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Something went wrong. Please try again.");
    expect(alert).not.toHaveTextContent("kaboom");
  });

  it("shows the friendly text of a known error", async () => {
    renderFailing(new AdminError("42501", "Your session has expired."));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Your session has expired.",
    );
  });
});

describe("admin gallery shouldRevalidate", () => {
  it("does not load again when only the tab or filter changes, but does for another page", async () => {
    const loader = vi.fn(async () => ({}));
    const Stub = createRoutesStub([
      {
        path: "/admin/gallery",
        loader,
        shouldRevalidate,
        Component: () => (
          <>
            <Link to="/admin/gallery?category=x">Filter</Link>
            <Link to="/admin/elsewhere">Away</Link>
          </>
        ),
      },
      { path: "/admin/elsewhere", Component: () => <p>Elsewhere</p> },
    ]);
    render(<Stub initialEntries={["/admin/gallery"]} />);
    await userEvent.click(await screen.findByRole("link", { name: "Filter" }));
    await screen.findByRole("link", { name: "Filter" });
    expect(loader).toHaveBeenCalledTimes(1);
  });
});
