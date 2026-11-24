import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Link, createRoutesStub } from "react-router";

import { Toast, dismissAllToasts } from "~/admin/components/Toast";
import {
  deleteRow,
  insertRow,
  nextSortOrder,
  setPublished,
  swapOrder,
  updateRow,
} from "~/services/admin/crud";
import { AdminError } from "~/services/admin/errors";
import type { Row } from "~/types/db-helpers";

import { AnnouncementsPage } from "./AnnouncementsPage";
import { FaqsPage } from "./FaqsPage";
import { TestimonialsPage } from "./TestimonialsPage";

vi.mock("~/services/admin/crud", () => ({
  deleteRow: vi.fn(),
  insertRow: vi.fn(),
  nextSortOrder: vi.fn(),
  setPublished: vi.fn(),
  swapOrder: vi.fn(),
  updateRow: vi.fn(),
}));

type Testimonial = Row<"testimonials">;
type Announcement = Row<"announcements">;
type Faq = Row<"faqs">;

const STAMP = "2026-11-20T00:00:00Z";

function testimonial(
  id: string,
  extra: Partial<Testimonial> = {},
): Testimonial {
  return {
    id,
    author_name: `Guest ${id}`,
    quote: `A wonderful visit, number ${id}.`,
    rating: null,
    source: "google",
    source_url: null,
    review_date: null,
    is_published: false,
    sort_order: Number(id),
    created_at: STAMP,
    updated_at: STAMP,
    ...extra,
  };
}

function announcement(
  id: string,
  extra: Partial<Announcement> = {},
): Announcement {
  return {
    id,
    title: `Notice ${id}`,
    body: null,
    link_label: null,
    link_href: null,
    starts_at: "2020-01-01T00:00:00Z",
    ends_at: null,
    is_published: true,
    created_at: STAMP,
    updated_at: STAMP,
    ...extra,
  };
}

function faq(id: string, extra: Partial<Faq> = {}): Faq {
  return {
    id,
    question: `Question ${id}?`,
    answer: `The answer to question ${id}.`,
    is_published: false,
    sort_order: Number(id),
    created_at: STAMP,
    updated_at: STAMP,
    ...extra,
  };
}

const mocks = [
  deleteRow,
  insertRow,
  nextSortOrder,
  setPublished,
  swapOrder,
  updateRow,
];

beforeEach(() => {
  sessionStorage.clear();
});

afterEach(() => {
  for (const fn of mocks) vi.mocked(fn).mockReset();
  act(() => dismissAllToasts());
});

function renderPage(page: React.ReactNode) {
  const Stub = createRoutesStub([
    {
      path: "/admin/page",
      Component: () => (
        <>
          {page}
          <Link to="/admin/elsewhere">Elsewhere</Link>
          <Toast />
        </>
      ),
    },
    { path: "/admin/elsewhere", Component: () => <h1>Elsewhere page</h1> },
  ]);
  return render(<Stub initialEntries={["/admin/page"]} />);
}

const dialog = () => screen.getByRole("dialog");
const field = (label: RegExp | string) =>
  within(dialog()).getByLabelText(label);

