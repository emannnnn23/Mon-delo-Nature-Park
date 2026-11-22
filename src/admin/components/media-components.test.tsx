import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";

import { AdminError } from "~/services/admin/errors";
import { listMedia, uploadImage } from "~/services/media";
import type { MediaRow } from "~/types/db-helpers";

import { FocalPointPicker } from "./FocalPointPicker";
import { ImagePicker } from "./ImagePicker";
import { MediaUploader } from "./MediaUploader";

vi.mock("~/services/media", () => ({
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

// jsdom's File input honours `accept`; these tests also choose HEIC files.
const user = () => userEvent.setup({ applyAccept: false });
const jpeg = (name: string) => new File(["x"], name, { type: "image/jpeg" });

afterEach(() => {
  vi.mocked(listMedia).mockReset();
  vi.mocked(uploadImage).mockReset();
  vi.unstubAllGlobals();
});

describe("FocalPointPicker", () => {
  const media = row("a", "A photo", { focal_x: 50, focal_y: 50 });

  it("is a labelled, focusable control that announces the point", () => {
    render(<FocalPointPicker media={media} onChange={() => {}} />);
    const control = screen.getByRole("button", { name: /Focal point/ });
    expect(control).toBeInTheDocument();
    expect(
      screen.getByText("Focal point: 50% from the left, 50% from the top."),
    ).toBeInTheDocument();
  });

  it("moves 5% per arrow key", async () => {
    const onChange = vi.fn();
    render(<FocalPointPicker media={media} onChange={onChange} />);
    screen.getByRole("button", { name: /Focal point/ }).focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(onChange).toHaveBeenLastCalledWith({ focalX: 55, focalY: 50 });
    await userEvent.keyboard("{ArrowLeft}");
    expect(onChange).toHaveBeenLastCalledWith({ focalX: 45, focalY: 50 });
    await userEvent.keyboard("{ArrowDown}");
    expect(onChange).toHaveBeenLastCalledWith({ focalX: 50, focalY: 55 });
    await userEvent.keyboard("{ArrowUp}");
    expect(onChange).toHaveBeenLastCalledWith({ focalX: 50, focalY: 45 });
  });

  it("stays between 0 and 100", async () => {
    const onChange = vi.fn();
    render(
      <FocalPointPicker
        media={{ ...media, focal_x: 2, focal_y: 98 }}
        onChange={onChange}
      />,
    );
    screen.getByRole("button", { name: /Focal point/ }).focus();
    await userEvent.keyboard("{ArrowLeft}{ArrowDown}");
    expect(onChange).toHaveBeenNthCalledWith(1, { focalX: 0, focalY: 98 });
    expect(onChange).toHaveBeenNthCalledWith(2, { focalX: 2, focalY: 100 });
  });

  it("sets the point from a click position", () => {
    const onChange = vi.fn();
    render(<FocalPointPicker media={media} onChange={onChange} />);
    const control = screen.getByRole("button", { name: /Focal point/ });
    control.getBoundingClientRect = () =>
      ({ left: 100, top: 50, width: 200, height: 100 }) as DOMRect;
    fireEvent.click(control, { clientX: 250, clientY: 75, detail: 1 });
    expect(onChange).toHaveBeenCalledWith({ focalX: 75, focalY: 25 });
  });

  it("ignores a keyboard-activated click (it has no position)", () => {
    const onChange = vi.fn();
    render(<FocalPointPicker media={media} onChange={onChange} />);
    const control = screen.getByRole("button", { name: /Focal point/ });
    control.getBoundingClientRect = () =>
      ({ left: 0, top: 0, width: 200, height: 100 }) as DOMRect;
    fireEvent.click(control, { clientX: 0, clientY: 0, detail: 0 });
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe("MediaUploader", () => {
  it("pre-fills the description from the file name and uploads", async () => {
    const saved = row("new", "blue lagoon view");
    vi.mocked(uploadImage).mockResolvedValue(saved);
    const onUploaded = vi.fn();
    render(<MediaUploader purpose="gallery" onUploaded={onUploaded} />);

    await user().upload(
      screen.getByLabelText("Choose a photo"),
      jpeg("blue_lagoon-view.jpg"),
    );
    const alt = await screen.findByLabelText("Describe blue_lagoon-view.jpg");
    expect(alt).toHaveValue("blue lagoon view");

    await userEvent.click(screen.getByRole("button", { name: "Upload photo" }));
    expect(uploadImage).toHaveBeenCalledWith(
      expect.objectContaining({ name: "blue_lagoon-view.jpg" }),
      "blue lagoon view",
      "gallery",
      expect.any(Function),
    );
    expect(onUploaded).toHaveBeenCalledWith([saved]);
    expect(await screen.findByText("1 photo uploaded.")).toBeInTheDocument();
    expect(
      screen.queryByLabelText("Describe blue_lagoon-view.jpg"),
    ).not.toBeInTheDocument();
  });

  it("will not upload a photo with no description", async () => {
    render(<MediaUploader purpose="gallery" onUploaded={() => {}} />);
    await user().upload(screen.getByLabelText("Choose a photo"), jpeg("a.jpg"));
    const alt = await screen.findByLabelText("Describe a.jpg");
    await userEvent.clear(alt);
    await userEvent.click(screen.getByRole("button", { name: "Upload photo" }));
    expect(uploadImage).not.toHaveBeenCalled();
    expect(
      screen.getByText("Please describe this photo in a few words."),
    ).toBeInTheDocument();
    expect(alt).toHaveAttribute("aria-invalid", "true");
    expect(alt).toHaveFocus();
  });

  it("rejects a HEIC file with a plain message and offers no upload", async () => {
    render(<MediaUploader purpose="gallery" onUploaded={() => {}} />);
    await user().upload(
      screen.getByLabelText("Choose a photo"),
      new File(["x"], "IMG_1.heic", { type: "image/heic" }),
    );
    expect(
      await screen.findByText("Please choose a JPG, PNG or WebP photo."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Upload photo" })).toBeDisabled();
  });

  it("warns about a small gallery photo but still allows it", async () => {
    vi.stubGlobal(
      "createImageBitmap",
      vi.fn(async () => ({ width: 300, height: 200, close: vi.fn() })),
    );
    render(<MediaUploader purpose="gallery" onUploaded={() => {}} />);
    await user().upload(screen.getByLabelText("Choose a photo"), jpeg("s.jpg"));
    expect(
      await screen.findByText("Small photo — it may look blurry"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Upload photo" })).toBeEnabled();
  });

  it("rejects a small cover photo up front", async () => {
    vi.stubGlobal(
      "createImageBitmap",
      vi.fn(async () => ({ width: 300, height: 200, close: vi.fn() })),
    );
    render(<MediaUploader purpose="cover" onUploaded={() => {}} />);
    await user().upload(screen.getByLabelText("Choose a photo"), jpeg("s.jpg"));
    expect(await screen.findByText(/at least 800 px wide/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Upload photo" })).toBeDisabled();
  });

  it("shows a failure on the photo and lets the owner retry", async () => {
    vi.mocked(uploadImage)
      .mockRejectedValueOnce(
        new AdminError("NETWORK", "Can't reach the server."),
      )
      .mockResolvedValueOnce(row("new", "a"));
    const onUploaded = vi.fn();
    render(<MediaUploader purpose="gallery" onUploaded={onUploaded} />);
    await user().upload(screen.getByLabelText("Choose a photo"), jpeg("a.jpg"));
    await screen.findByLabelText("Describe a.jpg");
    await userEvent.click(screen.getByRole("button", { name: "Upload photo" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Can't reach the server.",
    );
    expect(onUploaded).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "Upload photo" }));
    expect(onUploaded).toHaveBeenCalledTimes(1);
  });

  it("takes several photos when multiple, one description each", async () => {
    vi.mocked(uploadImage).mockImplementation(async (file) =>
      row(file.name, file.name),
    );
    const onUploaded = vi.fn();
    render(
      <MediaUploader purpose="gallery" multiple onUploaded={onUploaded} />,
    );
    await user().upload(screen.getByLabelText("Choose photos"), [
      jpeg("one.jpg"),
      jpeg("two.jpg"),
    ]);
    expect(
      await screen.findByLabelText("Describe one.jpg"),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Describe two.jpg")).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { name: "Upload photos" }),
    );
    expect(uploadImage).toHaveBeenCalledTimes(2);
    expect(onUploaded).toHaveBeenCalledWith([
      expect.objectContaining({ id: "one.jpg" }),
      expect.objectContaining({ id: "two.jpg" }),
    ]);
  });

  it("accepts a dropped file", async () => {
    render(<MediaUploader purpose="gallery" onUploaded={() => {}} />);
    const zone = screen.getByText("Drag a photo here, or")
      .parentElement as HTMLElement;
    fireEvent.drop(zone, { dataTransfer: { files: [jpeg("dropped.jpg")] } });
    expect(
      await screen.findByLabelText("Describe dropped.jpg"),
    ).toBeInTheDocument();
  });
});

describe("ImagePicker", () => {
  const lagoon = row("lagoon", "Blue lagoon");
  const tiny = row("tiny", "Tiny photo", { width: 400, height: 300 });

  function Harness({
    initial = null,
    purpose = "gallery" as const,
  }: {
    initial?: MediaRow | null;
    purpose?: "cover" | "gallery";
  }) {
    const [value, setValue] = useState<MediaRow | null>(initial);
    return (
      <ImagePicker
        value={value}
        onChange={setValue}
        purpose={purpose}
        clearable
      />
    );
  }

  it("shows the current photo, or says none is chosen", () => {
    const { unmount } = render(<Harness />);
    expect(screen.getByText("No photo chosen")).toBeInTheDocument();
    unmount();
    render(<Harness initial={lagoon} />);
    expect(
      screen.getByRole("img", { name: "Blue lagoon" }),
    ).toBeInTheDocument();
  });

  it("chooses a photo from the library", async () => {
    vi.mocked(listMedia).mockResolvedValue([lagoon, tiny]);
    render(<Harness />);
    await userEvent.click(
      screen.getByRole("button", { name: "Choose from library" }),
    );
    const dialog = await screen.findByRole("dialog", {
      name: "Choose a photo",
    });
    await userEvent.click(
      await within(dialog).findByRole("button", { name: "Blue lagoon" }),
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: "Blue lagoon" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Choose from library" }),
    ).toHaveFocus();
  });

  it("will not offer a photo that is too small for a cover", async () => {
    vi.mocked(listMedia).mockResolvedValue([lagoon, tiny]);
    render(<Harness purpose="cover" />);
    await userEvent.click(
      screen.getByRole("button", { name: "Choose from library" }),
    );
    const dialog = await screen.findByRole("dialog");
    const small = await within(dialog).findByRole("button", {
      name: /Tiny photo/,
    });
    expect(small).toBeDisabled();
    expect(
      within(dialog).getByText("Too small for a large image"),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByRole("button", { name: "Blue lagoon" }),
    ).toBeEnabled();
  });

  it("says when the library cannot be loaded", async () => {
    vi.mocked(listMedia).mockRejectedValue(
      new AdminError("NETWORK", "Can't reach the server."),
    );
    render(<Harness />);
    await userEvent.click(
      screen.getByRole("button", { name: "Choose from library" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Can't reach the server.",
    );
  });

  it("uploads a new photo and uses it", async () => {
    vi.mocked(uploadImage).mockResolvedValue(row("fresh", "Fresh view"));
    render(<Harness />);
    await userEvent.click(screen.getByRole("button", { name: "Upload new" }));
    const dialog = await screen.findByRole("dialog", {
      name: "Upload a photo",
    });
    await user().upload(
      within(dialog).getByLabelText("Choose a photo"),
      jpeg("fresh.jpg"),
    );
    await within(dialog).findByLabelText("Describe fresh.jpg");
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Upload photo" }),
    );
    expect(
      await screen.findByRole("img", { name: "Fresh view" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("removes the photo when clearable", async () => {
    render(<Harness initial={lagoon} />);
    await userEvent.click(screen.getByRole("button", { name: "Remove photo" }));
    expect(screen.getByText("No photo chosen")).toBeInTheDocument();
  });
});
