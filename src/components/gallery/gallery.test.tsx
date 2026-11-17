import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { hydrateRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { MemoryRouter, createRoutesStub, useLocation } from "react-router";

import { placeholders } from "~/content/placeholders";
import { resolveCategory } from "~/lib/gallery";
import { GalleryTestimonialsBand } from "~/components/home/GalleryTestimonialsBand";
import { AttractionPage } from "~/pages/AttractionPage";
import { GalleryPage } from "~/pages/GalleryPage";
import type { GalleryImage, MediaAsset } from "~/types/content";

import { Lightbox } from "../common/Lightbox";

const categories = placeholders.galleryCategories;
const landscapes = categories[0];
const gardens = categories[1];

const asset = (id: string): MediaAsset => ({
  id,
  alt: `Photo ${id}`,
  width: 1600,
  height: 1000,
  variants: {
    480: `${id}-480.webp`,
    1600: `${id}-1600.webp`,
    2400: `${id}-2400.webp`,
  },
  focalX: 50,
  focalY: 50,
});

const galleryImage = (
  id: string,
  categoryId: string | null,
  caption: string | null = null,
): GalleryImage => ({
  id,
  image: asset(id),
  caption,
  categoryId,
  isFeatured: false,
  isSample: false,
});

const images: GalleryImage[] = [
  galleryImage("a", landscapes.id, "The ridge at dusk"),
  galleryImage("b", gardens.id, "Orchids"),
  galleryImage("c", gardens.id),
  galleryImage("d", null),
];

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="search">{location.search}</output>;
}

function renderGallery(
  entry = "/gallery",
  galleryImages: GalleryImage[] = images,
) {
  const Stub = createRoutesStub([
    {
      path: "/gallery",
      Component: () => (
        <>
          <GalleryPage
            intro={null}
            categories={categories}
            images={galleryImages}
          />
          <LocationProbe />
        </>
      ),
    },
  ]);
  return render(<Stub initialEntries={[entry]} />);
}

describe("resolveCategory", () => {
  it("returns the id for a known slug", () => {
    expect(resolveCategory("gardens", categories)).toBe(gardens.id);
  });

  it("returns null for an unknown or missing slug", () => {
    expect(resolveCategory("nope", categories)).toBeNull();
    expect(resolveCategory(null, categories)).toBeNull();
    expect(resolveCategory("", categories)).toBeNull();
  });
});

