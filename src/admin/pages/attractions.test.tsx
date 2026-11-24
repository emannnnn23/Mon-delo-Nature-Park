import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Link, createRoutesStub } from "react-router";

import { Toast, dismissAllToasts } from "~/admin/components/Toast";
import {
  deleteRow,
  insertRow,
  markConfirmed,
  nextSortOrder,
  setPublished,
  swapOrder,
  updateRow,
} from "~/services/admin/crud";
import { AdminError } from "~/services/admin/errors";
import type { MediaRow, Row } from "~/types/db-helpers";

import { AttractionFormPage } from "./AttractionFormPage";
import { AttractionsListPage } from "./AttractionsListPage";

vi.mock("~/services/admin/crud", () => ({
  deleteRow: vi.fn(),
  insertRow: vi.fn(),
  markConfirmed: vi.fn(),
  nextSortOrder: vi.fn(),
  setPublished: vi.fn(),
  swapOrder: vi.fn(),
  updateRow: vi.fn(),
}));

// The real picker and uploader are covered elsewhere: here only what they are
// given and what they report back.
vi.mock("~/admin/components/ImagePicker", () => ({
  ImagePicker: ({
    purpose,
    onChange,
  }: {
    purpose: string;
    onChange: (row: MediaRow | null) => void;
  }) => (
    <div data-testid="image-picker" data-purpose={purpose}>
      <button type="button" onClick={() => onChange(lagoon)}>
        Pick the lagoon
      </button>
    </div>
  ),
}));
vi.mock("~/admin/components/MediaUploader", () => ({
  MediaUploader: ({
    onUploaded,
  }: {
    onUploaded: (rows: MediaRow[]) => void;
  }) => (
    <button type="button" onClick={() => onUploaded([lagoon])}>
      Finish upload
    </button>
  ),
}));

type Attraction = Row<"attractions">;
type AttractionImage = Row<"attraction_images">;

function attraction(id: string, extra: Partial<Attraction> = {}): Attraction {
  return {
    id,
    kind: "attraction",
    slug: `slug-${id}`,
    name: `Name ${id}`,
    summary: `Summary ${id}`,
    description: null,
    icon: null,
    cover_media_id: null,
    is_featured: false,
    is_published: true,
    sort_order: 1,
    is_sample: false,
    created_at: "2026-11-23T00:00:00Z",
    updated_at: "2026-11-23T00:00:00Z",
    ...extra,
  };
}