describe("TestimonialsPage", () => {
  const rows = [testimonial("1"), testimonial("2", { is_published: true })];

  it("lists the testimonials in order with their switches", () => {
    renderPage(<TestimonialsPage testimonials={[rows[1], rows[0]]} />);
    expect(
      screen.getByRole("heading", { level: 1, name: "Testimonials" }),
    ).toBeInTheDocument();
    const names = screen
      .getAllByRole("rowheader")
      .map((h) => h.textContent ?? "");
    expect(names[0]).toContain("Guest 1");
    expect(names[1]).toContain("Guest 2");
    expect(
      screen.getByRole("switch", { name: /Publish Guest 2 on website/ }),
    ).toBeChecked();
  });

  it("shows the permission notice on the form", async () => {
    renderPage(<TestimonialsPage testimonials={rows} />);
    expect(
      screen.queryByText(/Only add real reviews from real guests/),
    ).not.toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { name: "Add testimonial" }),
    );
    expect(
      within(dialog()).getByText(
        "Only add real reviews from real guests, and ask their permission before quoting them.",
      ),
    ).toBeInTheDocument();
    // Fields the website does not show say so.
    expect(
      within(dialog()).getAllByText(
        /Kept for your records; not shown on the website\./,
      ).length,
    ).toBeGreaterThanOrEqual(3);
  });

  it("asks for what is missing and does not save", async () => {
    renderPage(<TestimonialsPage testimonials={rows} />);
    await userEvent.click(
      screen.getByRole("button", { name: "Add testimonial" }),
    );
    await userEvent.click(
      within(dialog()).getByRole("button", { name: "Save" }),
    );
    expect(
      within(dialog()).getByText("Please enter the guest's name."),
    ).toBeInTheDocument();
    expect(
      within(dialog()).getByText("Choose where the review came from."),
    ).toBeInTheDocument();
    expect(field("Guest's name")).toHaveAttribute("aria-invalid", "true");
    expect(field("Guest's name")).toHaveFocus();
    expect(insertRow).not.toHaveBeenCalled();
  });

  it("rejects a link that is not https", async () => {
    renderPage(<TestimonialsPage testimonials={rows} />);
    await userEvent.click(
      screen.getByRole("button", { name: "Add testimonial" }),
    );
    await userEvent.type(field("Guest's name"), "Ana Cruz");
    await userEvent.type(
      field("What the guest wrote"),
      "Peaceful and very clean.",
    );
    await userEvent.selectOptions(field("Where it came from"), "facebook");
    await userEvent.type(
      field(/Link to the original review/),
      "http://example.com/r",
    );
    await userEvent.click(
      within(dialog()).getByRole("button", { name: "Save" }),
    );
    expect(
      within(dialog()).getByText("Use a full address starting with https://"),
    ).toBeInTheDocument();
    expect(insertRow).not.toHaveBeenCalled();
  });

  it("adds an unpublished testimonial last in the order", async () => {
    vi.mocked(nextSortOrder).mockResolvedValue(7);
    vi.mocked(insertRow).mockImplementation((async (_t: string, v: object) => ({
      ...testimonial("9"),
      ...v,
    })) as never);
    renderPage(<TestimonialsPage testimonials={rows} />);
    await userEvent.click(
      screen.getByRole("button", { name: "Add testimonial" }),
    );
    await userEvent.type(field("Guest's name"), "  Ana Cruz ");
    await userEvent.type(
      field("What the guest wrote"),
      "Peaceful and very clean.",
    );
    await userEvent.selectOptions(field("Where it came from"), "facebook");
    await userEvent.selectOptions(field(/^Rating/), "4");
    await userEvent.type(
      field(/Link to the original review/),
      "https://facebook.com/r/1",
    );
    fireEvent.change(field(/Date of the review/), {
      target: { value: "2026-11-02" },
    });
    await userEvent.click(
      within(dialog()).getByRole("button", { name: "Save" }),
    );

    expect(await screen.findByText("Ana Cruz")).toBeInTheDocument();
    expect(nextSortOrder).toHaveBeenCalledWith("testimonials");
    expect(insertRow).toHaveBeenCalledWith("testimonials", {
      author_name: "Ana Cruz",
      quote: "Peaceful and very clean.",
      rating: 4,
      source: "facebook",
      source_url: "https://facebook.com/r/1",
      review_date: "2026-11-02",
      is_published: false,
      sort_order: 7,
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(
      screen.getByText("Testimonial added. Switch it on to show it."),
    ).toBeInTheDocument();
  });

  it("edits a testimonial, leaving its publish state alone", async () => {
    vi.mocked(updateRow).mockImplementation((async (
      _t: string,
      id: string,
      v: object,
    ) => ({
      ...rows.find((r) => r.id === id),
      ...v,
    })) as never);
    renderPage(<TestimonialsPage testimonials={rows} />);
    await userEvent.click(screen.getByRole("button", { name: "Edit Guest 2" }));
    expect(field("Guest's name")).toHaveValue("Guest 2");
    await userEvent.clear(field("Guest's name"));
    await userEvent.type(field("Guest's name"), "Rosa Lim");
    await userEvent.click(
      within(dialog()).getByRole("button", { name: "Save" }),
    );

    expect(await screen.findByText("Rosa Lim")).toBeInTheDocument();
    expect(updateRow).toHaveBeenCalledWith("testimonials", "2", {
      author_name: "Rosa Lim",
      quote: "A wonderful visit, number 2.",
      rating: null,
      source: "google",
      source_url: "",
      review_date: "",
    });
  });

  it("shows a friendly message when saving fails", async () => {
    vi.mocked(nextSortOrder).mockResolvedValue(0);
    vi.mocked(insertRow).mockRejectedValue(
      new AdminError(
        "23514",
        "Some of the details don't meet the requirements.",
      ),
    );
    renderPage(<TestimonialsPage testimonials={[]} />);
    await userEvent.click(
      screen.getByRole("button", { name: "Add testimonial" }),
    );
    await userEvent.type(field("Guest's name"), "Ana Cruz");
    await userEvent.type(
      field("What the guest wrote"),
      "Peaceful and very clean.",
    );
    await userEvent.selectOptions(field("Where it came from"), "direct");
    await userEvent.click(
      within(dialog()).getByRole("button", { name: "Save" }),
    );
    expect(await within(dialog()).findByRole("alert")).toHaveTextContent(
      "Some of the details don't meet the requirements.",
    );
    expect(dialog()).toBeInTheDocument();
  });

  it("switches a testimonial on and off", async () => {
    vi.mocked(setPublished).mockResolvedValue({
      ...rows[0],
      is_published: true,
    });
    renderPage(<TestimonialsPage testimonials={rows} />);
    await userEvent.click(
      screen.getByRole("switch", { name: /Publish Guest 1 on website/ }),
    );
    expect(setPublished).toHaveBeenCalledWith("testimonials", "1", true);
    expect(
      await screen.findByText("Guest 1's review is on the website."),
    ).toBeInTheDocument();
  });

  it("moves a testimonial down", async () => {
    vi.mocked(swapOrder).mockResolvedValue(undefined);
    renderPage(<TestimonialsPage testimonials={rows} />);
    await userEvent.click(
      screen.getByRole("button", { name: "Move Guest 1 down" }),
    );
    expect(swapOrder).toHaveBeenCalledWith(
      "testimonials",
      expect.objectContaining({ id: "1" }),
      expect.objectContaining({ id: "2" }),
    );
    await screen.findByRole("button", { name: "Move Guest 1 up" });
  });

  it("deletes a testimonial after confirming", async () => {
    vi.mocked(deleteRow).mockResolvedValue(undefined);
    renderPage(<TestimonialsPage testimonials={rows} />);
    await userEvent.click(
      screen.getByRole("button", { name: "Delete Guest 1" }),
    );
    expect(deleteRow).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(deleteRow).toHaveBeenCalledWith("testimonials", "1");
    await vi.waitFor(() =>
      expect(screen.queryByText("Guest 1")).not.toBeInTheDocument(),
    );
  });

  it("holds navigation while the form has unsaved text", async () => {
    renderPage(<TestimonialsPage testimonials={rows} />);
    await userEvent.click(
      screen.getByRole("button", { name: "Add testimonial" }),
    );
    await userEvent.type(field("Guest's name"), "Ana");
    // The dialog is modal: leave it open and use the page link underneath.
    fireEvent.click(screen.getByText("Elsewhere"));
    expect(
      await screen.findByRole("heading", { name: "Leave without saving?" }),
    ).toBeInTheDocument();
  });

  it("restores a kept draft when the form is opened again", async () => {
    const first = renderPage(<TestimonialsPage testimonials={rows} />);
    await userEvent.click(
      screen.getByRole("button", { name: "Add testimonial" }),
    );
    await userEvent.type(field("Guest's name"), "Ana Cruz");
    first.unmount();

    renderPage(<TestimonialsPage testimonials={rows} />);
    await userEvent.click(
      screen.getByRole("button", { name: "Add testimonial" }),
    );
    expect(field("Guest's name")).toHaveValue("Ana Cruz");
    expect(within(dialog()).getByRole("status")).toHaveTextContent(
      "We restored your unsaved changes",
    );
  });
});

