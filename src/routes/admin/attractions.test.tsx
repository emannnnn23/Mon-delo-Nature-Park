import { render, screen } from "@testing-library/react";
import { createRoutesStub, data } from "react-router";

import { getRow, listRows } from "~/services/admin/crud";
import { AdminError } from "~/services/admin/errors";
import { listMedia } from "~/services/media";

import {
  ErrorBoundary as ListBoundary,
  clientLoader as listLoader,
} from "./attractions";
import {
  ErrorBoundary as FormBoundary,
  clientLoader as formLoader,
} from "./attractions.$id";

vi.mock("~/services/admin/crud", () => ({
  getRow: vi.fn(),
  listRows: vi.fn(),
}));
vi.mock("~/services/media", () => ({ listMedia: vi.fn() }));

type FormArgs = Parameters<typeof formLoader>[0];

const ID = "6f0f2c9e-1b7a-4d55-8d3e-2a1b3c4d5e6f";

function args(id: string, search = ""): FormArgs {
  return {
    params: { id },
    request: new Request(`http://localhost/admin/attractions/${id}${search}`),
  } as unknown as FormArgs;
}

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.mocked(listRows).mockResolvedValue([]);
  vi.mocked(listMedia).mockResolvedValue([]);
});

afterEach(() => {
  vi.mocked(getRow).mockReset();
  vi.mocked(listRows).mockReset();
  vi.mocked(listMedia).mockReset();
});

describe("admin attractions list clientLoader", () => {
  it("loads every attraction and experience", async () => {
    await listLoader();
    expect(listRows).toHaveBeenCalledWith("attractions");
  });
});

describe("admin attractions form clientLoader", () => {
  it("opens a blank attraction for /new", async () => {
    const result = await formLoader(args("new"));
    expect(result).toMatchObject({ row: null, kind: "attraction", images: [] });
    expect(getRow).not.toHaveBeenCalled();
  });

  it("opens a blank experience for /new?kind=experience", async () => {
    const result = await formLoader(args("new", "?kind=experience"));
    expect(result).toMatchObject({ row: null, kind: "experience" });
  });

  it("loads a saved attraction with its extra photos", async () => {
    vi.mocked(getRow).mockResolvedValue({
      id: ID,
      kind: "attraction",
    } as never);
    const result = await formLoader(args(ID));
    expect(result.kind).toBe("attraction");
    expect(listRows).toHaveBeenCalledWith("attraction_images", {
      filter: { attraction_id: ID },
    });
  });

  it("does not look for extra photos of an experience", async () => {
    vi.mocked(getRow).mockResolvedValue({
      id: ID,
      kind: "experience",
    } as never);
    const result = await formLoader(args(ID));
    expect(result.kind).toBe("experience");
    expect(listRows).not.toHaveBeenCalled();
  });

  it("answers 404 for an unknown id", async () => {
    vi.mocked(getRow).mockResolvedValue(null);
    await expect(formLoader(args(ID))).rejects.toMatchObject({
      init: { status: 404 },
    });
  });

  it.each(["abc", "", "123", "new/../x"])(
    "answers 404 for %j without reading the database",
    async (id) => {
      await expect(formLoader(args(id))).rejects.toMatchObject({
        init: { status: 404 },
      });
      expect(getRow).not.toHaveBeenCalled();
    },
  );
});

function renderFailing(error: unknown, ErrorBoundary: () => React.ReactNode) {
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

describe("admin attractions ErrorBoundary", () => {
  it("shows the admin Not found page for a 404 on the form", async () => {
    renderFailing(data(null, { status: 404 }), FormBoundary);
    expect(
      await screen.findByRole("heading", { name: "Not found" }),
    ).toBeInTheDocument();
  });

  it.each([
    ["list", ListBoundary],
    ["form", FormBoundary],
  ] as const)("shows friendly text only on the %s", async (_name, Boundary) => {
    renderFailing(new Error("kaboom"), Boundary);
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Something went wrong. Please try again.");
    expect(alert).not.toHaveTextContent("kaboom");
  });

  it("shows the friendly text of a known error", async () => {
    renderFailing(
      new AdminError(
        "42501",
        "Your session has expired — please sign in again.",
      ),
      ListBoundary,
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Your session has expired",
    );
  });
});
