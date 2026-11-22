import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRoutesStub } from "react-router";

import { Toast, dismissAllToasts } from "~/admin/components/Toast";
import { SECTION_LABELS } from "~/admin/lib/sectionLabels";
import {
  insertRow,
  markConfirmed,
  nextSortOrder,
  updateRow,
} from "~/services/admin/crud";
import { AdminError } from "~/services/admin/errors";
import type { PageKey } from "~/types/content";
import type { Row } from "~/types/db-helpers";

import { PageSectionsPage } from "./PageSectionsPage";

vi.mock("~/services/admin/crud", () => ({
  insertRow: vi.fn(),
  markConfirmed: vi.fn(),
  nextSortOrder: vi.fn(),
  updateRow: vi.fn(),
}));

// The real picker is covered elsewhere: here only the purpose it is given.
vi.mock("~/admin/components/ImagePicker", () => ({
  ImagePicker: ({ purpose }: { purpose: string }) => (
    <div data-testid="image-picker" data-purpose={purpose} />
  ),
}));

type Section = Row<"page_sections">;

function section(
  page: PageKey,
  key: string,
  extra: Partial<Section> = {},
): Section {
  return {
    id: `id-${page}-${key}`,
    page,
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

function renderPage(page: PageKey, rows: Section[]) {
  const Stub = createRoutesStub([
    {
      path: "/admin/pages/:page",
      Component: () => (
        <>
          <PageSectionsPage page={page} rows={rows} media={[]} />
          <Toast />
        </>
      ),
    },
  ]);
  return render(<Stub initialEntries={[`/admin/pages/${page}`]} />);
}

async function openSection(name: string) {
  const toggle = screen.getByRole("button", {
    name: (accessible) => accessible.startsWith(name),
  });
  if (toggle.getAttribute("aria-expanded") === "false")
    await userEvent.click(toggle);
  return screen.getByRole("region", { name });
}

type Field = "eyebrow" | "heading" | "body" | "button" | "photo";

// What the public site renders for each section (the owner's editing screen
// offers exactly these, plus the publish switch).
const EXPECTED: Record<PageKey, Record<string, Field[]>> = {
  home: {
    hero: ["heading", "body", "photo"],
    intro: ["eyebrow", "heading", "body", "button"],
    discover: ["heading", "body"],
    gallery: ["heading", "body"],
    testimonials: ["heading"],
    visit: ["heading", "body"],
  },
  about: {
    intro: ["heading", "body"],
    story: ["eyebrow", "heading", "body", "photo"],
    mission: ["eyebrow", "heading", "body", "photo"],
    vision: ["eyebrow", "heading", "body", "photo"],
    surroundings: ["eyebrow", "heading", "body", "photo"],
  },
  visit: {
    intro: ["heading", "body"],
    getting_here: ["heading", "body"],
  },
};

beforeEach(() => {
  sessionStorage.clear();
  vi.mocked(updateRow).mockImplementation(async (_t, id, values) => ({
    ...section("home", "hero"),
    id,
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

describe("fields offered per section", () => {
  const cases = (Object.keys(EXPECTED) as PageKey[]).flatMap((page) =>
    Object.entries(EXPECTED[page]).map(
      ([key, fields]) => [page, key, fields] as const,
    ),
  );

  it.each(cases)("%s.%s offers only %j", async (page, key, fields) => {
    const rows = Object.keys(SECTION_LABELS[page]).map((k) => section(page, k));
    renderPage(page, rows);
    const region = await openSection(SECTION_LABELS[page][key]);
    const has = {
      eyebrow: !!within(region).queryByLabelText(
        "Small heading above the title",
      ),
      heading: !!within(region).queryByLabelText("Title"),
      body: !!within(region).queryByLabelText("Text"),
      button:
        !!within(region).queryByLabelText("Button label") &&
        !!within(region).queryByLabelText("Button link"),
      photo: !!within(region).queryByRole("group", { name: "Photo" }),
    };
    const offered = (Object.keys(has) as Field[]).filter((f) => has[f]);
    expect(offered.sort()).toEqual([...fields].sort());
    // The publish switch is always there.
    expect(
      within(region).getByRole("switch", { name: "Publish on website" }),
    ).toBeInTheDocument();
  });

  it("matches the labelled sections exactly", () => {
    for (const page of Object.keys(EXPECTED) as PageKey[]) {
      expect(Object.keys(EXPECTED[page])).toEqual(
        Object.keys(SECTION_LABELS[page]),
      );
    }
  });
});

describe("saving only what is offered", () => {
  it("does not null the hidden eyebrow or button of the hero", async () => {
    renderPage("home", [
      section("home", "hero", {
        eyebrow: "Hidden eyebrow",
        heading: "Find Your Peace",
        cta_label: "Hidden",
        cta_href: "/hidden",
      }),
    ]);
    const region = screen.getByRole("region", { name: /Top banner/ });
    await userEvent.type(within(region).getByLabelText("Title"), "!");
    await userEvent.click(
      within(region).getByRole("button", { name: "Save changes" }),
    );
    expect(updateRow).toHaveBeenCalledTimes(1);
    const values = vi.mocked(updateRow).mock.calls[0][2] as Record<
      string,
      unknown
    >;
    expect(values).toMatchObject({
      heading: "Find Your Peace!",
      is_published: true,
    });
    expect(values).toHaveProperty("body");
    expect(values).toHaveProperty("media_id");
    expect(values).not.toHaveProperty("eyebrow");
    expect(values).not.toHaveProperty("cta_label");
    expect(values).not.toHaveProperty("cta_href");
  });

  it("sends the button columns only for a section that offers a button", async () => {
    renderPage("home", [
      section("home", "intro", { cta_label: "Learn More", cta_href: "/about" }),
    ]);
    const region = await openSection("Welcome introduction");
    await userEvent.type(within(region).getByLabelText("Title"), "!");
    await userEvent.click(
      within(region).getByRole("button", { name: "Save changes" }),
    );
    expect(updateRow).toHaveBeenCalledWith(
      "page_sections",
      "id-home-intro",
      expect.objectContaining({
        eyebrow: "",
        cta_label: "Learn More",
        cta_href: "/about",
      }),
    );
    const values = vi.mocked(updateRow).mock.calls[0][2] as Record<
      string,
      unknown
    >;
    expect(values).not.toHaveProperty("media_id");
  });
});

describe("unknown sections", () => {
  it("says the website does not use it, and keeps it collapsed at the end", async () => {
    renderPage("home", [
      section("home", "legacy", { heading: "Old" }),
      section("home", "hero", { heading: "Hero" }),
    ]);
    const toggles = Array.from(
      document.querySelectorAll<HTMLElement>("button[aria-controls]"),
    );
    expect(toggles[toggles.length - 1]).toHaveTextContent(/Legacy/);
    expect(toggles[toggles.length - 1]).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    const region = await openSection("Legacy");
    expect(
      within(region).getByText("The website doesn't use this section."),
    ).toBeInTheDocument();
    expect(within(region).queryByLabelText("Title")).not.toBeInTheDocument();
  });
});

describe("photo purpose", () => {
  it("is cover for the home banner and gallery for about photos", async () => {
    renderPage("home", [section("home", "hero")]);
    expect(screen.getByTestId("image-picker")).toHaveAttribute(
      "data-purpose",
      "cover",
    );
  });

  it("is gallery for an about section photo", async () => {
    renderPage("about", [section("about", "story")]);
    const region = await openSection("Our story");
    expect(within(region).getByTestId("image-picker")).toHaveAttribute(
      "data-purpose",
      "gallery",
    );
  });
});

describe("sample hint, failures and focus", () => {
  it("explains what Mark as confirmed does", async () => {
    renderPage("about", [section("about", "story", { is_sample: true })]);
    const region = await openSection("Our story");
    expect(
      within(region).getByText(
        "After you've checked this text, press Mark as confirmed to remove the Sample label on the website.",
      ),
    ).toBeInTheDocument();
  });

  it("shows a friendly message when confirming fails", async () => {
    vi.mocked(markConfirmed).mockRejectedValue(
      new AdminError("NETWORK", "Can't reach the server. Try again."),
    );
    renderPage("about", [section("about", "story", { is_sample: true })]);
    const region = await openSection("Our story");
    await userEvent.click(
      within(region).getByRole("button", { name: "Mark as confirmed" }),
    );
    const alert = await within(region).findByText(
      "Can't reach the server. Try again.",
    );
    expect(alert).toHaveFocus();
    // Still a sample: nothing changed.
    expect(within(region).getByText("Sample")).toBeInTheDocument();
  });

  it("moves focus to the message when a save fails", async () => {
    vi.mocked(updateRow).mockRejectedValue(
      new AdminError("NETWORK", "Can't reach the server. Try again."),
    );
    renderPage("home", [section("home", "hero")]);
    const region = screen.getByRole("region", { name: /Top banner/ });
    await userEvent.type(within(region).getByLabelText("Title"), "x");
    await userEvent.click(
      within(region).getByRole("button", { name: "Save changes" }),
    );
    expect(
      await within(region).findByText("Can't reach the server. Try again."),
    ).toHaveFocus();
  });

  it("explains a duplicate section without mentioning a web address", async () => {
    vi.mocked(nextSortOrder).mockResolvedValue(3);
    vi.mocked(insertRow).mockRejectedValue({ code: "23505" });
    renderPage("home", [section("home", "hero")]);
    await userEvent.click(
      screen.getByRole("button", { name: "Add section: Discover the park" }),
    );
    const alert = await screen.findByText(
      "That section was already added — reload the page to see it.",
    );
    expect(alert).not.toHaveTextContent(/web address/i);
    expect(alert).toHaveFocus();
  });

  it("shows a friendly message when adding fails for another reason", async () => {
    vi.mocked(nextSortOrder).mockRejectedValue(
      new AdminError("NETWORK", "Can't reach the server. Try again."),
    );
    renderPage("home", [section("home", "hero")]);
    await userEvent.click(
      screen.getByRole("button", { name: "Add section: Discover the park" }),
    );
    expect(
      await screen.findByText("Can't reach the server. Try again."),
    ).toBeInTheDocument();
    expect(insertRow).not.toHaveBeenCalled();
  });

  it("keeps other sections open when one is added", async () => {
    vi.mocked(nextSortOrder).mockResolvedValue(3);
    vi.mocked(insertRow).mockResolvedValueOnce(
      section("home", "discover", { is_published: false }),
    );
    renderPage("home", [section("home", "hero")]);
    expect(screen.getByRole("button", { name: /Top banner/ })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Add section: Discover the park" }),
    );
    await screen.findByRole("region", { name: "Discover the park" });
    expect(screen.getByRole("button", { name: /Top banner/ })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    vi.mocked(insertRow).mockResolvedValueOnce(
      section("home", "gallery", { is_published: false }),
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Add section: Photo gallery" }),
    );
    await screen.findByRole("region", { name: "Photo gallery" });
    expect(
      screen.getByRole("button", { name: /Discover the park/ }),
    ).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("button", { name: /Top banner/ })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
  });

  it("saving one section leaves another section's unsaved changes alone", async () => {
    renderPage("home", [section("home", "hero"), section("home", "discover")]);
    const hero = screen.getByRole("region", { name: /Top banner/ });
    await userEvent.type(within(hero).getByLabelText("Title"), "a");
    const discover = await openSection("Discover the park");
    await userEvent.type(within(discover).getByLabelText("Title"), "b");
    await userEvent.click(
      within(hero).getByRole("button", { name: "Save changes" }),
    );
    await screen.findByText(/Top banner \(hero\) saved\./);
    expect(within(discover).getByLabelText("Title")).toHaveValue("b");
    expect(
      within(discover).getByRole("button", { name: "Save changes" }),
    ).toBeEnabled();
    expect(
      screen.getByRole("button", { name: /Discover the park/ }),
    ).toHaveTextContent("Unsaved changes");
    // Only the saved section's draft is gone.
    expect(sessionStorage.length).toBe(1);
    expect(sessionStorage.key(0)).toContain("id-home-discover");
  });
});