describe("AnnouncementsPage", () => {
  const live = announcement("1", {
    title: "Open as usual",
    starts_at: "2021-01-01T00:00:00Z",
  });
  const ended = announcement("2", {
    title: "Typhoon closure",
    starts_at: "2020-02-01T00:00:00Z",
    ends_at: "2020-02-10T00:00:00Z",
  });
  const scheduled = announcement("3", {
    title: "Anniversary weekend",
    starts_at: "2099-05-01T00:00:00Z",
  });
  const off = announcement("4", {
    title: "Draft notice",
    is_published: false,
    ends_at: "2020-03-01T00:00:00Z",
  });

  const chipOf = (title: string) =>
    within(
      screen.getByRole("rowheader", { name: new RegExp(title) }),
    ).getByText(/^(Live|Scheduled|Ended|Unpublished)$/);

  it("shows Live, Scheduled, Ended or Unpublished for each announcement", () => {
    renderPage(
      <AnnouncementsPage announcements={[live, ended, scheduled, off]} />,
    );
    expect(chipOf("Open as usual")).toHaveTextContent("Live");
    expect(chipOf("Typhoon closure")).toHaveTextContent("Ended");
    expect(chipOf("Anniversary weekend")).toHaveTextContent("Scheduled");
    // Switched off wins over the dates.
    expect(chipOf("Draft notice")).toHaveTextContent("Unpublished");
  });

  it("lists the newest start first and offers no reordering", () => {
    renderPage(<AnnouncementsPage announcements={[ended, live, scheduled]} />);
    const titles = screen
      .getAllByRole("rowheader")
      .map((h) => h.textContent ?? "");
    expect(titles[0]).toContain("Anniversary weekend");
    expect(titles[1]).toContain("Open as usual");
    expect(titles[2]).toContain("Typhoon closure");
    expect(
      screen.queryByRole("button", { name: /Move .* up/ }),
    ).not.toBeInTheDocument();
  });

  it("notes the time zone on the date fields", async () => {
    renderPage(<AnnouncementsPage announcements={[]} />);
    await userEvent.click(
      screen.getByRole("button", { name: "Add announcement" }),
    );
    expect(field("Starts")).toHaveAccessibleDescription(
      "Times use this device's time zone.",
    );
    expect(field(/^Ends/)).toHaveAccessibleDescription(
      /Times use this device's time zone\./,
    );
  });

  it("rejects an end before the start", async () => {
    renderPage(<AnnouncementsPage announcements={[]} />);
    await userEvent.click(
      screen.getByRole("button", { name: "Add announcement" }),
    );
    await userEvent.type(field("Title"), "Trail closed");
    fireEvent.change(field("Starts"), {
      target: { value: "2026-12-05T09:00" },
    });
    fireEvent.change(field(/^Ends/), { target: { value: "2026-12-01T09:00" } });
    await userEvent.click(
      within(dialog()).getByRole("button", { name: "Save" }),
    );
    expect(
      within(dialog()).getByText("The end date must be after the start date."),
    ).toBeInTheDocument();
    expect(field(/^Ends/)).toHaveFocus();
    expect(insertRow).not.toHaveBeenCalled();
  });

  it("asks for both link parts or neither", async () => {
    renderPage(<AnnouncementsPage announcements={[]} />);
    await userEvent.click(
      screen.getByRole("button", { name: "Add announcement" }),
    );
    await userEvent.type(field("Title"), "Trail closed");
    await userEvent.type(field(/^Link label/), "Read more");
    await userEvent.click(
      within(dialog()).getByRole("button", { name: "Save" }),
    );
    expect(
      within(dialog()).getByText(
        "Add both a link label and a link, or leave both empty.",
      ),
    ).toBeInTheDocument();
  });

  it("saves the times as ISO timestamps and starts switched off", async () => {
    vi.mocked(insertRow).mockImplementation((async (_t: string, v: object) => ({
      ...announcement("9"),
      ...v,
    })) as never);
    renderPage(<AnnouncementsPage announcements={[]} />);
    await userEvent.click(
      screen.getByRole("button", { name: "Add announcement" }),
    );
    await userEvent.type(field("Title"), "Trail closed");
    await userEvent.type(field(/^Link label/), "Details");
    await userEvent.type(field(/^Link\(/), "/visit");
    fireEvent.change(field("Starts"), {
      target: { value: "2026-12-01T09:00" },
    });
    fireEvent.change(field(/^Ends/), { target: { value: "2026-12-02T18:30" } });
    await userEvent.click(
      within(dialog()).getByRole("button", { name: "Save" }),
    );

    expect(await screen.findByText("Trail closed")).toBeInTheDocument();
    expect(insertRow).toHaveBeenCalledWith("announcements", {
      title: "Trail closed",
      body: "",
      link_label: "Details",
      link_href: "/visit",
      starts_at: new Date(2026, 11, 1, 9, 0).toISOString(),
      ends_at: new Date(2026, 11, 2, 18, 30).toISOString(),
      is_published: false,
    });
  });

  it("shows stored times in local time when editing", async () => {
    const start = new Date(2026, 11, 1, 9, 30);
    renderPage(
      <AnnouncementsPage
        announcements={[
          announcement("5", {
            title: "Planned works",
            starts_at: start.toISOString(),
          }),
        ]}
      />,
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Edit Planned works" }),
    );
    expect(field("Starts")).toHaveValue("2026-12-01T09:30");
    expect(field(/^Ends/)).toHaveValue("");
  });

  it("switches an announcement on", async () => {
    vi.mocked(setPublished).mockResolvedValue({ ...off, is_published: true });
    renderPage(<AnnouncementsPage announcements={[off]} />);
    await userEvent.click(
      screen.getByRole("switch", { name: /Publish Draft notice on website/ }),
    );
    expect(setPublished).toHaveBeenCalledWith("announcements", "4", true);
    expect(
      await screen.findByText("The announcement is switched on."),
    ).toBeInTheDocument();
    expect(chipOf("Draft notice")).toHaveTextContent("Ended");
  });
});

describe("FaqsPage", () => {
  const rows = [faq("1"), faq("2")];

  it("lists the questions in order", () => {
    renderPage(<FaqsPage faqs={[rows[1], rows[0]]} />);
    const names = screen
      .getAllByRole("rowheader")
      .map((h) => h.textContent ?? "");
    expect(names[0]).toContain("Question 1?");
    expect(names[1]).toContain("Question 2?");
  });

  it("rejects a question that is too short", async () => {
    renderPage(<FaqsPage faqs={rows} />);
    await userEvent.click(screen.getByRole("button", { name: "Add question" }));
    await userEvent.type(field("Question"), "Open");
    await userEvent.type(field("Answer"), "Every day.");
    await userEvent.click(
      within(dialog()).getByRole("button", { name: "Save" }),
    );
    expect(
      within(dialog()).getByText("The question must be at least 5 characters."),
    ).toBeInTheDocument();
    expect(insertRow).not.toHaveBeenCalled();
  });

  it("adds an unpublished question last in the order", async () => {
    vi.mocked(nextSortOrder).mockResolvedValue(3);
    vi.mocked(insertRow).mockImplementation((async (_t: string, v: object) => ({
      ...faq("9"),
      ...v,
    })) as never);
    renderPage(<FaqsPage faqs={rows} />);
    await userEvent.click(screen.getByRole("button", { name: "Add question" }));
    await userEvent.type(field("Question"), "  Are dogs allowed? ");
    await userEvent.type(field("Answer"), "Please ask us first.");
    await userEvent.click(
      within(dialog()).getByRole("button", { name: "Save" }),
    );
    expect(await screen.findByText("Are dogs allowed?")).toBeInTheDocument();
    expect(insertRow).toHaveBeenCalledWith("faqs", {
      question: "Are dogs allowed?",
      answer: "Please ask us first.",
      is_published: false,
      sort_order: 3,
    });
  });

  it("edits a question", async () => {
    vi.mocked(updateRow).mockImplementation((async (
      _t: string,
      id: string,
      v: object,
    ) => ({
      ...rows.find((r) => r.id === id),
      ...v,
    })) as never);
    renderPage(<FaqsPage faqs={rows} />);
    await userEvent.click(
      screen.getByRole("button", { name: "Edit Question 1?" }),
    );
    await userEvent.clear(field("Answer"));
    await userEvent.type(field("Answer"), "Every day from 8 am.");
    await userEvent.click(
      within(dialog()).getByRole("button", { name: "Save" }),
    );
    await vi.waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(updateRow).toHaveBeenCalledWith("faqs", "1", {
      question: "Question 1?",
      answer: "Every day from 8 am.",
    });
    expect(screen.getByText("Every day from 8 am.")).toBeInTheDocument();
  });

  it("moves, switches on and deletes", async () => {
    vi.mocked(swapOrder).mockResolvedValue(undefined);
    vi.mocked(setPublished).mockResolvedValue({
      ...rows[0],
      is_published: true,
    });
    vi.mocked(deleteRow).mockResolvedValue(undefined);
    renderPage(<FaqsPage faqs={rows} />);

    await userEvent.click(
      screen.getByRole("button", { name: "Move Question 2? up" }),
    );
    expect(swapOrder).toHaveBeenCalledWith(
      "faqs",
      expect.objectContaining({ id: "2" }),
      expect.objectContaining({ id: "1" }),
    );

    await userEvent.click(
      screen.getByRole("switch", { name: /Publish Question 1\? on website/ }),
    );
    expect(setPublished).toHaveBeenCalledWith("faqs", "1", true);

    await userEvent.click(
      screen.getByRole("button", { name: "Delete Question 2?" }),
    );
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(deleteRow).toHaveBeenCalledWith("faqs", "2");
  });
});
