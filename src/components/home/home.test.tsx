import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { placeholders } from "../../content/placeholders";
import { selectHomeContent } from "../../lib/homeContent";
import { HomePage, type HomePageProps } from "../../pages/HomePage";
import type { Testimonial } from "../../types/content";

const base: HomePageProps = selectHomeContent({
  settings: placeholders.settings,
  sections: placeholders.sections.home,
  attractions: placeholders.attractions,
  galleryImages: placeholders.galleryImages,
  testimonials: placeholders.testimonials,
});

const twoTestimonials: Testimonial[] = [
  {
    id: "t1",
    authorName: "First Guest",
    quote: "First quote text.",
    rating: 5,
    source: "google",
    sourceUrl: null,
    reviewDate: null,
  },
  {
    id: "t2",
    authorName: "Second Guest",
    quote: "Second quote text.",
    rating: 4,
    source: "google",
    sourceUrl: null,
    reviewDate: null,
  },
];

function renderHome(overrides: Partial<HomePageProps> = {}) {
  return render(
    <MemoryRouter>
      <HomePage {...base} {...overrides} />
    </MemoryRouter>,
  );
}

function mockReducedMotion(matches: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockImplementation((query: string) => ({
      matches: query.includes("reduce") ? matches : false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
}

/** Answers `(min-width: Npx|Nrem)` queries as a window `width` px wide. */
function mockMatchMediaWidth(width: number) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockImplementation((query: string) => {
      const min = /min-width:\s*([\d.]+)(px|rem)/.exec(query);
      const px = min ? Number(min[1]) * (min[2] === "rem" ? 16 : 1) : null;
      return {
        matches: px !== null && width >= px,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      };
    }),
  );
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("Hero", () => {
  it("renders the heading with 'in Nature.' in the gold span", () => {
    renderHome();
    const h1 = screen.getByRole("heading", { level: 1 });
    expect(h1).toHaveTextContent("Find Your Peace in Nature.");
    const gold = within(h1).getByText("in Nature.");
    expect(gold.tagName).toBe("SPAN");
    expect(gold).toHaveClass("text-gold-500");
  });

  it("renders the whole heading ivory when it has no ' in '", () => {
    renderHome({
      sections: base.sections.map((s) =>
        s.key === "hero" ? { ...s, heading: "Welcome Home." } : s,
      ),
    });
    const h1 = screen.getByRole("heading", { level: 1 });
    expect(h1).toHaveTextContent("Welcome Home.");
    expect(h1.querySelector("span.text-gold-500")).toBeNull();
  });

  it("links Explore the Park to /discover and Plan Your Visit to /visit", () => {
    renderHome();
    const hero = screen.getByRole("heading", { level: 1 }).closest("section");
    if (!hero) throw new Error("hero section missing");
    expect(
      within(hero).getByRole("link", { name: /explore the park/i }),
    ).toHaveAttribute("href", "/discover");
    expect(
      within(hero).getByRole("link", { name: /plan your visit/i }),
    ).toHaveAttribute("href", "/visit");
    expect(screen.queryByText(/watch tour/i)).not.toBeInTheDocument();
  });

  it("is a dark surface, has a scroll link to #welcome, and hides a null body", () => {
    renderHome();
    const hero = screen.getByRole("heading", { level: 1 }).closest("section");
    if (!hero) throw new Error("hero section missing");
    expect(hero).toHaveAttribute("data-surface", "dark");
    expect(
      within(hero).getByRole("link", { name: /scroll down/i }),
    ).toHaveAttribute("href", "#welcome");
    expect(
      within(hero).getByText("Kawayan, Biliran, Philippines"),
    ).toBeVisible();
    // No image yet: an illustration, never a "Photo coming soon" chip.
    expect(within(hero).queryByText(/photo coming soon/i)).toBeNull();
    // A null hero body renders no subline paragraph.
    expect(hero.querySelectorAll("p")).toHaveLength(0);
  });

  it("shows the hero body when present", () => {
    renderHome({
      sections: base.sections.map((s) =>
        s.key === "hero" ? { ...s, body: "A quiet line under the title." } : s,
      ),
    });
    expect(
      screen.getByText("A quiet line under the title."),
    ).toBeInTheDocument();
  });
});

describe("Intro and experiences", () => {
  it("renders the welcome section with Learn More to /about", () => {
    renderHome();
    const intro = document.getElementById("welcome");
    if (!intro) throw new Error("welcome section missing");
    expect(
      within(intro).getByRole("heading", {
        level: 2,
        name: "Mondelos Nature Park",
      }),
    ).toBeInTheDocument();
    expect(within(intro).getByText("WELCOME TO")).toBeInTheDocument();
    expect(
      within(intro).getByRole("link", { name: /learn more/i }),
    ).toHaveAttribute("href", "/about");
  });

  it("renders four experience cards, each tagged Sample", () => {
    renderHome();
    const list = screen.getByRole("list", { name: "Experiences" });
    const cards = within(list).getAllByRole("listitem");
    expect(cards).toHaveLength(4);
    for (const card of cards) {
      expect(within(card).getByText("Sample")).toBeVisible();
    }
    expect(within(list).getByText("Beautiful Gardens")).toBeInTheDocument();
  });

  it("makes the experience row a tab stop only where it scrolls (below md)", () => {
    mockMatchMediaWidth(375);
    const { unmount } = renderHome();
    expect(screen.getByRole("list", { name: "Experiences" })).toHaveAttribute(
      "tabindex",
      "0",
    );
    unmount();

    mockMatchMediaWidth(1024);
    renderHome();
    expect(
      screen.getByRole("list", { name: "Experiences" }),
    ).not.toHaveAttribute("tabindex");
  });

  it("hides the experiences section when there are none", () => {
    renderHome({ experiences: [] });
    expect(
      screen.queryByRole("heading", { name: "Experiences" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("list", { name: "Experiences" }),
    ).not.toBeInTheDocument();
  });
});

describe("Discover preview", () => {
  it("shows the featured attractions linking to their detail pages", () => {
    renderHome();
    expect(
      screen.getByRole("heading", { level: 2, name: "Discover the Park" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /hilltop viewpoint/i }),
    ).toHaveAttribute("href", "/discover/hilltop-viewpoint");
    expect(
      screen.getByRole("link", { name: /see all attractions/i }),
    ).toHaveAttribute("href", "/discover");
  });

  it("is hidden when there are no featured attractions", () => {
    renderHome({ featuredAttractions: [] });
    expect(
      screen.queryByRole("heading", { name: "Discover the Park" }),
    ).not.toBeInTheDocument();
  });

  it("lays two featured attractions out in two columns, with no empty third", () => {
    renderHome({ featuredAttractions: base.featuredAttractions.slice(0, 2) });
    const list = screen
      .getByRole("link", { name: /hilltop viewpoint/i })
      .closest("ul");
    // md:grid-cols-2 carries on through lg: no three-column override.
    expect(list).toHaveClass("md:grid-cols-2");
    expect(list?.className).not.toMatch(/lg:grid-cols|grid-rows/);
  });

  it("shows a single featured attraction as one wide card", () => {
    renderHome({ featuredAttractions: base.featuredAttractions.slice(0, 1) });
    const link = screen.getByRole("link", { name: /hilltop viewpoint/i });
    const list = link.closest("ul");
    expect(list?.className).not.toMatch(/grid-cols-[23]|overflow-x-auto/);
    expect(link.closest("li")?.className).not.toContain("w-[85%]");
    // The compact card lays its image beside the text from lg.
    expect(link.closest("article")).toHaveClass("lg:flex-row");
  });

  it("lets a very long attraction name wrap", () => {
    const name = "A".repeat(40) + " " + "B".repeat(39);
    expect(name).toHaveLength(80);
    renderHome({
      featuredAttractions: [{ ...base.featuredAttractions[0], name }],
    });
    expect(screen.getByRole("heading", { level: 3, name })).toHaveClass(
      "break-words",
    );
  });
});

describe("Gallery and testimonials band", () => {
  it("is a dark surface with the gallery heading and CTA", () => {
    renderHome();
    const heading = screen.getByRole("heading", {
      level: 2,
      name: "Our Gallery",
    });
    expect(heading.closest("[data-surface='dark']")).not.toBeNull();
    expect(
      screen.getByText("Capture the beauty of Mondelos Nature Park."),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /view gallery/i })).toHaveAttribute(
      "href",
      "/gallery",
    );
  });

  it("shows the rating without a quote when there are no testimonials", () => {
    renderHome({ testimonials: [] });
    expect(
      screen.getByRole("heading", { level: 2, name: "What Our Guests Say" }),
    ).toBeInTheDocument();
    expect(screen.getByText("4.6 / 5")).toBeInTheDocument();
    expect(screen.getByText("(70 reviews)")).toBeInTheDocument();
    expect(document.querySelector("blockquote")).toBeNull();
    expect(
      screen.queryByRole("link", { name: /read reviews on google/i }),
    ).not.toBeInTheDocument();
  });

  it("shows a whole-number rating with one decimal", () => {
    renderHome({
      testimonials: [],
      settings: { ...base.settings, googleRating: 4 },
    });
    expect(screen.getByText("4.0 / 5")).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: "4.0 out of 5 stars" }),
    ).toBeInTheDocument();
  });

  it("links to Google reviews when a listing URL is set", () => {
    renderHome({
      testimonials: [],
      settings: {
        ...base.settings,
        mapsListingUrl: "https://maps.google.com/?cid=1",
      },
    });
    expect(
      screen.getByRole("link", { name: /read reviews on google/i }),
    ).toHaveAttribute("href", "https://maps.google.com/?cid=1");
  });

  it("steps through testimonials with the Next button", () => {
    renderHome({ testimonials: twoTestimonials });
    expect(screen.getByText(/First quote text\./)).toBeInTheDocument();
    expect(screen.getByText("— First Guest")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Next review" }));
    expect(screen.getByText(/Second quote text\./)).toBeInTheDocument();
    expect(screen.queryByText(/First quote text\./)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Previous review" }));
    expect(screen.getByText(/First quote text\./)).toBeInTheDocument();
  });

  it("auto-advances every 7s when motion is allowed", () => {
    mockReducedMotion(false);
    vi.useFakeTimers();
    renderHome({ testimonials: twoTestimonials });
    act(() => {
      vi.advanceTimersByTime(8000);
    });
    expect(screen.getByText(/Second quote text\./)).toBeInTheDocument();
  });

  it("is not a live region while it auto-advances", () => {
    mockReducedMotion(false);
    renderHome({ testimonials: twoTestimonials });
    const quote = screen.getByText(/First quote text\./);
    expect(quote.closest("figure")).toHaveAttribute("aria-live", "off");
  });

  it("pauses auto-advance while hovered, and resumes on leave", () => {
    mockReducedMotion(false);
    vi.useFakeTimers();
    renderHome({ testimonials: twoTestimonials });
    const figure = screen.getByText(/First quote text\./).closest("figure");
    const slider = figure?.parentElement?.parentElement;
    if (!figure || !slider) throw new Error("slider not found");

    fireEvent.mouseEnter(slider);
    act(() => {
      vi.advanceTimersByTime(15000);
    });
    expect(screen.getByText(/First quote text\./)).toBeInTheDocument();
    expect(figure).toHaveAttribute("aria-live", "polite");

    fireEvent.mouseLeave(slider);
    act(() => {
      vi.advanceTimersByTime(8000);
    });
    expect(screen.getByText(/Second quote text\./)).toBeInTheDocument();
  });

  it("pauses auto-advance while focus is inside, and resumes on blur", () => {
    mockReducedMotion(false);
    vi.useFakeTimers();
    renderHome({ testimonials: twoTestimonials });
    const next = screen.getByRole("button", { name: "Next review" });

    act(() => {
      next.focus();
    });
    act(() => {
      vi.advanceTimersByTime(15000);
    });
    const quote = screen.getByText(/First quote text\./);
    expect(quote.closest("[aria-live='polite']")).not.toBeNull();

    act(() => {
      next.blur();
    });
    act(() => {
      vi.advanceTimersByTime(8000);
    });
    expect(screen.getByText(/Second quote text\./)).toBeInTheDocument();
  });

  it("does not auto-advance under reduced motion and is then a polite live region", () => {
    mockReducedMotion(true);
    vi.useFakeTimers();
    renderHome({ testimonials: twoTestimonials });
    act(() => {
      vi.advanceTimersByTime(8000);
    });
    const quote = screen.getByText(/First quote text\./);
    expect(quote).toBeInTheDocument();
    expect(quote.closest("[aria-live='polite']")).not.toBeNull();
  });
});

describe("Visit section", () => {
  it("links Get Directions to Google Maps by plus code, in a new tab", () => {
    renderHome();
    expect(
      screen.getByRole("heading", { level: 2, name: "Visit Us" }),
    ).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /get directions/i });
    expect(link.getAttribute("href")).toContain(
      "destination=M8GV%2B8GP%20Kawayan%2C%20Biliran",
    );
    expect(link).toHaveAttribute("target", "_blank");
    expect(link.getAttribute("rel")).toContain("noopener");
  });

  it("shows a Google Maps card instead of a map when there is no embed URL", () => {
    renderHome();
    expect(screen.getByText("Find us on Google Maps")).toBeInTheDocument();
    expect(document.querySelector("iframe")).toBeNull();
  });

  it("shows the plus code and street address once in the section", () => {
    const count = (text: string | null, needle: string) =>
      (text ?? "").split(needle).length - 1;
    const section = () =>
      screen
        .getByRole("heading", { level: 2, name: "Visit Us" })
        .closest("section");

    const { unmount } = renderHome();
    expect(count(section()?.textContent ?? "", "M8GV+8GP")).toBe(1);
    expect(count(section()?.textContent ?? "", "Balaring Road")).toBe(1);
    unmount();

    renderHome({
      settings: {
        ...base.settings,
        mapsEmbedUrl: "https://www.google.com/maps/embed?pb=1",
      },
    });
    expect(count(section()?.textContent ?? "", "M8GV+8GP")).toBe(1);
    expect(count(section()?.textContent ?? "", "Balaring Road")).toBe(1);
  });

  it("embeds the map and shows contact details when set", () => {
    renderHome({
      settings: {
        ...base.settings,
        mapsEmbedUrl: "https://www.google.com/maps/embed?pb=1",
        phone: "+63 900 000 0000",
        email: "hello@example.com",
      },
    });
    expect(document.querySelector("iframe")).not.toBeNull();
    expect(
      screen.queryByText("Find us on Google Maps"),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /\+63 900 000 0000/ }),
    ).toHaveAttribute("href", "tel:+639000000000");
    expect(
      screen.getByRole("link", { name: /hello@example\.com/ }),
    ).toHaveAttribute("href", "mailto:hello@example.com");
  });

  it("renders exactly one h1", () => {
    renderHome();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  });
});