function image(id: string, extra: Partial<AttractionImage> = {}) {
  return {
    id,
    attraction_id: "a1",
    media_id: "lagoon",
    caption: null,
    sort_order: 1,
    created_at: "2026-11-23T00:00:00Z",
    updated_at: "2026-11-23T00:00:00Z",
    ...extra,
  } satisfies AttractionImage;
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

beforeEach(() => {
  sessionStorage.clear();
  vi.mocked(updateRow).mockImplementation(async (_t, id, values) => ({
    ...attraction(String(id)),
    ...(values as object),
  }));
});

afterEach(() => {
  for (const fn of [
    deleteRow,
    insertRow,
    markConfirmed,
    nextSortOrder,
    setPublished,
    swapOrder,
    updateRow,
  ]) {
    vi.mocked(fn).mockReset();
  }
  act(() => dismissAllToasts());
});

describe("AttractionsListPage", () => {
  const rows = [
    attraction("a1", { name: "Beautiful Gardens", sort_order: 1 }),
    attraction("a2", { name: "Hilltop View", sort_order: 2, is_sample: true }),
    attraction("e1", {
      kind: "experience",
      name: "Guided Walks",
      icon: "leaf",
      sort_order: 1,
    }),
  ];

  function renderList(initial = "/admin/attractions") {
    const Stub = createRoutesStub([
      {
        path: "/admin/attractions",
        Component: () => (
          <>
            <AttractionsListPage rows={rows} />
            <Toast />
          </>
        ),
      },
    ]);
    return render(<Stub initialEntries={[initial]} />);
  }

  it("shows the attractions tab first, and switches tab through ?kind=", async () => {
    renderList();
    expect(
      screen.getByRole("heading", { level: 1, name: "Attractions" }),
    ).toBeInTheDocument();
    const tabs = screen.getByRole("tablist");
    expect(
      within(tabs).getByRole("tab", { name: "Attractions" }),
    ).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("Beautiful Gardens")).toBeInTheDocument();
    expect(screen.queryByText("Guided Walks")).not.toBeInTheDocument();

    await userEvent.click(
      within(tabs).getByRole("tab", { name: "Experiences" }),
    );
    expect(screen.getByText("Guided Walks")).toBeInTheDocument();
    expect(screen.queryByText("Beautiful Gardens")).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Add experience" }),
    ).toHaveAttribute("href", "/admin/attractions/new?kind=experience");
  });

  it("opens on the experiences tab for ?kind=experience", () => {
    renderList("/admin/attractions?kind=experience");
    expect(screen.getByRole("tab", { name: "Experiences" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByText("Guided Walks")).toBeInTheDocument();
  });

  it("links to the new and edit pages, and marks samples", () => {
    renderList();
    expect(
      screen.getByRole("link", { name: "Add attraction" }),
    ).toHaveAttribute("href", "/admin/attractions/new");
    expect(
      screen.getByRole("link", { name: "Edit Beautiful Gardens" }),
    ).toHaveAttribute("href", "/admin/attractions/a1");
    expect(screen.getByText("Sample")).toBeInTheDocument();
  });

  it("publishes through setPublished", async () => {
    vi.mocked(setPublished).mockResolvedValue(
      attraction("a1", { name: "Beautiful Gardens", is_published: false }),
    );
    renderList();
    await userEvent.click(
      screen.getByRole("switch", {
        name: /^Publish Beautiful Gardens on website/,
      }),
    );
    expect(setPublished).toHaveBeenCalledWith("attractions", "a1", false);
    await waitFor(() =>
      expect(
        screen.getByRole("switch", {
          name: /^Publish Beautiful Gardens on website/,
        }),
      ).toHaveAttribute("aria-checked", "false"),
    );
  });

  it("reorders through swapOrder with the full rows, within the tab", async () => {
    vi.mocked(swapOrder).mockResolvedValue(undefined);
    renderList();
    await userEvent.click(
      screen.getByRole("button", { name: "Move Beautiful Gardens down" }),
    );
    expect(swapOrder).toHaveBeenCalledWith("attractions", rows[0], rows[1]);
    await waitFor(() => {
      const names = screen
        .getAllByRole("rowheader")
        .map((h) => h.textContent ?? "");
      expect(names[0]).toContain("Hilltop View");
      expect(names[1]).toContain("Beautiful Gardens");
    });
  });

  it("shows a friendly message when something fails", async () => {
    vi.mocked(setPublished).mockRejectedValue(
      new AdminError("NETWORK", "Can't reach the server."),
    );
    renderList();
    await userEvent.click(
      screen.getByRole("switch", {
        name: /^Publish Beautiful Gardens on website/,
      }),
    );
    expect(
      await screen.findByText("Can't reach the server."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("switch", {
        name: /^Publish Beautiful Gardens on website/,
      }),
    ).toHaveAttribute("aria-checked", "true");
  });

  it("asks before deleting and says the photos stay in the library", async () => {
    vi.mocked(deleteRow).mockResolvedValue(undefined);
    renderList();
    await userEvent.click(
      screen.getByRole("button", { name: "Delete Beautiful Gardens" }),
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveTextContent("Delete “Beautiful Gardens”?");
    expect(dialog).toHaveTextContent(
      "Its extra photos will be removed from this attraction (the photos stay in your media library).",
    );
    expect(deleteRow).not.toHaveBeenCalled();
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Delete" }),
    );
    expect(deleteRow).toHaveBeenCalledWith("attractions", "a1");
    await waitFor(() =>
      expect(screen.queryByText("Beautiful Gardens")).not.toBeInTheDocument(),
    );
  });

  it("says when a tab is empty", async () => {
    const Stub = createRoutesStub([
      {
        path: "/admin/attractions",
        Component: () => <AttractionsListPage rows={[]} />,
      },
    ]);
    render(<Stub initialEntries={["/admin/attractions"]} />);
    expect(screen.getByText(/No attractions yet/)).toBeInTheDocument();
  });
});

describe("AttractionsListPage homepage labels", () => {
  function renderRows(rows: Attraction[]) {
    const Stub = createRoutesStub([
      {
        path: "/admin/attractions",
        Component: () => <AttractionsListPage rows={rows} />,
      },
    ]);
    return render(<Stub initialEntries={["/admin/attractions"]} />);
  }

  const featured = (
    id: string,
    order: number,
    extra: Partial<Attraction> = {},
  ) =>
    attraction(id, {
      name: id,
      sort_order: order,
      is_featured: true,
      ...extra,
    });

  it("says On the homepage only for the first three published featured attractions", () => {
    renderRows([
      featured("A1", 1),
      featured("A2", 2),
      featured("A3", 3),
      featured("A4", 4),
      attraction("A5", { name: "A5", sort_order: 5 }),
    ]);
    const item = (name: string) =>
      screen.getByText(name).closest("tr") as HTMLElement;
    for (const name of ["A1", "A2", "A3"]) {
      expect(
        within(item(name)).getByText("On the homepage"),
      ).toBeInTheDocument();
    }
    expect(
      within(item("A4")).getByText("Featured — not shown yet"),
    ).toBeInTheDocument();
    expect(within(item("A4")).queryByText("On the homepage")).toBeNull();
    expect(within(item("A5")).queryByText(/homepage|Featured/)).toBeNull();
  });

  it("does not count a hidden featured attraction against the limit", () => {
    renderRows([
      featured("H1", 1, { is_published: false }),
      featured("B1", 2),
      featured("B2", 3),
      featured("B3", 4),
    ]);
    const item = (name: string) =>
      screen.getByText(name).closest("tr") as HTMLElement;
    expect(within(item("B3")).getByText("On the homepage")).toBeInTheDocument();
    expect(
      within(item("H1")).getByText("Featured — not shown yet"),
    ).toBeInTheDocument();
  });
});

describe("AttractionFormPage", () => {
  function renderForm(
    props: {
      row?: Attraction | null;
      kind?: "attraction" | "experience";
      images?: AttractionImage[];
    } = {},
  ) {
    const row = props.row ?? null;
    const Stub = createRoutesStub([
      {
        path: "/admin/attractions/new",
        Component: () => (
          <>
            <AttractionFormPage
              key="new"
              row={null}
              kind={props.kind ?? "attraction"}
              media={[lagoon]}
              images={[]}
            />
            <Link to="/admin/attractions">Back to list</Link>
            <Toast />
          </>
        ),
      },
      {
        path: "/admin/attractions/:id",
        Component: () =>
          row ? (
            <>
              <AttractionFormPage
                row={row}
                kind={row.kind as "attraction" | "experience"}
                media={[lagoon]}
                images={props.images ?? []}
              />
              <Link to="/admin/attractions">Back to list</Link>
              <Toast />
            </>
          ) : (
            <h1>Saved attraction page</h1>
          ),
      },
      {
        path: "/admin/attractions",
        Component: () => <h1>The list</h1>,
      },
    ]);
    return render(
      <Stub
        initialEntries={[
          row ? `/admin/attractions/${row.id}` : "/admin/attractions/new",
        ]}
      />,
    );
  }

  async function fill(label: string | RegExp, text: string) {
    const input = screen.getByLabelText(label);
    await userEvent.clear(input);
    if (text) await userEvent.type(input, text);
  }

  describe("a new attraction", () => {
    it("fills the web address from the name until it is edited", async () => {
      renderForm();
      expect(
        screen.getByRole("heading", { level: 1, name: "Add attraction" }),
      ).toBeInTheDocument();
      await userEvent.type(screen.getByLabelText("Name"), "Hilltop View Deck");
      expect(screen.getByLabelText("Web address")).toHaveValue(
        "hilltop-view-deck",
      );

      await fill("Web address", "the-deck");
      await userEvent.type(screen.getByLabelText("Name"), " Two");
      expect(screen.getByLabelText("Web address")).toHaveValue("the-deck");
    });

    it("keeps following the name when the web address is emptied", async () => {
      renderForm();
      await userEvent.type(screen.getByLabelText("Name"), "Falls");
      await fill("Web address", "");
      await userEvent.type(screen.getByLabelText("Name"), " Trail");
      expect(screen.getByLabelText("Web address")).toHaveValue("falls-trail");
    });

    it("offers the attraction fields and none of the experience-only ones", () => {
      renderForm();
      for (const label of ["Name", "Web address", "Short summary"]) {
        expect(screen.getByLabelText(label)).toBeInTheDocument();
      }
      expect(screen.getByLabelText(/^Description/)).toBeInTheDocument();
      expect(
        screen.getByRole("switch", { name: "Show on homepage" }),
      ).toBeInTheDocument();
      expect(screen.getByText(/shows up to 3/i)).toBeInTheDocument();
      expect(
        screen.getByRole("switch", { name: "Publish on website" }),
      ).toBeInTheDocument();
      expect(screen.getByTestId("image-picker")).toHaveAttribute(
        "data-purpose",
        "cover",
      );
      expect(
        screen.getByRole("radio", { name: "No icon" }),
      ).toBeInTheDocument();
      // More photos need a saved attraction.
      expect(screen.getByText(/Save the attraction first/)).toBeInTheDocument();
    });

    it("shows a live count for the summary", async () => {
      renderForm();
      expect(screen.getByText("0 of 160 characters")).toBeInTheDocument();
      await userEvent.type(screen.getByLabelText("Short summary"), "Hello");
      expect(screen.getByText("5 of 160 characters")).toBeInTheDocument();
    });

    it("saves it last, unpublished and not a sample, then opens it", async () => {
      vi.mocked(nextSortOrder).mockResolvedValue(4);
      vi.mocked(insertRow).mockImplementation(async (_t, values) => ({
        ...attraction("new-id"),
        ...(values as object),
      }));
      renderForm();
      await userEvent.type(screen.getByLabelText("Name"), "Hilltop View Deck");
      await userEvent.type(
        screen.getByLabelText("Short summary"),
        "A wide view.",
      );
      await userEvent.click(
        screen.getByRole("button", { name: "Pick the lagoon" }),
      );
      await userEvent.click(screen.getByRole("button", { name: "Save" }));

      expect(nextSortOrder).toHaveBeenCalledWith("attractions", {
        kind: "attraction",
      });
      expect(insertRow).toHaveBeenCalledWith("attractions", {
        kind: "attraction",
        name: "Hilltop View Deck",
        slug: "hilltop-view-deck",
        summary: "A wide view.",
        description: "",
        icon: null,
        cover_media_id: "lagoon",
        is_featured: false,
        is_published: false,
        is_sample: false,
        sort_order: 4,
      });
      // No leave prompt after saving: it goes straight to the saved page.
      expect(
        await screen.findByRole("heading", { name: "Saved attraction page" }),
      ).toBeInTheDocument();
      expect(sessionStorage.length).toBe(0);
    });

    it("shows field messages and does not save an invalid form", async () => {
      renderForm();
      await userEvent.click(screen.getByRole("button", { name: "Save" }));
      expect(insertRow).not.toHaveBeenCalled();
      expect(screen.getByLabelText("Name")).toHaveAccessibleDescription(
        "Please enter a name.",
      );
      expect(
        screen.getByLabelText("Short summary"),
      ).toHaveAccessibleDescription(/Please add a short summary\./);
      expect(screen.getByLabelText("Web address")).toHaveAccessibleDescription(
        /Please enter a web address\./,
      );
      expect(screen.getByLabelText("Name")).toHaveFocus();
    });

    it("rejects a web address that is not lowercase words", async () => {
      renderForm();
      await userEvent.type(screen.getByLabelText("Name"), "Deck");
      await userEvent.type(screen.getByLabelText("Short summary"), "A deck.");
      await fill("Web address", "Scenic Views");
      await userEvent.click(screen.getByRole("button", { name: "Save" }));
      expect(insertRow).not.toHaveBeenCalled();
      expect(screen.getByLabelText("Web address")).toHaveAccessibleDescription(
        /lowercase/,
      );
    });

    it("shows a taken web address next to the field (23505)", async () => {
      vi.mocked(nextSortOrder).mockResolvedValue(0);
      vi.mocked(insertRow).mockRejectedValue(
        new AdminError("23505", "That attraction already exists."),
      );
      renderForm();
      await userEvent.type(screen.getByLabelText("Name"), "Hilltop View Deck");
      await userEvent.type(screen.getByLabelText("Short summary"), "A view.");
      await userEvent.click(screen.getByRole("button", { name: "Save" }));
      const field = screen.getByLabelText("Web address");
      await waitFor(() => expect(field).toBeInvalid());
      expect(field).toHaveAccessibleDescription(
        /That web address is already used by another attraction\./,
      );
      expect(field).toHaveFocus();
      // Fixing the address clears the message.
      await userEvent.type(field, "-2");
      expect(field).not.toBeInvalid();
    });

    it("asks before leaving with unsaved changes", async () => {
      renderForm();
      await userEvent.type(screen.getByLabelText("Name"), "Deck");
      await userEvent.click(screen.getByRole("link", { name: "Back to list" }));
      expect(
        screen.getByRole("dialog", { name: "Leave without saving?" }),
      ).toBeInTheDocument();
      await userEvent.click(screen.getByRole("button", { name: "Stay" }));
      expect(screen.getByLabelText("Name")).toHaveValue("Deck");
    });
  });

  describe("a new experience", () => {
    it("offers only name, summary, icon, cover and publish", () => {
      renderForm({ kind: "experience" });
      expect(
        screen.getByRole("heading", { level: 1, name: "Add experience" }),
      ).toBeInTheDocument();
      expect(screen.getByLabelText("Name")).toBeInTheDocument();
      expect(screen.getByLabelText("Short summary")).toBeInTheDocument();
      expect(screen.queryByLabelText(/^Description/)).not.toBeInTheDocument();
      expect(screen.queryByLabelText("Web address")).not.toBeInTheDocument();
      expect(
        screen.queryByRole("switch", { name: "Show on homepage" }),
      ).not.toBeInTheDocument();
      expect(screen.queryByText("More photos")).not.toBeInTheDocument();
      expect(screen.queryByRole("radio", { name: "No icon" })).toBeNull();
      expect(screen.getAllByRole("radio")).toHaveLength(12);
      expect(screen.getByTestId("image-picker")).toHaveAttribute(
        "data-purpose",
        "gallery",
      );
    });

    it("needs an icon", async () => {
      renderForm({ kind: "experience" });
      await userEvent.type(screen.getByLabelText("Name"), "Guided Walks");
      await userEvent.type(screen.getByLabelText("Short summary"), "Walks.");
      await userEvent.click(screen.getByRole("button", { name: "Save" }));
      expect(insertRow).not.toHaveBeenCalled();
      expect(
        screen.getByRole("radiogroup", { name: "Icon" }),
      ).toHaveAccessibleDescription("Experiences need an icon.");
    });

    it("saves with the chosen icon and a generated address, then returns to the list", async () => {
      vi.mocked(nextSortOrder).mockResolvedValue(2);
      vi.mocked(insertRow).mockImplementation(async (_t, values) => ({
        ...attraction("new-id", { kind: "experience" }),
        ...(values as object),
      }));
      renderForm({ kind: "experience" });
      await userEvent.type(screen.getByLabelText("Name"), "Guided Walks");
      await userEvent.type(screen.getByLabelText("Short summary"), "Walks.");
      await userEvent.click(screen.getByRole("radio", { name: "Leaf" }));
      await userEvent.click(screen.getByRole("button", { name: "Save" }));
      expect(nextSortOrder).toHaveBeenCalledWith("attractions", {
        kind: "experience",
      });
      expect(insertRow).toHaveBeenCalledWith("attractions", {
        kind: "experience",
        name: "Guided Walks",
        slug: "guided-walks",
        summary: "Walks.",
        icon: "leaf",
        cover_media_id: null,
        is_published: false,
        is_sample: false,
        sort_order: 2,
      });
      expect(
        await screen.findByRole("heading", { name: "The list" }),
      ).toBeInTheDocument();
    });

    it("tries a different address when the generated one is taken", async () => {
      vi.mocked(nextSortOrder).mockResolvedValue(0);
      vi.mocked(insertRow)
        .mockRejectedValueOnce(new AdminError("23505", "exists"))
        .mockImplementationOnce(async (_t, values) => ({
          ...attraction("new-id", { kind: "experience" }),
          ...(values as object),
        }));
      renderForm({ kind: "experience" });
      await userEvent.type(screen.getByLabelText("Name"), "Guided Walks");
      await userEvent.type(screen.getByLabelText("Short summary"), "Walks.");
      await userEvent.click(screen.getByRole("radio", { name: "Leaf" }));
      await userEvent.click(screen.getByRole("button", { name: "Save" }));
      expect(
        await screen.findByRole("heading", { name: "The list" }),
      ).toBeInTheDocument();
      expect(insertRow).toHaveBeenCalledTimes(2);
      const second = vi.mocked(insertRow).mock.calls[1][1] as { slug: string };
      expect(second.slug).toMatch(/^guided-walks-[a-z0-9]{6}$/);
    });
  });

  describe("an existing attraction", () => {
    const saved = attraction("a1", {
      name: "Beautiful Gardens",
      slug: "beautiful-gardens",
      summary: "Flowers everywhere.",
      description: "Long text.",
      is_featured: true,
      is_published: true,
      icon: "flower-2",
      cover_media_id: "lagoon",
    });

    it("loads the saved values and never rewrites the address from the name", async () => {
      renderForm({ row: saved });
      expect(
        screen.getByRole("heading", { level: 1, name: "Edit attraction" }),
      ).toBeInTheDocument();
      expect(screen.getByLabelText("Name")).toHaveValue("Beautiful Gardens");
      expect(screen.getByLabelText("Web address")).toHaveValue(
        "beautiful-gardens",
      );
      expect(screen.getByRole("radio", { name: "Flower" })).toBeChecked();
      expect(
        screen.getByRole("switch", { name: "Show on homepage" }),
      ).toHaveAttribute("aria-checked", "true");
      expect(
        screen.getByText(/only attractions that are on the website count/i),
      ).toBeInTheDocument();
      await userEvent.type(screen.getByLabelText("Name"), " Park");
      expect(screen.getByLabelText("Web address")).toHaveValue(
        "beautiful-gardens",
      );
    });

    it("updates the row and stays on the page", async () => {
      renderForm({ row: saved });
      await fill("Short summary", "Roses and orchids.");
      await userEvent.click(
        screen.getByRole("switch", { name: "Show on homepage" }),
      );
      await userEvent.click(screen.getByRole("button", { name: "Save" }));
      expect(updateRow).toHaveBeenCalledWith("attractions", "a1", {
        name: "Beautiful Gardens",
        slug: "beautiful-gardens",
        summary: "Roses and orchids.",
        description: "Long text.",
        icon: "flower-2",
        cover_media_id: "lagoon",
        is_featured: false,
        is_published: true,
      });
      expect(await screen.findByText("Saved.")).toBeInTheDocument();
      expect(
        screen.getByRole("heading", { level: 1, name: "Edit attraction" }),
      ).toBeInTheDocument();
    });

    it("confirms a sample without touching the form", async () => {
      vi.mocked(markConfirmed).mockResolvedValue(
        attraction("a1", { is_sample: false }),
      );
      renderForm({ row: { ...saved, is_sample: true } });
      await userEvent.type(screen.getByLabelText("Name"), "!");
      await userEvent.click(
        screen.getByRole("button", { name: "Mark as confirmed" }),
      );
      expect(markConfirmed).toHaveBeenCalledWith("attractions", "a1");
      await waitFor(() =>
        expect(
          screen.queryByRole("button", { name: "Mark as confirmed" }),
        ).not.toBeInTheDocument(),
      );
      expect(screen.getByLabelText("Name")).toHaveValue("Beautiful Gardens!");
    });

    describe("more photos", () => {
      const first = image("i1", { sort_order: 1, caption: "Front gate" });
      const second = image("i2", { sort_order: 2 });

      it("lists the photos with captions", () => {
        renderForm({ row: saved, images: [first, second] });
        const section = screen.getByRole("region", { name: "More photos" });
        expect(within(section).getAllByRole("listitem")).toHaveLength(2);
        expect(within(section).getAllByLabelText(/^Caption/)[0]).toHaveValue(
          "Front gate",
        );
      });

      it("adds uploaded photos last, one row each", async () => {
        vi.mocked(nextSortOrder).mockResolvedValue(3);
        vi.mocked(insertRow).mockImplementation(async (_t, values) => ({
          ...image("i3"),
          ...(values as object),
        }));
        renderForm({ row: saved, images: [first, second] });
        await userEvent.click(
          screen.getByRole("button", { name: "Add photos" }),
        );
        await userEvent.click(
          screen.getByRole("button", { name: "Finish upload" }),
        );
        expect(nextSortOrder).toHaveBeenCalledWith("attraction_images", {
          attraction_id: "a1",
        });
        expect(insertRow).toHaveBeenCalledWith("attraction_images", {
          attraction_id: "a1",
          media_id: "lagoon",
          sort_order: 3,
        });
        await waitFor(() =>
          expect(
            within(
              screen.getByRole("region", { name: "More photos" }),
            ).getAllByRole("listitem"),
          ).toHaveLength(3),
        );
      });

      it("reorders with swapOrder on the full rows", async () => {
        vi.mocked(swapOrder).mockResolvedValue(undefined);
        renderForm({ row: saved, images: [first, second] });
        await userEvent.click(
          screen.getByRole("button", { name: "Move photo 1 down" }),
        );
        expect(swapOrder).toHaveBeenCalledWith(
          "attraction_images",
          first,
          second,
        );
        await waitFor(() =>
          expect(
            screen.getByRole("button", { name: "Move photo 2 up" }),
          ).toBeInTheDocument(),
        );
        expect(
          within(
            screen.getByRole("region", { name: "More photos" }),
          ).getAllByLabelText(/^Caption/)[1],
        ).toHaveValue("Front gate");
      });

      it("saves a caption on its own", async () => {
        vi.mocked(updateRow).mockImplementation(async (_t, id, values) => ({
          ...image(String(id)),
          ...(values as object),
        }));
        renderForm({ row: saved, images: [first, second] });
        const caption = screen.getAllByLabelText(/^Caption/)[1];
        await userEvent.type(caption, "By the lake");
        await userEvent.click(
          screen.getByRole("button", { name: "Save caption for photo 2" }),
        );
        expect(updateRow).toHaveBeenCalledWith("attraction_images", "i2", {
          caption: "By the lake",
        });
        expect(await screen.findByText("Caption saved.")).toBeInTheDocument();
      });

      it("removes a photo from the attraction only, after asking", async () => {
        vi.mocked(deleteRow).mockResolvedValue(undefined);
        renderForm({ row: saved, images: [first, second] });
        await userEvent.click(
          screen.getByRole("button", { name: "Remove photo 1" }),
        );
        const dialog = screen.getByRole("dialog");
        expect(dialog).toHaveTextContent("stays in your media library");
        await userEvent.click(
          within(dialog).getByRole("button", { name: "Remove" }),
        );
        expect(deleteRow).toHaveBeenCalledWith("attraction_images", "i1");
        expect(deleteRow).not.toHaveBeenCalledWith(
          "attractions",
          expect.anything(),
        );
        await waitFor(() =>
          expect(
            within(
              screen.getByRole("region", { name: "More photos" }),
            ).getAllByRole("listitem"),
          ).toHaveLength(1),
        );
      });
    });
  });

  describe("an existing experience", () => {
    const saved = attraction("e1", {
      kind: "experience",
      name: "Guided Walks",
      slug: "guided-walks",
      summary: "Walks.",
      description: "Old text kept in the database.",
      icon: "leaf",
      is_featured: true,
    });

    it("sends only the offered columns, leaving the others as stored", async () => {
      renderForm({ row: saved });
      expect(
        screen.getByRole("heading", { level: 1, name: "Edit experience" }),
      ).toBeInTheDocument();
      await fill("Short summary", "Easy guided walks.");
      await userEvent.click(screen.getByRole("button", { name: "Save" }));
      expect(updateRow).toHaveBeenCalledWith("attractions", "e1", {
        name: "Guided Walks",
        summary: "Easy guided walks.",
        icon: "leaf",
        cover_media_id: null,
        is_published: true,
      });
    });
  });
});
