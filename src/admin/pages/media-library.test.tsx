import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { Toast, dismissAllToasts } from "~/admin/components/Toast";
import {
  MediaInUseError,
  deleteMedia,
  findMediaUsage,
  updateMedia,
} from "~/services/media";
import type { MediaRow } from "~/types/db-helpers";

import { MediaLibraryPage } from "./MediaLibraryPage";

vi.mock("~/services/media", async (importOriginal) => ({
  ...(await importOriginal<typeof import("~/services/media")>()),
  deleteMedia: vi.fn(),
  findMediaUsage: vi.fn(),
  updateMedia: vi.fn(),
  listMedia: vi.fn(),
  uploadImage: vi.fn(),
}));

function row(id: string, alt: string, extra: Partial<MediaRow> = {}): MediaRow {
  return {
    id,
    storage_base_path: `2026/${id}-abc123`,
    alt_text: alt,
    width: 3000,
    height: 2000,
    variants: { "480": `2026/${id}-abc123-480.webp` },
    focal_x: 50,
    focal_y: 50,
    original_filename: `${id}.jpg`,
    created_at: "2026-11-23T00:00:00Z",
    updated_at: "2026-11-23T00:00:00Z",
    ...extra,
  };
}

const lagoon = row("lagoon", "Blue lagoon at sunrise");
const deck = row("deck", "Viewing deck");

function renderPage(rows: MediaRow[] = [lagoon, deck]) {
  return render(
    <>
      <MediaLibraryPage initialMedia={rows} />
      <Toast />
    </>,
  );
}

async function openEditor(alt: string) {
  await userEvent.click(screen.getByRole("button", { name: alt }));
  return screen.findByRole("dialog", { name: "Edit photo" });
}

beforeEach(() => {
  vi.mocked(findMediaUsage).mockResolvedValue([]);
});

afterEach(() => {
  vi.mocked(deleteMedia).mockReset();
  vi.mocked(findMediaUsage).mockReset();
  vi.mocked(updateMedia).mockReset();
  act(() => dismissAllToasts());
});

