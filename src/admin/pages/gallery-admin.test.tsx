import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Link, createRoutesStub, useLocation } from "react-router";

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

import { GalleryPage } from "./GalleryPage";

vi.mock("~/services/admin/crud", () => ({
  deleteRow: vi.fn(),
  insertRow: vi.fn(),
  markConfirmed: vi.fn(),
  nextSortOrder: vi.fn(),
  setPublished: vi.fn(),
  swapOrder: vi.fn(),
  updateRow: vi.fn(),
}));

// The real uploader is covered elsewhere: here only what it reports back.
vi.mock("~/admin/components/MediaUploader", () => ({
  MediaUploader: ({
    onUploaded,
  }: {
    onUploaded: (rows: MediaRow[]) => void;
  }) => (
    <button type="button" onClick={() => onUploaded([lagoon, falls])}>
      Finish upload
    </button>
  ),
}));

type Category = Row<"gallery_categories">;
type GalleryImage = Row<"gallery_images">;

const WATERFALLS = "11111111-1111-4111-8111-111111111111";
const TRAILS = "22222222-2222-4222-8222-222222222222";

function category(id: string, extra: Partial<Category> = {}): Category {
  return {
    id,
    name: `Category ${id}`,
    slug: `category-${id}`,
    is_published: true,
    sort_order: 1,
    created_at: "2026-11-23T00:00:00Z",
    updated_at: "2026-11-23T00:00:00Z",
    ...extra,
  };
}

function image(id: string, extra: Partial<GalleryImage> = {}): GalleryImage {
  return {
    id,
    media_id: "lagoon",
    category_id: null,
    caption: null,
    is_featured: false,
    is_published: true,
    sort_order: 1,
    is_sample: false,
    created_at: "2026-11-23T00:00:00Z",
    updated_at: "2026-11-23T00:00:00Z",
    ...extra,
  };
}

function mediaRow(id: string, alt: string): MediaRow {
  return {
    id,
    storage_base_path: `2026/${id}`,
    alt_text: alt,
    width: 3000,
    height: 2000,
    variants: { "480": `2026/${id}-480.webp` },
    focal_x: 50,
    focal_y: 50,
    original_filename: `${id}.jpg`,
    created_at: "2026-11-23T00:00:00Z",
    updated_at: "2026-11-23T00:00:00Z",
  };
}

const lagoon = mediaRow("lagoon", "Blue lagoon at sunrise");
const falls = mediaRow("falls", "Water over the rocks");

const categories = [
  category(WATERFALLS, {
    name: "Waterfalls",
    slug: "waterfalls",
    sort_order: 1,
  }),
  category(TRAILS, {
    name: "Trails",
    slug: "trails",
    sort_order: 2,
    is_published: false,
  }),
];