describe("GalleryPage", () => {
  it("has one h1 and no main landmark of its own", () => {
    renderGallery();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(
      screen.getByRole("heading", { level: 1, name: "Gallery" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("main")).toBeNull();
  });

  it("treats an unknown category as All and shows every image", () => {
    renderGallery("/gallery?category=nope");
    expect(screen.getByRole("button", { name: "All" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    for (const item of images) {
      expect(
        screen.getByRole("button", { name: item.image.alt }),
      ).toBeInTheDocument();
    }
  });

  it("starts filtered when the URL names a category", () => {
    renderGallery("/gallery?category=gardens");
    expect(screen.getByRole("button", { name: "Gardens" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.queryByRole("button", { name: "Photo a" })).toBeNull();
    expect(screen.getByRole("button", { name: "Photo b" })).toBeInTheDocument();
  });

  it("filters by the Gardens chip and records it in the URL", async () => {
    const user = userEvent.setup();
    renderGallery();
    await user.click(screen.getByRole("button", { name: "Gardens" }));
    expect(screen.getByRole("button", { name: "Gardens" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "All" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(screen.getByRole("button", { name: "Photo b" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Photo c" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Photo a" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Photo d" })).toBeNull();
    expect(screen.getByTestId("search")).toHaveTextContent("?category=gardens");

    await user.click(screen.getByRole("button", { name: "All" }));
    expect(screen.getByTestId("search")).toBeEmptyDOMElement();
    expect(screen.getByRole("button", { name: "Photo a" })).toBeInTheDocument();
  });

  it("shows captions under the images", () => {
    renderGallery();
    expect(screen.getByText("The ridge at dusk")).toBeInTheDocument();
  });

  it("opens the lightbox from an image and returns focus on Escape", async () => {
    const user = userEvent.setup();
    renderGallery();
    const opener = screen.getByRole("button", { name: "Photo a" });
    await user.click(opener);

    const dialog = screen.getByRole("dialog", { name: "Image viewer" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(within(dialog).getByText("1 / 4")).toBeInTheDocument();
    expect(within(dialog).getByText("The ridge at dusk")).toBeInTheDocument();

    await user.keyboard("{ArrowRight}");
    expect(within(dialog).getByText("2 / 4")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(opener).toHaveFocus();
  });

  it("shows an empty state and no chips without photos", () => {
    renderGallery("/gallery", []);
    expect(screen.getByText("Photos coming soon")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "All" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Gardens" })).toBeNull();
  });
});

describe("Lightbox", () => {
  const items = images.map(({ image, caption }) => ({ image, caption }));

  function Harness({ start }: { start: number | null }) {
    const [index, setIndex] = useState<number | null>(start);
    return (
      <>
        <button type="button" onClick={() => setIndex(0)}>
          Open viewer
        </button>
        <Lightbox
          items={items}
          index={index}
          onClose={() => setIndex(null)}
          onIndexChange={setIndex}
        />
      </>
    );
  }

  it("renders nothing while closed", () => {
    render(<Harness start={null} />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("shows the largest variant of the current image", () => {
    render(<Harness start={1} />);
    const img = within(screen.getByRole("dialog")).getByAltText("Photo b");
    expect(img.getAttribute("src")).toContain("b-2400.webp");
    expect(screen.getByText("2 / 4")).toBeInTheDocument();
  });

  it("navigates with the buttons and wraps around", async () => {
    const user = userEvent.setup();
    render(<Harness start={0} />);
    await user.click(screen.getByRole("button", { name: "Previous image" }));
    expect(screen.getByText("4 / 4")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Next image" }));
    expect(screen.getByText("1 / 4")).toBeInTheDocument();
  });

  it("closes from the close button and returns focus to the opener", async () => {
    const user = userEvent.setup();
    render(<Harness start={null} />);
    const opener = screen.getByRole("button", { name: "Open viewer" });
    await user.click(opener);
    await user.click(
      screen.getByRole("button", { name: "Close image viewer" }),
    );
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(opener).toHaveFocus();
  });

  it("navigates with ArrowLeft and ArrowRight", async () => {
    const user = userEvent.setup();
    render(<Harness start={1} />);
    await user.keyboard("{ArrowLeft}");
    expect(screen.getByText("1 / 4")).toBeInTheDocument();
    await user.keyboard("{ArrowRight}{ArrowRight}");
    expect(screen.getByText("3 / 4")).toBeInTheDocument();
  });

  it("keeps Tab focus inside the dialog", async () => {
    const user = userEvent.setup();
    render(<Harness start={0} />);
    const dialog = screen.getByRole("dialog");
    for (let i = 0; i < 8; i++) {
      await user.tab();
      expect(dialog).toContainElement(document.activeElement as HTMLElement);
    }
    for (let i = 0; i < 8; i++) {
      await user.tab({ shift: true });
      expect(dialog).toContainElement(document.activeElement as HTMLElement);
    }
  });

  it("locks body scroll while open and releases it on close", async () => {
    const user = userEvent.setup();
    render(<Harness start={0} />);
    expect(document.body.style.overflow).toBe("hidden");
    await user.keyboard("{Escape}");
    expect(document.body.style.overflow).toBe("");
  });

  it("navigates on a horizontal swipe of at least 50px", () => {
    render(<Harness start={1} />);
    const stage = screen.getByTestId("lightbox-stage");
    const swipe = (fromX: number, toX: number, toY = 100) => {
      fireEvent.touchStart(stage, {
        touches: [{ clientX: fromX, clientY: 100 }],
      });
      fireEvent.touchEnd(stage, {
        changedTouches: [{ clientX: toX, clientY: toY }],
      });
    };
    swipe(200, 120); // left: next
    expect(screen.getByText("3 / 4")).toBeInTheDocument();
    swipe(120, 200); // right: previous
    expect(screen.getByText("2 / 4")).toBeInTheDocument();
    swipe(200, 170); // too short
    expect(screen.getByText("2 / 4")).toBeInTheDocument();
    swipe(200, 100, 400); // mostly vertical
    expect(screen.getByText("2 / 4")).toBeInTheDocument();
  });
});

describe("hydration and URL params", () => {
  const page = (
    <MemoryRouter initialEntries={["/gallery?category=gardens"]}>
      <GalleryPage intro={null} categories={categories} images={images} />
    </MemoryRouter>
  );

  it("renders All on the server and applies ?category after hydration without a mismatch", async () => {
    const html = renderToString(page);
    expect(html).toContain("Photo a");
    expect(html).toContain("Photo d");

    const container = document.createElement("div");
    container.innerHTML = html;
    document.body.append(container);
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    let root!: Root;
    await act(async () => {
      root = hydrateRoot(container, page);
    });
    expect(errors).not.toHaveBeenCalled();
    errors.mockRestore();

    expect(
      within(container).getByRole("button", { name: "Gardens" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      within(container).queryByRole("button", { name: "Photo a" }),
    ).toBeNull();
    expect(
      within(container).getByRole("button", { name: "Photo b" }),
    ).toBeTruthy();

    await act(async () => root.unmount());
    container.remove();
  });

  it("keeps other search params when a chip changes", async () => {
    const user = userEvent.setup();
    renderGallery("/gallery?utm=x&category=gardens");
    await user.click(screen.getByRole("button", { name: "All" }));
    expect(screen.getByTestId("search")).toHaveTextContent("?utm=x");
    await user.click(screen.getByRole("button", { name: "Gardens" }));
    expect(screen.getByTestId("search")).toHaveTextContent(
      "?utm=x&category=gardens",
    );
  });
});

describe("Sample tags", () => {
  const sample = { ...galleryImage("s", null), isSample: true };

  it("marks sample photos in the gallery grid only", () => {
    renderGallery("/gallery", [sample, images[0]]);
    expect(screen.getAllByText("Sample")).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Photo s" })).toBeInTheDocument();
  });

  it("marks sample photos in the homepage mosaic", () => {
    render(
      <MemoryRouter>
        <GalleryTestimonialsBand
          gallerySection={null}
          testimonialsSection={null}
          testimonials={[]}
          settings={placeholders.settings}
          galleryImages={[sample, images[0]]}
        />
      </MemoryRouter>,
    );
    expect(screen.getAllByText("Sample")).toHaveLength(1);
  });
});

describe("Lightbox wiring", () => {
  it("opens from the attraction page's More photos grid", async () => {
    const user = userEvent.setup();
    const [first] = placeholders.attractions;
    render(
      <MemoryRouter>
        <AttractionPage
          attraction={{
            ...first,
            images: [
              { id: "row-x", image: asset("x"), caption: "First" },
              { id: "row-y", image: asset("y"), caption: null },
            ],
          }}
        />
      </MemoryRouter>,
    );
    const opener = screen.getByRole("button", { name: "Photo y" });
    await user.click(opener);
    const dialog = screen.getByRole("dialog", { name: "Image viewer" });
    expect(within(dialog).getByText("2 / 2")).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(opener).toHaveFocus();
  });

  it("opens from the homepage mosaic, but not from placeholder tiles", async () => {
    const user = userEvent.setup();
    const props = {
      gallerySection: null,
      testimonialsSection: null,
      testimonials: [],
      settings: placeholders.settings,
    };
    const { unmount } = render(
      <MemoryRouter>
        <GalleryTestimonialsBand {...props} galleryImages={[]} />
      </MemoryRouter>,
    );
    expect(screen.queryByRole("button", { name: /photo/i })).toBeNull();
    unmount();

    render(
      <MemoryRouter>
        <GalleryTestimonialsBand {...props} galleryImages={images} />
      </MemoryRouter>,
    );
    await user.click(screen.getByRole("button", { name: "Photo c" }));
    expect(
      within(screen.getByRole("dialog")).getByText("3 / 4"),
    ).toBeInTheDocument();
  });
});