describe("MediaLibraryPage", () => {
  it("shows every photo with its alt text", () => {
    renderPage();
    expect(
      screen.getByRole("heading", { name: "Media library" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Blue lagoon at sunrise" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Viewing deck" }),
    ).toBeInTheDocument();
  });

  it("says so when the library is empty", () => {
    renderPage([]);
    expect(screen.getByText(/There are no photos yet/)).toBeInTheDocument();
  });

  it("opens an editor with the alt text, focal point and where it is used", async () => {
    vi.mocked(findMediaUsage).mockResolvedValue([
      "Attraction: Scenic Views",
      "Gallery image",
    ]);
    renderPage();
    const dialog = await openEditor("Blue lagoon at sunrise");
    expect(within(dialog).getByLabelText("Photo description")).toHaveValue(
      "Blue lagoon at sunrise",
    );
    expect(
      within(dialog).getByRole("button", { name: /Focal point/ }),
    ).toBeInTheDocument();
    expect(
      await within(dialog).findByText("Attraction: Scenic Views"),
    ).toBeInTheDocument();
    expect(within(dialog).getByText("Gallery image")).toBeInTheDocument();
    expect(vi.mocked(findMediaUsage)).toHaveBeenCalledWith("lagoon");
  });

  it("saves a new description and focal point", async () => {
    vi.mocked(updateMedia).mockResolvedValue({
      ...lagoon,
      alt_text: "Lagoon",
      focal_x: 55,
    });
    renderPage();
    const dialog = await openEditor("Blue lagoon at sunrise");
    const save = within(dialog).getByRole("button", { name: "Save changes" });
    expect(save).toBeDisabled();

    const input = within(dialog).getByLabelText("Photo description");
    await userEvent.clear(input);
    await userEvent.type(input, "Lagoon");
    const focal = within(dialog).getByRole("button", { name: /Focal point/ });
    focal.focus();
    await userEvent.keyboard("{ArrowRight}");
    await userEvent.click(save);

    expect(updateMedia).toHaveBeenCalledWith("lagoon", {
      altText: "Lagoon",
      focalX: 55,
      focalY: 50,
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Lagoon" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Photo saved.");
  });

  it("will not save an empty description", async () => {
    renderPage();
    const dialog = await openEditor("Viewing deck");
    const input = within(dialog).getByLabelText("Photo description");
    await userEvent.clear(input);
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Save changes" }),
    );
    expect(updateMedia).not.toHaveBeenCalled();
    expect(
      within(dialog).getByText("Please describe this photo in a few words."),
    ).toBeInTheDocument();
  });

  it("shows a friendly message when saving fails", async () => {
    const { AdminError } = await import("~/services/admin/errors");
    vi.mocked(updateMedia).mockRejectedValue(
      new AdminError("NETWORK", "Can't reach the server."),
    );
    renderPage();
    const dialog = await openEditor("Viewing deck");
    const input = within(dialog).getByLabelText("Photo description");
    await userEvent.type(input, "!");
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Save changes" }),
    );
    expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      "Can't reach the server.",
    );
  });

  it("deletes a photo after confirming and removes it from the grid", async () => {
    vi.mocked(deleteMedia).mockResolvedValue({ storageCleanupFailed: false });
    renderPage();
    const dialog = await openEditor("Viewing deck");
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Delete" }),
    );
    expect(deleteMedia).not.toHaveBeenCalled();
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Delete photo" }),
    );
    expect(deleteMedia).toHaveBeenCalledWith(deck);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Viewing deck" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Photo deleted.");
  });

  it("moves focus to the page heading after a delete", async () => {
    vi.mocked(deleteMedia).mockResolvedValue({ storageCleanupFailed: false });
    renderPage();
    const dialog = await openEditor("Viewing deck");
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Delete" }),
    );
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Delete photo" }),
    );
    expect(
      screen.getByRole("heading", { name: "Media library" }),
    ).toHaveFocus();
  });

  it("does not delete when the confirmation is cancelled", async () => {
    renderPage();
    const dialog = await openEditor("Viewing deck");
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Delete" }),
    );
    const cancel = within(dialog).getByRole("button", { name: "Cancel" });
    expect(cancel).toHaveFocus();
    await userEvent.click(cancel);
    expect(deleteMedia).not.toHaveBeenCalled();
    expect(
      within(dialog).getByRole("button", { name: "Delete" }),
    ).toHaveFocus();
  });

  it("warns, without an error, when the files could not be cleaned up", async () => {
    vi.mocked(deleteMedia).mockResolvedValue({ storageCleanupFailed: true });
    renderPage();
    const dialog = await openEditor("Viewing deck");
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Delete" }),
    );
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Delete photo" }),
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      /some of its files could not be removed/,
    );
    expect(screen.getByRole("alert")).toBeEmptyDOMElement();
  });

  it("refuses to delete a photo that is in use and says where", async () => {
    vi.mocked(deleteMedia).mockRejectedValue(
      new MediaInUseError(["Attraction: Scenic Views"]),
    );
    renderPage();
    const dialog = await openEditor("Blue lagoon at sunrise");
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Delete" }),
    );
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Delete photo" }),
    );
    expect(
      await within(dialog).findByText(
        "This photo is used by: Attraction: Scenic Views",
      ),
    ).toBeInTheDocument();
    // Still there: the dialog stays open and the photo is still in the grid.
    expect(
      screen.getByRole("dialog", { name: "Edit photo" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Blue lagoon at sunrise" }),
    ).toBeInTheDocument();
  });

  it("closes the editor with Escape", async () => {
    renderPage();
    await openEditor("Viewing deck");
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens the uploader from the top button", async () => {
    renderPage();
    await userEvent.click(
      screen.getByRole("button", { name: "Upload photos" }),
    );
    expect(screen.getByLabelText("Choose photos")).toBeInTheDocument();
  });
});
