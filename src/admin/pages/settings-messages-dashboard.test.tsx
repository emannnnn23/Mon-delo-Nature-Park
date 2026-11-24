import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Link, createRoutesStub } from "react-router";

import { Toast, dismissAllToasts } from "~/admin/components/Toast";
import { deleteMessage, setMessageStatus } from "~/services/admin/messages";
import { updateSettings } from "~/services/admin/settings";
import { AdminError } from "~/services/admin/errors";
import type { DashboardData } from "~/services/admin/dashboard";
import type { MessageRow, SettingsRow } from "~/types/db-helpers";

import { DashboardPage } from "./DashboardPage";
import { MessagesPage } from "./MessagesPage";
import { SettingsPage } from "./SettingsPage";

vi.mock("~/services/admin/settings", () => ({
  getSettings: vi.fn(),
  updateSettings: vi.fn(),
}));
vi.mock("~/services/admin/messages", () => ({
  listMessages: vi.fn(),
  setMessageStatus: vi.fn(),
  deleteMessage: vi.fn(),
}));

const STAMP = "2026-11-20T00:00:00Z";

function settings(extra: Partial<SettingsRow> = {}): SettingsRow {
  return {
    id: "s1",
    singleton: true,
    park_name: "Mondelos Nature Park",
    tagline: null,
    short_description: null,
    address_line: "M8GV+8GP, Balaring Road, Kawayan, Biliran, Philippines",
    plus_code: null,
    latitude: null,
    longitude: null,
    maps_embed_url: null,
    maps_listing_url: null,
    phone: null,
    email: null,
    opening_hours: null,
    facebook_url: null,
    instagram_url: null,
    tiktok_url: null,
    youtube_url: null,
    google_rating: null,
    google_review_count: null,
    default_og_media_id: null,
    created_at: STAMP,
    updated_at: STAMP,
    ...extra,
  };
}

function message(id: string, extra: Partial<MessageRow> = {}): MessageRow {
  return {
    id,
    full_name: `Guest ${id}`,
    email: `guest${id}@example.com`,
    phone: null,
    subject: `Question ${id}`,
    message: `Hello, this is message number ${id}.`,
    status: "new",
    submitted_at: "2026-11-21T08:30:00Z",
    created_at: STAMP,
    updated_at: STAMP,
    ...extra,
  };
}

beforeEach(() => {
  sessionStorage.clear();
});

afterEach(() => {
  vi.mocked(updateSettings).mockReset();
  vi.mocked(setMessageStatus).mockReset();
  vi.mocked(deleteMessage).mockReset();
  act(() => dismissAllToasts());
});

function renderPage(page: React.ReactNode, entry = "/admin/page") {
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
  return render(<Stub initialEntries={[entry]} />);
}

describe("SettingsPage", () => {
  it("groups the fields and shows a single Save", () => {
    renderPage(<SettingsPage settings={settings()} media={[]} />);
    expect(
      screen.getByRole("heading", { level: 1, name: "Contact & settings" }),
    ).toBeInTheDocument();
    for (const group of [
      "Location",
      "Contact",
      "Social media",
      "Google rating",
      "Share image",
    ]) {
      expect(screen.getByRole("group", { name: group })).toBeInTheDocument();
    }
    expect(screen.getAllByRole("button", { name: /^Save/ })).toHaveLength(1);
    expect(screen.getByLabelText(/^Address/)).toHaveValue(
      "M8GV+8GP, Balaring Road, Kawayan, Biliran, Philippines",
    );
  });

  it("tells the owner how to get the map in plain words", () => {
    renderPage(<SettingsPage settings={settings()} media={[]} />);
    const hint = screen.getByText(/Share.*Embed a map.*Copy HTML/s);
    expect(hint).toBeInTheDocument();
    expect(hint.textContent).not.toMatch(/src|https:\/\/|iframe/);
  });

  it("keeps only the map address when the owner pastes Google's snippet", async () => {
    renderPage(<SettingsPage settings={settings()} media={[]} />);
    const field = screen.getByLabelText(/Map on the Visit page/);
    await userEvent.click(field);
    await userEvent.paste(
      '<iframe src="https://www.google.com/maps/embed?pb=1&amp;x=2" width="600"></iframe>',
    );
    await userEvent.tab();
    expect(field).toHaveValue("https://www.google.com/maps/embed?pb=1&x=2");
  });

  it("rejects a map address that is not a Google Maps embed and does not save", async () => {
    renderPage(<SettingsPage settings={settings()} media={[]} />);
    await userEvent.type(
      screen.getByLabelText(/Map on the Visit page/),
      "https://evil.com/embed",
    );
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));
    const field = screen.getByLabelText(/Map on the Visit page/);
    expect(field).toHaveAttribute("aria-invalid", "true");
    expect(field).toHaveFocus();
    expect(updateSettings).not.toHaveBeenCalled();
  });

  it("saves the checked values, with empty fields as null", async () => {
    vi.mocked(updateSettings).mockResolvedValue(
      settings({ phone: "0912 345 6789", google_rating: 4.8 }),
    );
    renderPage(<SettingsPage settings={settings()} media={[]} />);
    await userEvent.type(screen.getByLabelText(/^Phone/), " 0912 345 6789 ");
    await userEvent.type(screen.getByLabelText(/^Rating/), "4.8");
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(updateSettings).toHaveBeenCalledTimes(1);
    expect(updateSettings).toHaveBeenCalledWith(
      expect.objectContaining({
        phone: "0912 345 6789",
        email: null,
        google_rating: 4.8,
        google_review_count: null,
        maps_embed_url: null,
      }),
    );
    expect(await screen.findByText("Settings saved.")).toBeInTheDocument();
  });

  it("shows a friendly message when the save fails", async () => {
    vi.mocked(updateSettings).mockRejectedValue(
      new AdminError("NETWORK", "Can't reach the server."),
    );
    renderPage(<SettingsPage settings={settings()} media={[]} />);
    await userEvent.type(screen.getByLabelText(/^Phone/), "0912");
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(
      await screen.findByText("Can't reach the server."),
    ).toBeInTheDocument();
  });

  it("holds unsaved edits when leaving the page", async () => {
    renderPage(<SettingsPage settings={settings()} media={[]} />);
    await userEvent.type(screen.getByLabelText(/^Phone/), "0912");
    await userEvent.click(screen.getByRole("link", { name: "Elsewhere" }));
    expect(
      await screen.findByRole("dialog", { name: /unsaved|leave/i }),
    ).toBeInTheDocument();
  });
});

