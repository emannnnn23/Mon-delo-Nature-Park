import { render, screen, within } from "@testing-library/react";
import { createElement } from "react";
import {
  MemoryRouter,
  Outlet,
  createRoutesStub,
  useRouteError,
} from "react-router";

import { PublicLayout } from "~/components/layout/PublicLayout";
import { ErrorContent } from "./ErrorPage";

import { placeholders } from "~/content/placeholders";
import { findSection } from "~/lib/homeContent";
import * as detail from "~/routes/discover.$slug";
import type { Attraction, MediaAsset } from "~/types/content";
import { splitParagraphs } from "~/utils/text";

import { AttractionPage } from "./AttractionPage";
import { DiscoverPage, type DiscoverPageProps } from "./DiscoverPage";

const attractions = placeholders.attractions.filter(
  (a) => a.kind === "attraction",
);
const experiences = placeholders.attractions.filter(
  (a) => a.kind === "experience",
);

const discoverProps: DiscoverPageProps = {
  intro: findSection(placeholders.sections.home, "discover"),
  attractions,
  experiences,
};

function renderDiscover(overrides: Partial<DiscoverPageProps> = {}) {
  return render(
    <MemoryRouter>
      <DiscoverPage {...discoverProps} {...overrides} />
    </MemoryRouter>,
  );
}

function renderDetail(attraction: Attraction) {
  return render(
    <MemoryRouter>
      <AttractionPage attraction={attraction} />
    </MemoryRouter>,
  );
}

const image = (id: string): MediaAsset => ({
  id,
  alt: `Photo ${id}`,
  width: 1600,
  height: 1000,
  variants: { 480: `${id}-480.webp`, 1600: `${id}-1600.webp` },
  focalX: 50,
  focalY: 50,
});

