import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Link, createRoutesStub } from "react-router";

import { Toast, dismissAllToasts } from "~/admin/components/Toast";
import {
  insertRow,
  markConfirmed,
  nextSortOrder,
  updateRow,
} from "~/services/admin/crud";
import { AdminError } from "~/services/admin/errors";
import type { MediaRow, Row } from "~/types/db-helpers";

import { PageSectionsPage } from "./PageSectionsPage";

vi.mock("~/services/admin/crud", () => ({
  insertRow: vi.fn(),
  markConfirmed: vi.fn(),
  nextSortOrder: vi.fn(),
  updateRow: vi.fn(),
}));

vi.mock("~/services/media", async (importOriginal) => ({
  ...(await importOriginal<typeof import("~/services/media")>()),
  listMedia: vi.fn().mockResolvedValue([]),
  uploadImage: vi.fn(),
}));

type Section = Row<"page_sections">;

function section(key: string, extra: Partial<Section> = {}): Section {
  return {
    id: `id-${key}`,
    page: "home",
    key,
    eyebrow: null,
    heading: null,
    body: null,
    cta_label: null,
    cta_href: null,
    media_id: null,
    is_published: true,
    sort_order: 1,
    is_sample: false,
    created_at: "2026-11-23T00:00:00Z",
    updated_at: "2026-11-23T00:00:00Z",
    ...extra,
  };
}

const lagoon: MediaRow = {
  id: "lagoon",
  storage_base_path: "2026/lagoon-abc123",
  alt_text: "Blue lagoon at sunrise",
  width: 3000,
  height: 2000,
  variants: { "480": "2026/lagoon-abc123-480.webp" },
  focal_x: 50,
  focal_y: 50,
  original_filename: "lagoon.jpg",
  created_at: "2026-11-23T00:00:00Z",
  updated_at: "2026-11-23T00:00:00Z",
};

const hero = section("hero", { heading: "Find Your Peace in Nature." });
const intro = section("intro", {
  heading: "Mondelos Nature Park",
  body: "Welcome.",
  cta_label: "Learn More",
  cta_href: "/about",
});

function renderPage(
  rows: Section[] = [hero, intro],
  page: "home" | "about" | "visit" = "home",
) {
  const Stub = createRoutesStub([
    {
      path: "/admin/pages/:page",
      Component: () => (
        <>
          <PageSectionsPage page={page} rows={rows} media={[lagoon]} />
          <Link to="/admin/media">Go to media</Link>
          <Toast />
        </>
      ),
    },
    { path: "/admin/media", Component: () => <h1>Media page</h1> },
  ]);
  return render(<Stub initialEntries={[`/admin/pages/${page}`]} />);
}

/** Opens a section by its name and returns its region. */
async function openSection(name: string) {
  const toggle = screen.getByRole("button", { name: new RegExp(name) });
  if (toggle.getAttribute("aria-expanded") === "false")
    await userEvent.click(toggle);
  return screen.getByRole("region", { name: new RegExp(name) });
}

beforeEach(() => {
  sessionStorage.clear();
  vi.mocked(updateRow).mockImplementation(async (_t, id, values) => ({
    ...section(id.replace(/^id-/, "")),
    ...(values as Partial<Section>),
  }));
});

afterEach(() => {
  vi.mocked(updateRow).mockReset();
  vi.mocked(markConfirmed).mockReset();
  vi.mocked(insertRow).mockReset();
  vi.mocked(nextSortOrder).mockReset();
  act(() => dismissAllToasts());
});