describe("MessagesPage", () => {
  const BODY = "<img src=x onerror=alert(1)> please call me";

  it("lists name, subject and date with a New chip on new messages", () => {
    renderPage(
      <MessagesPage
        messages={[
          message("1"),
          message("2", { status: "read", subject: "Opening hours?" }),
        ]}
      />,
    );
    expect(
      screen.getByRole("heading", { level: 1, name: "Messages" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Guest 1")).toBeInTheDocument();
    expect(screen.getByText("Opening hours?")).toBeInTheDocument();
    expect(screen.getAllByText("New")).toHaveLength(2); // the chip and the filter
    const rows = within(
      screen.getByRole("list", { name: "Messages" }),
    ).getAllByRole("listitem");
    expect(within(rows[0]).getByText("New")).toBeInTheDocument();
    expect(within(rows[1]).queryByText("New")).not.toBeInTheDocument();
  });

  it("names each row with its visible words: sender, subject, status and date", () => {
    renderPage(
      <MessagesPage
        messages={[
          message("1"),
          message("2", { status: "archived", subject: "Old question" }),
        ]}
      />,
    );
    const rows = within(
      screen.getByRole("list", { name: "Messages" }),
    ).getAllByRole("listitem");
    for (const [row, visible] of [
      [rows[0], ["Guest 1", "Question 1", "New"]],
      [rows[1], ["Guest 2", "Old question", "Archived"]],
    ] as const) {
      const button = within(row).getByRole("button");
      const date = within(row).getByText(/2026/).textContent ?? "";
      expect(date).not.toBe("");
      for (const word of [...visible, date]) {
        expect(button).toHaveAccessibleName(expect.stringContaining(word));
      }
      expect(button).toHaveAccessibleName(
        expect.stringMatching(/^Open message from /),
      );
    }
  });

  it("moves focus to Cancel when Delete is pressed, and back to Delete on Cancel", async () => {
    vi.mocked(setMessageStatus).mockResolvedValue(
      message("1", { status: "read" }),
    );
    renderPage(<MessagesPage messages={[message("1", { status: "read" })]} />);
    await userEvent.click(
      screen.getByRole("button", { name: /Open message from Guest 1/ }),
    );
    const dialog = await screen.findByRole("dialog");
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Delete" }),
    );
    expect(
      within(dialog).getByRole("button", { name: "Cancel" }),
    ).toHaveFocus();
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Cancel" }),
    );
    expect(
      within(dialog).getByRole("button", { name: "Delete" }),
    ).toHaveFocus();
  });

  it("shows the message as plain text and marks it read", async () => {
    vi.mocked(setMessageStatus).mockResolvedValue(
      message("1", { message: BODY, status: "read" }),
    );
    const { container } = renderPage(
      <MessagesPage messages={[message("1", { message: BODY })]} />,
    );
    await userEvent.click(
      screen.getByRole("button", { name: /Open message from Guest 1/ }),
    );
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveTextContent(BODY);
    expect(container.querySelector("img")).toBeNull();
    expect(document.querySelector("img")).toBeNull();
    expect(setMessageStatus).toHaveBeenCalledWith("1", "read");
    expect(setMessageStatus).toHaveBeenCalledTimes(1);
  });

  it("does not change a message that is already read", async () => {
    renderPage(<MessagesPage messages={[message("1", { status: "read" })]} />);
    await userEvent.click(
      screen.getByRole("button", { name: /Open message from Guest 1/ }),
    );
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(setMessageStatus).not.toHaveBeenCalled();
  });

  it("archives a message", async () => {
    vi.mocked(setMessageStatus).mockImplementation(async (id, status) =>
      message(id, { status }),
    );
    renderPage(<MessagesPage messages={[message("1")]} />);
    await userEvent.click(
      screen.getByRole("button", { name: /Open message from Guest 1/ }),
    );
    await userEvent.click(
      within(await screen.findByRole("dialog")).getByRole("button", {
        name: "Archive",
      }),
    );
    expect(setMessageStatus).toHaveBeenLastCalledWith("1", "archived");
  });

  it("asks before deleting, and deletes only after confirming", async () => {
    vi.mocked(setMessageStatus).mockResolvedValue(
      message("1", { status: "read" }),
    );
    vi.mocked(deleteMessage).mockResolvedValue(undefined);
    renderPage(<MessagesPage messages={[message("1")]} />);
    await userEvent.click(
      screen.getByRole("button", { name: /Open message from Guest 1/ }),
    );
    const dialog = await screen.findByRole("dialog");
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Delete" }),
    );
    expect(deleteMessage).not.toHaveBeenCalled();
    await userEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "Delete message",
      }),
    );
    expect(deleteMessage).toHaveBeenCalledWith("1");
    expect(screen.queryByText("Guest 1")).not.toBeInTheDocument();
  });

  it("filters by status from the address", () => {
    renderPage(
      <MessagesPage
        messages={[message("1"), message("2", { status: "read" })]}
      />,
      "/admin/page?status=read",
    );
    expect(screen.getByRole("link", { name: "Read" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByText("Guest 2")).toBeInTheDocument();
    expect(screen.queryByText("Guest 1")).not.toBeInTheDocument();
  });

  it("says when there is nothing in the inbox", () => {
    renderPage(<MessagesPage messages={[]} />);
    expect(screen.getByText(/No messages/)).toBeInTheDocument();
  });
});

