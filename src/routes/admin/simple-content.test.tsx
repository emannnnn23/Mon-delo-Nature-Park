import { render, screen } from "@testing-library/react";
import { createRoutesStub } from "react-router";

import { listRows } from "~/services/admin/crud";
import { AdminError } from "~/services/admin/errors";

import {
  ErrorBoundary as AnnouncementsError,
  clientLoader as announcementsLoader,
} from "./announcements";
import { ErrorBoundary as FaqsError, clientLoader as faqsLoader } from "./faqs";
import {
  ErrorBoundary as TestimonialsError,
  clientLoader as testimonialsLoader,
} from "./testimonials";

vi.mock("~/services/admin/crud", () => ({ listRows: vi.fn() }));

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.mocked(listRows).mockResolvedValue([{ id: "x" }] as never);
});

afterEach(() => {
  vi.mocked(listRows).mockReset();
});

function renderFailing(
  ErrorBoundary: () => React.ReactElement,
  error: unknown,
) {
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

describe("admin clientLoaders", () => {
  it("loads testimonials", async () => {
    expect(await testimonialsLoader()).toEqual({ testimonials: [{ id: "x" }] });
    expect(listRows).toHaveBeenCalledWith("testimonials");
  });

  it("loads announcements", async () => {
    expect(await announcementsLoader()).toEqual({
      announcements: [{ id: "x" }],
    });
    expect(listRows).toHaveBeenCalledWith("announcements");
  });

  it("loads faqs", async () => {
    expect(await faqsLoader()).toEqual({ faqs: [{ id: "x" }] });
    expect(listRows).toHaveBeenCalledWith("faqs");
  });
});

describe.each([
  ["testimonials", TestimonialsError, "Testimonials"],
  ["announcements", AnnouncementsError, "Announcements"],
  ["faqs", FaqsError, "FAQs"],
])("admin %s ErrorBoundary", (_name, ErrorBoundary, heading) => {
  it("shows friendly text only, under the page title", async () => {
    renderFailing(ErrorBoundary, new Error("kaboom"));
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Something went wrong. Please try again.");
    expect(alert).not.toHaveTextContent("kaboom");
    expect(screen.getByRole("heading", { name: heading })).toBeInTheDocument();
  });

  it("shows the friendly text of a known error", async () => {
    renderFailing(ErrorBoundary, new AdminError("42501", "Session expired."));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Session expired.",
    );
  });
});