describe("PageSectionsPage", () => {
  it("shows one heading and a collapsible editor per known section", async () => {
    renderPage();
    expect(
      screen.getByRole("heading", { level: 1, name: "Homepage" }),
    ).toBeInTheDocument();
    const toggle = screen.getByRole("button", { name: /Top banner \(hero\)/ });
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    const second = screen.getByRole("button", {
      name: /Welcome introduction/,
    });
    expect(second).toHaveAttribute("aria-expanded", "false");
    await userEvent.click(second);
    expect(second).toHaveAttribute("aria-expanded", "true");
    const region = screen.getByRole("region", {
      name: /Welcome introduction/,
    });
    expect(within(region).getByLabelText("Title")).toHaveValue(
      "Mondelos Nature Park",
    );
    expect(within(region).getByLabelText("Button label")).toHaveValue(
      "Learn More",
    );
    expect(within(region).getByLabelText("Button link")).toHaveValue("/about");
  });

  it("uses plain words for the fields", async () => {
    renderPage();
    const region = screen.getByRole("region", { name: /Top banner/ });
    expect(
      within(region).getByLabelText(/Small heading above the title/),
    ).toBeInTheDocument();
    expect(
      within(region).getByRole("switch", { name: "Publish on website" }),
    ).toHaveAttribute("aria-checked", "true");
  });

  it("saves an edited heading with updateRow", async () => {
    renderPage();
    const region = screen.getByRole("region", { name: /Top banner/ });
    const heading = within(region).getByLabelText("Title");
    await userEvent.clear(heading);
    await userEvent.type(heading, "A quiet place");
    await userEvent.click(
      within(region).getByRole("button", { name: "Save changes" }),
    );
    expect(updateRow).toHaveBeenCalledWith(
      "page_sections",
      "id-hero",
      expect.objectContaining({ heading: "A quiet place" }),
    );
    expect(await screen.findByText(/saved\./)).toBeInTheDocument();
  });

  it("saves only the section whose button was pressed", async () => {
    renderPage();
    const region = screen.getByRole("region", { name: /Top banner/ });
    await userEvent.type(within(region).getByLabelText("Title"), "!");
    await userEvent.click(
      within(region).getByRole("button", { name: "Save changes" }),
    );
    expect(updateRow).toHaveBeenCalledTimes(1);
  });

  it("keeps Save disabled until something changes", () => {
    renderPage();
    const region = screen.getByRole("region", { name: /Top banner/ });
    expect(
      within(region).getByRole("button", { name: "Save changes" }),
    ).toBeDisabled();
  });

  it("flags a button label without a link and does not save", async () => {
    renderPage();
    const region = screen.getByRole("region", { name: /Top banner/ });
    await userEvent.type(within(region).getByLabelText("Button label"), "Go");
    await userEvent.click(
      within(region).getByRole("button", { name: "Save changes" }),
    );
    expect(updateRow).not.toHaveBeenCalled();
    const link = within(region).getByLabelText("Button link");
    expect(link).toHaveAttribute("aria-invalid", "true");
    expect(
      within(region).getByText(
        "Add both a button label and a link, or leave both empty.",
      ),
    ).toBeInTheDocument();
    expect(link).toHaveFocus();
  });

  it("rejects an unsafe button link", async () => {
    renderPage();
    const region = screen.getByRole("region", { name: /Top banner/ });
    await userEvent.type(within(region).getByLabelText("Button label"), "Go");
    await userEvent.type(
      within(region).getByLabelText("Button link"),
      "javascript:alert(1)",
    );
    await userEvent.click(
      within(region).getByRole("button", { name: "Save changes" }),
    );
    expect(updateRow).not.toHaveBeenCalled();
    expect(within(region).getByLabelText("Button link")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });

  it("shows a friendly message when saving fails", async () => {
    vi.mocked(updateRow).mockRejectedValue(
      new AdminError(
        "NETWORK",
        "Can't reach the server. Check your connection and try again.",
      ),
    );
    renderPage();
    const region = screen.getByRole("region", { name: /Top banner/ });
    await userEvent.type(within(region).getByLabelText("Title"), "!");
    await userEvent.click(
      within(region).getByRole("button", { name: "Save changes" }),
    );
    expect(
      await within(region).findByText(/Can't reach the server/),
    ).toBeInTheDocument();
    // The edit is still there to try again.
    expect(within(region).getByLabelText("Title")).toHaveValue(
      "Find Your Peace in Nature.!",
    );
  });

  it("saves the publish switch", async () => {
    renderPage();
    const region = screen.getByRole("region", { name: /Top banner/ });
    await userEvent.click(
      within(region).getByRole("switch", { name: "Publish on website" }),
    );
    await userEvent.click(
      within(region).getByRole("button", { name: "Save changes" }),
    );
    expect(updateRow).toHaveBeenCalledWith(
      "page_sections",
      "id-hero",
      expect.objectContaining({ is_published: false }),
    );
  });

  it("marks a sample section as confirmed", async () => {
    const sample = section("story", {
      page: "about",
      heading: "Our Story",
      is_sample: true,
    });
    vi.mocked(markConfirmed).mockResolvedValue({ ...sample, is_sample: false });
    renderPage([sample], "about");
    const region = await openSection("Our story");
    expect(within(region).getByText("Sample")).toBeInTheDocument();
    await userEvent.click(
      within(region).getByRole("button", { name: "Mark as confirmed" }),
    );
    expect(markConfirmed).toHaveBeenCalledWith("page_sections", "id-story");
    expect(within(region).queryByText("Sample")).not.toBeInTheDocument();
    expect(
      within(region).queryByRole("button", { name: "Mark as confirmed" }),
    ).not.toBeInTheDocument();
  });

  it("offers to add the sections that do not exist yet, unpublished", async () => {
    renderPage([hero]);
    expect(
      screen.getByRole("heading", { name: "Not set up yet" }),
    ).toBeInTheDocument();
    vi.mocked(nextSortOrder).mockResolvedValue(7);
    vi.mocked(insertRow).mockResolvedValue(
      section("discover", { is_published: false, sort_order: 7 }),
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Add section: Discover the park" }),
    );
    expect(nextSortOrder).toHaveBeenCalledWith("page_sections", {
      page: "home",
    });
    expect(insertRow).toHaveBeenCalledWith("page_sections", {
      page: "home",
      key: "discover",
      sort_order: 7,
      is_published: false,
      is_sample: false,
    });
    const region = await screen.findByRole("region", {
      name: /Discover the park/,
    });
    expect(
      within(region).getByRole("switch", { name: "Publish on website" }),
    ).toHaveAttribute("aria-checked", "false");
    expect(
      screen.queryByRole("button", { name: "Add section: Discover the park" }),
    ).not.toBeInTheDocument();
  });

  it("shows no add list when every section exists", () => {
    renderPage(
      ["hero", "intro", "discover", "gallery", "testimonials", "visit"].map(
        (k) => section(k),
      ),
    );
    expect(
      screen.queryByRole("heading", { name: "Not set up yet" }),
    ).not.toBeInTheDocument();
  });

  it("asks before leaving with unsaved changes and says the draft is kept", async () => {
    renderPage();
    const region = screen.getByRole("region", { name: /Top banner/ });
    await userEvent.type(within(region).getByLabelText("Title"), "!");
    await userEvent.click(screen.getByRole("link", { name: "Go to media" }));
    const dialog = await screen.findByRole("dialog", {
      name: "Leave without saving?",
    });
    expect(dialog).toHaveTextContent("kept as a draft on this device");
    await userEvent.click(within(dialog).getByRole("button", { name: "Stay" }));
    expect(
      screen.queryByRole("heading", { name: "Media page" }),
    ).not.toBeInTheDocument();
    expect(sessionStorage.length).toBe(1);
  });

  it("asks once when several sections have unsaved changes", async () => {
    renderPage();
    const first = screen.getByRole("region", { name: /Top banner/ });
    await userEvent.type(within(first).getByLabelText("Title"), "!");
    const second = await openSection("Welcome introduction");
    await userEvent.type(within(second).getByLabelText("Title"), "?");
    await userEvent.click(screen.getByRole("link", { name: "Go to media" }));
    const dialog = await screen.findByRole("dialog", {
      name: "Leave without saving?",
    });
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Leave without saving" }),
    );
    expect(
      await screen.findByRole("heading", { name: "Media page" }),
    ).toBeInTheDocument();
    // Both drafts are kept on this device.
    expect(sessionStorage.length).toBe(2);
  });

  it("lets the owner leave after saving, and drops the draft", async () => {
    renderPage();
    const region = screen.getByRole("region", { name: /Top banner/ });
    await userEvent.type(within(region).getByLabelText("Title"), "!");
    expect(sessionStorage.length).toBe(1);
    await userEvent.click(
      within(region).getByRole("button", { name: "Save changes" }),
    );
    await screen.findByText(/saved\./);
    expect(sessionStorage.length).toBe(0);
    expect(
      within(region).getByRole("button", { name: "Save changes" }),
    ).toBeDisabled();
    await userEvent.click(screen.getByRole("link", { name: "Go to media" }));
    expect(
      await screen.findByRole("heading", { name: "Media page" }),
    ).toBeInTheDocument();
  });

  it("restores a draft kept from an earlier visit and says so", async () => {
    sessionStorage.setItem(
      "mondelos-admin-draft:page-section:id-hero",
      JSON.stringify({
        eyebrow: "",
        heading: "Half typed",
        body: "",
        ctaLabel: "",
        ctaHref: "",
        mediaId: null,
        isPublished: true,
      }),
    );
    renderPage();
    const region = screen.getByRole("region", { name: /Top banner/ });
    expect(await within(region).findByDisplayValue("Half typed")).toBeVisible();
    expect(within(region).getByRole("status")).toHaveTextContent(
      "unsaved changes",
    );
    expect(
      within(region).getByRole("button", { name: "Save changes" }),
    ).toBeEnabled();
  });

  it("shows the chosen photo and lets the owner remove it", async () => {
    renderPage([section("hero", { media_id: "lagoon" })]);
    const region = screen.getByRole("region", { name: /Top banner/ });
    expect(
      within(region).getByRole("img", { name: "Blue lagoon at sunrise" }),
    ).toBeInTheDocument();
    await userEvent.click(
      within(region).getByRole("button", { name: "Remove photo" }),
    );
    await userEvent.click(
      within(region).getByRole("button", { name: "Save changes" }),
    );
    expect(updateRow).toHaveBeenCalledWith(
      "page_sections",
      "id-hero",
      expect.objectContaining({ media_id: null }),
    );
  });
});