beforeEach(() => {
  sessionStorage.clear();
  vi.mocked(updateRow).mockImplementation(async (_t, id, values) => ({
    ...image(String(id)),
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

function Where() {
  const { pathname, search } = useLocation();
  return <p data-testid="where">{`${pathname}${search}`}</p>;
}

function renderGallery(
  props: {
    images?: GalleryImage[];
    categories?: Category[];
    entry?: string;
  } = {},
) {
  const Stub = createRoutesStub([
    {
      path: "/admin/gallery",
      Component: () => (
        <>
          <GalleryPage
            categories={props.categories ?? categories}
            images={props.images ?? []}
            media={[lagoon, falls]}
          />
          <Link to="/admin/elsewhere">Elsewhere</Link>
          <Where />
          <Toast />
        </>
      ),
    },
    { path: "/admin/elsewhere", Component: () => <h1>Elsewhere page</h1> },
  ]);
  return render(<Stub initialEntries={[props.entry ?? "/admin/gallery"]} />);
}

const labels = () =>
  screen.getAllByRole("group").map((g) => g.getAttribute("aria-label"));

describe("GalleryPage tabs", () => {
  it("opens on the photos tab and switches through ?tab=", async () => {
    renderGallery();
    expect(
      screen.getByRole("heading", { level: 1, name: "Gallery" }),
    ).toBeInTheDocument();
    const tabs = screen.getByRole("tablist");
    expect(within(tabs).getByRole("tab", { name: "Photos" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await userEvent.click(
      within(tabs).getByRole("tab", { name: "Categories" }),
    );
    expect(screen.getByTestId("where")).toHaveTextContent(
      "/admin/gallery?tab=categories",
    );
    expect(screen.getByText("Waterfalls")).toBeInTheDocument();
    await userEvent.click(within(tabs).getByRole("tab", { name: "Photos" }));
    expect(screen.getByTestId("where")).not.toHaveTextContent("tab=");
  });

  it("opens on the categories tab for ?tab=categories", () => {
    renderGallery({ entry: "/admin/gallery?tab=categories" });
    expect(screen.getByRole("tab", { name: "Categories" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });
});

describe("Photos tab: adding photos", () => {
  async function addPhotos() {
    await userEvent.click(screen.getByRole("button", { name: "Add photos" }));
    await userEvent.click(
      screen.getByRole("button", { name: "Finish upload" }),
    );
  }

  it("creates one unpublished row per uploaded photo, last in order", async () => {
    vi.mocked(nextSortOrder).mockResolvedValueOnce(5).mockResolvedValueOnce(6);
    vi.mocked(insertRow).mockImplementation(async (_t, values) => ({
      ...image(`new-${(values as { media_id: string }).media_id}`),
      ...(values as object),
    }));
    renderGallery();
    await addPhotos();

    await waitFor(() => expect(insertRow).toHaveBeenCalledTimes(2));
    expect(nextSortOrder).toHaveBeenCalledWith("gallery_images");
    expect(insertRow).toHaveBeenNthCalledWith(1, "gallery_images", {
      media_id: "lagoon",
      category_id: null,
      is_published: false,
      sort_order: 5,
    });
    expect(insertRow).toHaveBeenNthCalledWith(2, "gallery_images", {
      media_id: "falls",
      category_id: null,
      is_published: false,
      sort_order: 6,
    });
    expect(
      await screen.findByRole("group", { name: "Water over the rocks" }),
    ).toBeInTheDocument();
    expect(await screen.findByText("2 photos added.")).toBeInTheDocument();
  });

  it("puts new photos in the category being viewed", async () => {
    vi.mocked(nextSortOrder).mockResolvedValue(0);
    vi.mocked(insertRow).mockImplementation(async (_t, values) => ({
      ...image("new"),
      ...(values as object),
    }));
    renderGallery({ entry: `/admin/gallery?category=${WATERFALLS}` });
    await addPhotos();
    await waitFor(() => expect(insertRow).toHaveBeenCalledTimes(2));
    expect(insertRow).toHaveBeenCalledWith(
      "gallery_images",
      expect.objectContaining({
        category_id: WATERFALLS,
        is_published: false,
      }),
    );
  });

  it("keeps the photos that were added when a later one fails", async () => {
    vi.mocked(nextSortOrder).mockResolvedValue(0);
    vi.mocked(insertRow)
      .mockResolvedValueOnce(image("one", { is_published: false }))
      .mockRejectedValueOnce(
        new AdminError("NETWORK", "Can't reach the server."),
      );
    renderGallery();
    await addPhotos();
    expect(
      await screen.findByText("Can't reach the server."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("group", { name: "Blue lagoon at sunrise" }),
    ).toBeInTheDocument();
  });

  it("says how many were added and where the rest are when a later one fails", async () => {
    vi.mocked(nextSortOrder).mockResolvedValue(0);
    vi.mocked(insertRow)
      .mockResolvedValueOnce(image("one", { is_published: false }))
      .mockRejectedValueOnce(
        new AdminError("NETWORK", "Can't reach the server."),
      );
    renderGallery();
    await addPhotos();
    expect(
      await screen.findByText(
        "1 of 2 photos were added. The rest are in your media library.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText("1 photo added.")).not.toBeInTheDocument();
  });
});

describe("Photos tab: the grid", () => {
  const a = image("a", { caption: "Morning mist", sort_order: 1 });
  const b = image("b", {
    media_id: "falls",
    sort_order: 2,
    category_id: WATERFALLS,
  });
  const c = image("c", { sort_order: 3, is_published: false, is_sample: true });

  it("shows each photo as a labelled group named by caption or description", () => {
    renderGallery({ images: [a, b, c] });
    expect(
      screen.getByRole("group", { name: "Morning mist" }),
    ).toBeInTheDocument();
    const second = screen.getByRole("group", { name: "Water over the rocks" });
    expect(within(second).getByRole("img")).toHaveAttribute(
      "alt",
      "Water over the rocks",
    );
    expect(within(second).getByLabelText("Category for photo 2")).toHaveValue(
      WATERFALLS,
    );
    expect(
      screen.getByRole("textbox", { name: /Caption for photo 3/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("switch", { name: "Show photo 3 on homepage" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("switch", { name: "Publish photo 3 on website" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Move photo 3 left" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Delete photo 3" }),
    ).toBeInTheDocument();
  });

  it("says what the homepage does with the photos marked here", () => {
    renderGallery({ images: [a] });
    expect(
      screen.getByText(
        "The homepage shows the first 5 published photos marked here.",
      ),
    ).toBeInTheDocument();
  });

  it("says so when there are no photos", () => {
    renderGallery();
    expect(screen.getByText(/No photos yet/)).toBeInTheDocument();
  });

  it("changes a photo's category, and to none", async () => {
    renderGallery({ images: [a, b] });
    await userEvent.selectOptions(
      screen.getByLabelText("Category for photo 1"),
      "Waterfalls",
    );
    expect(updateRow).toHaveBeenCalledWith("gallery_images", "a", {
      category_id: WATERFALLS,
    });
    await waitFor(() =>
      expect(screen.getByLabelText("Category for photo 1")).toHaveValue(
        WATERFALLS,
      ),
    );
    await userEvent.selectOptions(
      screen.getByLabelText("Category for photo 2"),
      "No category",
    );
    expect(updateRow).toHaveBeenCalledWith("gallery_images", "b", {
      category_id: null,
    });
  });

  it("publishes through setPublished", async () => {
    vi.mocked(setPublished).mockResolvedValue({ ...c, is_published: true });
    renderGallery({ images: [a, b, c] });
    await userEvent.click(
      screen.getByRole("switch", { name: "Publish photo 3 on website" }),
    );
    expect(setPublished).toHaveBeenCalledWith("gallery_images", "c", true);
    await waitFor(() =>
      expect(
        screen.getByRole("switch", { name: "Publish photo 3 on website" }),
      ).toHaveAttribute("aria-checked", "true"),
    );
  });

  it("reorders with the full rows, left and right", async () => {
    vi.mocked(swapOrder).mockResolvedValue(undefined);
    renderGallery({ images: [a, b, c] });
    expect(
      screen.getByRole("button", { name: "Move photo 1 left" }),
    ).toHaveAttribute("aria-disabled", "true");
    await userEvent.click(
      screen.getByRole("button", { name: "Move photo 1 right" }),
    );
    expect(swapOrder).toHaveBeenCalledWith("gallery_images", a, b);
    await waitFor(() =>
      expect(labels()).toEqual([
        "Water over the rocks",
        "Morning mist",
        "Blue lagoon at sunrise",
      ]),
    );
  });

  it("deletes only the gallery row, after asking", async () => {
    vi.mocked(deleteRow).mockResolvedValue(undefined);
    renderGallery({ images: [a, b] });
    await userEvent.click(
      screen.getByRole("button", { name: "Delete photo 2" }),
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveTextContent("stays in your media library");
    expect(deleteRow).not.toHaveBeenCalled();
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Delete" }),
    );
    expect(deleteRow).toHaveBeenCalledTimes(1);
    expect(deleteRow).toHaveBeenCalledWith("gallery_images", "b");
    await waitFor(() =>
      expect(
        screen.queryByRole("group", { name: "Water over the rocks" }),
      ).not.toBeInTheDocument(),
    );
  });

  it("marks a sample photo and confirms it", async () => {
    vi.mocked(markConfirmed).mockResolvedValue({ ...c, is_sample: false });
    renderGallery({ images: [a, c] });
    expect(screen.getAllByText("Sample")).toHaveLength(1);
    await userEvent.click(
      screen.getByRole("button", { name: "Mark as confirmed" }),
    );
    expect(markConfirmed).toHaveBeenCalledWith("gallery_images", "c");
    await waitFor(() =>
      expect(screen.queryByText("Sample")).not.toBeInTheDocument(),
    );
  });

  it("shows a friendly message when something fails", async () => {
    vi.mocked(setPublished).mockRejectedValue(
      new AdminError("NETWORK", "Can't reach the server."),
    );
    renderGallery({ images: [a] });
    await userEvent.click(
      screen.getByRole("switch", { name: "Publish photo 1 on website" }),
    );
    expect(
      await screen.findByText("Can't reach the server."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("switch", { name: "Publish photo 1 on website" }),
    ).toHaveAttribute("aria-checked", "true");
  });
});

describe("Photos tab: the homepage mark", () => {
  const featured = (
    id: string,
    sort: number,
    extra: Partial<GalleryImage> = {},
  ) => image(id, { is_featured: true, sort_order: sort, ...extra });
  const rows = [
    featured("u1", 0, { is_published: false }),
    featured("f1", 1),
    featured("f2", 2),
    featured("f3", 3),
    featured("f4", 4),
    featured("f5", 5),
    featured("f6", 6),
    image("plain", { sort_order: 7 }),
  ];

  it("counts only the first 5 published photos marked for the homepage", () => {
    renderGallery({ images: rows });
    expect(screen.getAllByText("On the homepage")).toHaveLength(5);
    expect(screen.getAllByText("Featured — not shown yet")).toHaveLength(2);
    const unpublished = screen
      .getByLabelText("Caption for photo 1")
      .closest("[role=group]") as HTMLElement;
    expect(
      within(unpublished).getByText("Featured — not shown yet"),
    ).toBeInTheDocument();
    const second = screen
      .getByLabelText("Caption for photo 2")
      .closest("[role=group]") as HTMLElement;
    expect(within(second).getByText("On the homepage")).toBeInTheDocument();
  });

  it("moves the mark along when a photo is taken off the homepage", async () => {
    renderGallery({ images: rows });
    await userEvent.click(
      screen.getByRole("switch", { name: "Show photo 2 on homepage" }),
    );
    expect(updateRow).toHaveBeenCalledWith("gallery_images", "f1", {
      is_featured: false,
    });
    await waitFor(() =>
      expect(screen.getAllByText("Featured — not shown yet")).toHaveLength(1),
    );
    expect(screen.getAllByText("On the homepage")).toHaveLength(5);
  });
});

describe("Photos tab: captions", () => {
  const a = image("a", { caption: "Morning mist", sort_order: 1 });
  const b = image("b", { media_id: "falls", sort_order: 2 });

  it("saves a caption with the Save button", async () => {
    renderGallery({ images: [a, b] });
    const field = screen.getByLabelText("Caption for photo 1");
    const save = screen.getByRole("button", {
      name: "Save caption for photo 1",
    });
    expect(save).toBeDisabled();
    await userEvent.type(field, " over the lagoon");
    expect(screen.getByText("Unsaved")).toBeInTheDocument();
    await userEvent.click(save);
    expect(updateRow).toHaveBeenCalledWith("gallery_images", "a", {
      caption: "Morning mist over the lagoon",
    });
    await waitFor(() =>
      expect(screen.queryByText("Unsaved")).not.toBeInTheDocument(),
    );
    expect(sessionStorage.length).toBe(0);
  });

  it("clears a caption by saving it empty", async () => {
    renderGallery({ images: [a] });
    await userEvent.clear(screen.getByLabelText("Caption for photo 1"));
    await userEvent.click(
      screen.getByRole("button", { name: "Save caption for photo 1" }),
    );
    expect(updateRow).toHaveBeenCalledWith("gallery_images", "a", {
      caption: "",
    });
  });

  it("refuses a caption over 200 characters", async () => {
    renderGallery({ images: [a] });
    const field = screen.getByLabelText("Caption for photo 1");
    await userEvent.clear(field);
    await userEvent.click(field);
    await userEvent.paste("x".repeat(201));
    await userEvent.click(
      screen.getByRole("button", { name: "Save caption for photo 1" }),
    );
    expect(updateRow).not.toHaveBeenCalled();
    expect(field).toHaveAccessibleDescription(
      "The caption must be 200 characters or fewer.",
    );
    expect(field).toBeInvalid();
  });

  it("asks before leaving with an unsaved caption, but not for a tab or filter", async () => {
    renderGallery({ images: [a, b] });
    await userEvent.type(screen.getByLabelText("Caption for photo 2"), "Falls");

    await userEvent.click(screen.getByRole("tab", { name: "Categories" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("tab", { name: "Photos" }));
    await userEvent.selectOptions(
      screen.getByLabelText("Show photos in"),
      "No category",
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("link", { name: "Elsewhere" }));
    expect(
      screen.getByRole("dialog", { name: "Leave without saving?" }),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Stay" }));
    expect(screen.getByTestId("where")).toHaveTextContent("/admin/gallery");
  });

  it("does not ask when nothing is unsaved", async () => {
    renderGallery({ images: [a] });
    await userEvent.click(screen.getByRole("link", { name: "Elsewhere" }));
    expect(
      await screen.findByRole("heading", { name: "Elsewhere page" }),
    ).toBeInTheDocument();
  });
});

describe("Photos tab: filter by category", () => {
  const rows = [
    image("a", { caption: "Mist", sort_order: 1, category_id: WATERFALLS }),
    image("b", { caption: "Ridge", sort_order: 2, category_id: TRAILS }),
    image("c", { caption: "Loose", sort_order: 3 }),
  ];

  it("shows everything, one category, or the uncategorised photos", async () => {
    renderGallery({ images: rows });
    expect(screen.getAllByRole("group")).toHaveLength(3);
    const filter = screen.getByLabelText("Show photos in");
    await userEvent.selectOptions(filter, "Waterfalls");
    expect(screen.getByTestId("where")).toHaveTextContent(
      `/admin/gallery?category=${WATERFALLS}`,
    );
    expect(labels()).toEqual(["Mist"]);
    await userEvent.selectOptions(filter, "No category");
    expect(labels()).toEqual(["Loose"]);
    await userEvent.selectOptions(filter, "All photos");
    expect(screen.getAllByRole("group")).toHaveLength(3);
  });

  it("opens filtered for ?category= and ignores an unknown one", () => {
    const { unmount } = renderGallery({
      images: rows,
      entry: `/admin/gallery?category=${TRAILS}`,
    });
    expect(screen.getAllByRole("group")).toHaveLength(1);
    unmount();
    renderGallery({ images: rows, entry: "/admin/gallery?category=nope" });
    expect(screen.getAllByRole("group")).toHaveLength(3);
  });

  it("numbers and reorders photos within the filtered view", async () => {
    vi.mocked(swapOrder).mockResolvedValue(undefined);
    const two = [
      image("a", { caption: "Mist", sort_order: 1, category_id: WATERFALLS }),
      image("b", { caption: "Ridge", sort_order: 2 }),
      image("c", {
        caption: "Cascade",
        sort_order: 3,
        category_id: WATERFALLS,
      }),
    ];
    renderGallery({
      images: two,
      entry: `/admin/gallery?category=${WATERFALLS}`,
    });
    await userEvent.click(
      screen.getByRole("button", { name: "Move photo 1 right" }),
    );
    expect(swapOrder).toHaveBeenCalledWith("gallery_images", two[0], two[2]);
  });
});

describe("Photos tab: tile edge cases", () => {
  it("does not save a caption when the photo itself is invalid", async () => {
    renderGallery({
      images: [image("a", { caption: "Mist", category_id: "not-an-id" })],
    });
    const input = screen.getByRole("textbox", { name: /Caption for photo 1/ });
    await userEvent.type(input, "!");
    await userEvent.click(
      screen.getByRole("button", { name: "Save caption for photo 1" }),
    );
    expect(updateRow).not.toHaveBeenCalled();
    expect(await screen.findByText(/couldn.t be saved/i)).toBeInTheDocument();
  });

  const waterfall = (id: string, caption: string, sort_order: number) =>
    image(id, { caption, sort_order, category_id: WATERFALLS });

  it("moves focus to the neighbouring photo when a category change hides the focused one", async () => {
    vi.mocked(updateRow).mockImplementation(async (_t, id, values) => ({
      ...waterfall(String(id), String(id), 1),
      ...(values as object),
    }));
    renderGallery({
      images: [waterfall("a", "Mist", 1), waterfall("c", "Cascade", 2)],
      entry: `/admin/gallery?category=${WATERFALLS}`,
    });
    const select = screen.getByLabelText("Category for photo 1");
    await userEvent.selectOptions(select, "Trails");
    await waitFor(() =>
      expect(screen.queryByRole("group", { name: "Mist" })).toBeNull(),
    );
    await waitFor(() =>
      expect(screen.getByRole("group", { name: "Cascade" })).toHaveFocus(),
    );
  });

  it("moves focus to the filter when the last photo of the view is moved away", async () => {
    vi.mocked(updateRow).mockImplementation(async (_t, id, values) => ({
      ...waterfall(String(id), String(id), 1),
      ...(values as object),
    }));
    renderGallery({
      images: [waterfall("a", "Mist", 1)],
      entry: `/admin/gallery?category=${WATERFALLS}`,
    });
    await userEvent.selectOptions(
      screen.getByLabelText("Category for photo 1"),
      "Trails",
    );
    await waitFor(() =>
      expect(screen.getByLabelText("Show photos in")).toHaveFocus(),
    );
  });

  it("leaves focus alone when the changed photo stays in the view", async () => {
    vi.mocked(updateRow).mockImplementation(async (_t, id, values) => ({
      ...waterfall(String(id), String(id), 1),
      ...(values as object),
    }));
    renderGallery({ images: [waterfall("a", "Mist", 1)] });
    const select = screen.getByLabelText("Category for photo 1");
    await userEvent.selectOptions(select, "Trails");
    await waitFor(() => expect(updateRow).toHaveBeenCalled());
    expect(screen.getByLabelText("Show photos in")).not.toHaveFocus();
  });
});

describe("Categories tab", () => {
  function renderCategories(images: GalleryImage[] = []) {
    return renderGallery({ images, entry: "/admin/gallery?tab=categories" });
  }

  it("lists categories with their web address and photo count", () => {
    renderCategories([
      image("a", { category_id: WATERFALLS }),
      image("b", { category_id: WATERFALLS }),
    ]);
    const row = screen.getByText("Waterfalls").closest("th") as HTMLElement;
    expect(row).toHaveTextContent("waterfalls");
    expect(row).toHaveTextContent("2 photos");
    expect(
      screen.getByRole("switch", { name: /^Publish Waterfalls on website/ }),
    ).toHaveAttribute("aria-checked", "true");
    expect(
      screen.getByRole("switch", { name: /^Publish Trails on website/ }),
    ).toHaveAttribute("aria-checked", "false");
  });

  it("publishes and reorders", async () => {
    vi.mocked(setPublished).mockResolvedValue({
      ...categories[1],
      is_published: true,
    });
    vi.mocked(swapOrder).mockResolvedValue(undefined);
    renderCategories();
    await userEvent.click(
      screen.getByRole("switch", { name: /^Publish Trails on website/ }),
    );
    expect(setPublished).toHaveBeenCalledWith(
      "gallery_categories",
      TRAILS,
      true,
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Move Waterfalls down" }),
    );
    expect(swapOrder).toHaveBeenCalledWith(
      "gallery_categories",
      categories[0],
      { ...categories[1], is_published: true },
    );
    await waitFor(() => {
      const names = screen
        .getAllByRole("rowheader")
        .map((h) => h.textContent ?? "");
      expect(names[0]).toContain("Trails");
    });
  });

  it("asks before deleting and says the photos become uncategorised", async () => {
    vi.mocked(deleteRow).mockResolvedValue(undefined);
    renderCategories([
      image("a", { caption: "Mist", category_id: WATERFALLS }),
    ]);
    await userEvent.click(
      screen.getByRole("button", { name: "Delete Waterfalls" }),
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveTextContent("Delete “Waterfalls”?");
    expect(dialog).toHaveTextContent(
      "Photos in this category will become uncategorised.",
    );
    expect(deleteRow).not.toHaveBeenCalled();
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Delete" }),
    );
    expect(deleteRow).toHaveBeenCalledWith("gallery_categories", WATERFALLS);
    await waitFor(() =>
      expect(screen.queryByText("Waterfalls")).not.toBeInTheDocument(),
    );
    // The photo is now uncategorised, as the database does it.
    await userEvent.click(screen.getByRole("tab", { name: "Photos" }));
    expect(screen.getByLabelText("Category for photo 1")).toHaveValue("");
  });

  describe("adding a category", () => {
    async function open() {
      await userEvent.click(
        screen.getByRole("button", { name: "Add category" }),
      );
      return screen.getByRole("dialog", { name: "Add category" });
    }

    it("fills the web address from the name until it is edited", async () => {
      renderCategories();
      const dialog = await open();
      await userEvent.type(
        within(dialog).getByLabelText("Name"),
        "Sunrise Views",
      );
      const address = within(dialog).getByLabelText("Web address");
      expect(address).toHaveValue("sunrise-views");
      await userEvent.clear(address);
      await userEvent.type(address, "sunrise");
      await userEvent.type(within(dialog).getByLabelText("Name"), " Two");
      expect(address).toHaveValue("sunrise");
    });

    it("saves it unpublished, last in order", async () => {
      vi.mocked(nextSortOrder).mockResolvedValue(3);
      vi.mocked(insertRow).mockImplementation(async (_t, values) => ({
        ...category("new"),
        ...(values as object),
      }));
      renderCategories();
      const dialog = await open();
      await userEvent.type(
        within(dialog).getByLabelText("Name"),
        "Sunrise Views",
      );
      await userEvent.click(
        within(dialog).getByRole("button", { name: "Save" }),
      );
      expect(nextSortOrder).toHaveBeenCalledWith("gallery_categories");
      expect(insertRow).toHaveBeenCalledWith("gallery_categories", {
        name: "Sunrise Views",
        slug: "sunrise-views",
        is_published: false,
        sort_order: 3,
      });
      expect(await screen.findByText("Sunrise Views")).toBeInTheDocument();
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("shows field messages and does not save an invalid form", async () => {
      renderCategories();
      const dialog = await open();
      await userEvent.click(
        within(dialog).getByRole("button", { name: "Save" }),
      );
      expect(insertRow).not.toHaveBeenCalled();
      expect(within(dialog).getByLabelText("Name")).toHaveAccessibleDescription(
        "Please enter a name.",
      );
      expect(within(dialog).getByLabelText("Name")).toHaveFocus();
    });

    it("says when the web address is already used (23505)", async () => {
      vi.mocked(nextSortOrder).mockResolvedValue(0);
      vi.mocked(insertRow).mockRejectedValue(
        new AdminError("23505", "That category already exists."),
      );
      renderCategories();
      const dialog = await open();
      await userEvent.type(within(dialog).getByLabelText("Name"), "Waterfalls");
      await userEvent.click(
        within(dialog).getByRole("button", { name: "Save" }),
      );
      const field = within(dialog).getByLabelText("Web address");
      await waitFor(() => expect(field).toBeInvalid());
      expect(field).toHaveAccessibleDescription(
        /That web address is already used by another category\./,
      );
      expect(field).toHaveFocus();
    });
  });

  describe("editing a category", () => {
    it("changes the name and keeps the saved web address", async () => {
      vi.mocked(updateRow).mockImplementation(async (_t, id, values) => ({
        ...categories[0],
        id: String(id),
        ...(values as object),
      }));
      renderCategories();
      await userEvent.click(
        screen.getByRole("button", { name: "Edit Waterfalls" }),
      );
      const dialog = screen.getByRole("dialog", { name: "Edit category" });
      const name = within(dialog).getByLabelText("Name");
      expect(name).toHaveValue("Waterfalls");
      await userEvent.clear(name);
      await userEvent.type(name, "Falls and rivers");
      expect(within(dialog).getByLabelText("Web address")).toHaveValue(
        "waterfalls",
      );
      await userEvent.click(
        within(dialog).getByRole("button", { name: "Save" }),
      );
      expect(updateRow).toHaveBeenCalledWith("gallery_categories", WATERFALLS, {
        name: "Falls and rivers",
        slug: "waterfalls",
      });
      expect(await screen.findByText("Falls and rivers")).toBeInTheDocument();
    });
  });
});