describe("DiscoverPage", () => {
  it("has one h1 and lists every attraction linking to its detail page", () => {
    renderDiscover();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(
      screen.getByRole("heading", { level: 1, name: "Discover the Park" }),
    ).toBeInTheDocument();
    for (const a of attractions) {
      const link = screen.getByRole("link", { name: a.name });
      expect(link).toHaveAttribute("href", `/discover/${a.slug}`);
    }
  });

  it("lists experiences without linking them", () => {
    renderDiscover();
    const section = screen
      .getByRole("heading", { level: 2, name: "Experiences" })
      .closest("section") as HTMLElement;
    for (const e of experiences) {
      expect(within(section).getByText(e.name)).toBeInTheDocument();
    }
    expect(within(section).queryAllByRole("link")).toHaveLength(0);
  });

  it("hides empty sections", () => {
    const { unmount } = renderDiscover({ attractions: [] });
    expect(
      screen.queryByRole("list", { name: "Attractions" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "Experiences" }),
    ).toBeInTheDocument();
    unmount();
    renderDiscover({ experiences: [] });
    expect(
      screen.queryByRole("heading", { name: "Experiences" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("list", { name: "Attractions" }),
    ).toBeInTheDocument();
  });

  it("shows the intro line only when there is one", () => {
    const base = discoverProps.intro;
    if (!base) throw new Error("no discover section");
    renderDiscover({ intro: { ...base, body: "A short welcome line." } });
    expect(screen.getByText("A short welcome line.")).toBeInTheDocument();
  });
});

describe("AttractionPage", () => {
  const first = attractions[0];

  it("shows the name in the h1 and the Sample tag", () => {
    renderDetail(first);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(
      screen.getByRole("heading", { level: 1, name: first.name }),
    ).toBeInTheDocument();
    expect(screen.getByText("Sample")).toBeInTheDocument();
  });

  it("links back to Discover", () => {
    renderDetail(first);
    expect(
      screen.getByRole("link", { name: /Back to Discover/ }),
    ).toHaveAttribute("href", "/discover");
  });

  it("renders a description containing markup as literal text", () => {
    const { container } = renderDetail({
      ...first,
      description: "<script>alert(1)</script>\n\nSecond paragraph.",
    });
    expect(container.querySelector("script")).toBeNull();
    expect(screen.getByText("<script>alert(1)</script>")).toBeInTheDocument();
    expect(screen.getByText("Second paragraph.")).toBeInTheDocument();
  });

  it("renders one paragraph per blank-line-separated block", () => {
    renderDetail({ ...first, description: "One.\n\nTwo.\n\n\nThree." });
    for (const text of ["One.", "Two.", "Three."]) {
      expect(screen.getByText(text).tagName).toBe("P");
    }
  });

  it("allows a long name to wrap", () => {
    renderDetail({ ...first, name: "W".repeat(80) });
    expect(screen.getByRole("heading", { level: 1 })).toHaveClass(
      "break-words",
    );
  });

  it("renders no photo grid without additional images", () => {
    renderDetail(first);
    expect(screen.queryByRole("list", { name: "More photos" })).toBeNull();
  });

  it("renders additional images with captions", () => {
    renderDetail({
      ...first,
      images: [
        { id: "row-a", image: image("a"), caption: "The ridge at dusk" },
      ],
    });
    const list = screen.getByRole("list", { name: "More photos" });
    expect(within(list).getByAltText("Photo a")).toBeInTheDocument();
    expect(within(list).getByText("The ridge at dusk")).toBeInTheDocument();
  });

  it("renders the same media twice, keyed on the row id, without key warnings", () => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    renderDetail({
      ...first,
      images: [
        { id: "row-1", image: image("same"), caption: "Morning" },
        { id: "row-2", image: image("same"), caption: "Evening" },
      ],
    });
    const list = screen.getByRole("list", { name: "More photos" });
    expect(within(list).getAllByAltText("Photo same")).toHaveLength(2);
    expect(
      errors.mock.calls.filter((call) => String(call[0]).includes("key")),
    ).toEqual([]);
    errors.mockRestore();
  });

  it("does not put a placeholder chip behind the heading when there is no cover", () => {
    renderDetail(first);
    expect(screen.queryByText(/photo coming soon/i)).toBeNull();
  });

  it("uses the cover as the hero image when there is one", () => {
    const { container } = renderDetail({ ...first, cover: image("cover") });
    expect(container.querySelector("img")?.getAttribute("alt")).toBe(
      "Photo cover",
    );
  });
});

describe("detail route", () => {
  it("renders the not-found content for an unknown slug", async () => {
    function Boundary() {
      return createElement(detail.ErrorBoundary as never, {
        error: useRouteError(),
      });
    }
    const Stub = createRoutesStub([
      {
        path: "/discover/:slug",
        loader: ({ params }) => detail.loader({ params } as never),
        Component: () => null,
        ErrorBoundary: Boundary,
      },
    ]);
    render(<Stub initialEntries={["/discover/nope"]} />);
    expect(
      await screen.findByRole("heading", { level: 1, name: "Page not found" }),
    ).toBeInTheDocument();
  });

  it("renders exactly one main landmark when a 404 renders inside the layout", async () => {
    function Boundary() {
      return createElement(detail.ErrorBoundary as never, {
        error: useRouteError(),
      });
    }
    const Stub = createRoutesStub([
      {
        Component: () => (
          <PublicLayout
            settings={placeholders.settings}
            announcement={null}
            overHero={false}
          >
            <Outlet />
          </PublicLayout>
        ),
        children: [
          {
            path: "/discover/:slug",
            loader: ({ params }) => detail.loader({ params } as never),
            Component: () => null,
            ErrorBoundary: Boundary,
          },
        ],
      },
    ]);
    render(<Stub initialEntries={["/discover/nope"]} />);
    await screen.findByRole("heading", { level: 1, name: "Page not found" });
    expect(screen.getAllByRole("main")).toHaveLength(1);
  });

  it("generic error content has no main landmark", () => {
    render(
      <MemoryRouter>
        <ErrorContent />
      </MemoryRouter>,
    );
    expect(screen.queryByRole("main")).toBeNull();
    expect(
      screen.getByRole("heading", { level: 1, name: "Something went wrong" }),
    ).toBeInTheDocument();
  });

  it("does not resolve an experience slug", () => {
    let thrown: unknown;
    try {
      detail.loader({ params: { slug: experiences[0].slug } } as never);
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toMatchObject({ init: { status: 404 } });
  });

  it("uses the summary and cover for meta", () => {
    const a = attractions[0];
    const tags = detail.meta({
      params: { slug: a.slug },
      loaderData: { attraction: { ...a, cover: image("c") } },
    } as never);
    expect(tags).toContainEqual({ title: `${a.name} · Mondelos Nature Park` });
    expect(tags).toContainEqual({ name: "description", content: a.summary });
    expect(
      tags.some(
        (t) =>
          "property" in t &&
          t.property === "og:image" &&
          String(t.content).endsWith("c-1600.webp"),
      ),
    ).toBe(true);
  });
});

describe("splitParagraphs", () => {
  it("splits on blank lines, trims and drops empties", () => {
    expect(splitParagraphs(" a \n\n\n b\nstill b \n \n")).toEqual([
      "a",
      "b\nstill b",
    ]);
    expect(splitParagraphs(null)).toEqual([]);
  });
});