describe("DashboardPage", () => {
  const data: DashboardData = {
    counts: {
      publishedAttractions: 8,
      galleryImages: 0,
      publishedAnnouncements: 1,
      newMessages: 3,
    },
    recent: [
      {
        source: "page_sections",
        id: "p1",
        title: "about · story",
        updatedAt: "2026-11-22T10:00:00Z",
      },
      {
        source: "attractions",
        id: "a1",
        title: "Waterfall",
        updatedAt: "2026-11-21T10:00:00Z",
      },
      {
        source: "site_settings",
        id: "s1",
        title: "Contact & settings",
        updatedAt: "2026-11-20T10:00:00Z",
      },
    ],
    missing: [
      "Phone number",
      "Guest reviews",
      "7 sample items still to confirm",
    ],
  };

  it("shows the four counts, including New messages", () => {
    renderPage(<DashboardPage data={data} />);
    expect(
      screen.getByRole("heading", { level: 1, name: "Dashboard" }),
    ).toBeInTheDocument();
    const tile = screen.getByText("New messages").closest("a, div");
    expect(tile).toHaveTextContent("3");
    expect(screen.getByText("Published attractions")).toBeInTheDocument();
    expect(screen.getByText("Gallery photos")).toBeInTheDocument();
    expect(screen.getByText("Published announcements")).toBeInTheDocument();
  });

  it("links each recent update to its editor", () => {
    renderPage(<DashboardPage data={data} />);
    const list = screen.getByRole("list", { name: "Recent updates" });
    const links = within(list).getAllByRole("link");
    expect(links[0]).toHaveAttribute("href", "/admin/pages/about");
    expect(links[1]).toHaveAttribute("href", "/admin/attractions/a1");
    expect(links[2]).toHaveAttribute("href", "/admin/settings");
    expect(within(list).getByText("Attraction")).toBeInTheDocument();
    expect(within(list).getAllByText("Contact & settings")).toHaveLength(2);
  });

  it("falls back to the home page editor for an unknown page", () => {
    renderPage(
      <DashboardPage
        data={{
          ...data,
          recent: [
            {
              source: "page_sections",
              id: "p9",
              title: "elsewhere · x",
              updatedAt: STAMP,
            },
          ],
        }}
      />,
    );
    expect(
      within(screen.getByRole("list", { name: "Recent updates" })).getByRole(
        "link",
      ),
    ).toHaveAttribute("href", "/admin/pages/home");
  });

  it("lists what is still missing, each linking to where to fix it", () => {
    renderPage(<DashboardPage data={data} />);
    const list = screen.getByRole("list", { name: "Still missing" });
    expect(
      within(list).getByRole("link", { name: "Phone number" }),
    ).toHaveAttribute("href", "/admin/settings");
    expect(
      within(list).getByRole("link", { name: "Guest reviews" }),
    ).toHaveAttribute("href", "/admin/testimonials");
    expect(
      within(list).getByRole("link", {
        name: "7 sample items still to confirm",
      }),
    ).toBeInTheDocument();
  });

  it("says so when nothing is missing", () => {
    renderPage(<DashboardPage data={{ ...data, missing: [] }} />);
    expect(screen.getByText(/Nothing is missing/)).toBeInTheDocument();
  });
});
