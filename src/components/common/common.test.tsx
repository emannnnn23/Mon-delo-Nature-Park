import { act, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import type { MediaAsset } from "../../types/content";
import { Button } from "./Button";
import { Eyebrow } from "./Eyebrow";
import { LeafDecor } from "./LeafDecor";
import { Logo } from "./Logo";
import { MapEmbed } from "./MapEmbed";
import { PlaceholderImage } from "./PlaceholderImage";
import { Reveal } from "./Reveal";
import { ResponsiveImage } from "./ResponsiveImage";
import { SampleTag } from "./SampleTag";
import { SectionHeading } from "./SectionHeading";

const asset: MediaAsset = {
  id: "m1",
  alt: "Sunrise over the hills",
  width: 1600,
  height: 900,
  variants: { 480: "a/480.webp", 960: "a/960.webp" },
  focalX: 30,
  focalY: 70,
};

function mockMatchMedia(matches: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Button", () => {
  it("renders a router link for `to`", () => {
    render(
      <MemoryRouter>
        <Button to="/visit">Plan your visit</Button>
      </MemoryRouter>,
    );
    expect(
      screen.getByRole("link", { name: "Plan your visit" }),
    ).toHaveAttribute("href", "/visit");
  });

  it("renders a plain anchor for `href`", () => {
    render(<Button href="https://example.com">Open</Button>);
    expect(screen.getByRole("link", { name: "Open" })).toHaveAttribute(
      "href",
      "https://example.com",
    );
  });

  it("renders a button otherwise, defaulting to type=button", () => {
    render(<Button variant="outline-dark">Send</Button>);
    expect(screen.getByRole("button", { name: "Send" })).toHaveAttribute(
      "type",
      "button",
    );
  });
});

describe("Button disabled", () => {
  it("carries the disabled attribute and disabled styling", () => {
    render(<Button disabled>Send</Button>);
    const button = screen.getByRole("button", { name: "Send" });
    expect(button).toBeDisabled();
    expect(button).toHaveClass(
      "disabled:cursor-not-allowed",
      "disabled:opacity-60",
    );
  });
});

describe("SampleTag", () => {
  it("shows the word Sample", () => {
    render(<SampleTag />);
    expect(screen.getByText("Sample")).toBeInTheDocument();
  });
});

describe("headings", () => {
  it("renders eyebrow, title and subtitle", () => {
    render(
      <SectionHeading
        eyebrow="Welcome to"
        title="Mondelos Nature Park"
        subtitle="A calm place."
      />,
    );
    expect(
      screen.getByRole("heading", { level: 2, name: "Mondelos Nature Park" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Welcome to")).toBeInTheDocument();
    expect(screen.getByText("A calm place.")).toBeInTheDocument();
  });

  it("supports another heading level and omits empty parts", () => {
    render(<SectionHeading as="h1" title="Visit" />);
    expect(
      screen.getByRole("heading", { level: 1, name: "Visit" }),
    ).toBeInTheDocument();
  });

  it("renders a standalone eyebrow", () => {
    render(<Eyebrow>Discover</Eyebrow>);
    expect(screen.getByText("Discover")).toBeInTheDocument();
  });
});

describe("PlaceholderImage", () => {
  it("is labelled and visible", () => {
    render(<PlaceholderImage />);
    const img = screen.getByRole("img", { name: "Photo coming soon" });
    expect(img).toHaveTextContent("Photo coming soon");
  });
});

describe("ResponsiveImage", () => {
  it("falls back to the placeholder for a null asset", () => {
    render(<ResponsiveImage asset={null} sizes="100vw" />);
    expect(
      screen.getByRole("img", { name: "Photo coming soon" }),
    ).toBeInTheDocument();
  });

  it("falls back to the placeholder when the asset has no variants", () => {
    render(
      <ResponsiveImage asset={{ ...asset, variants: {} }} sizes="100vw" />,
    );
    expect(
      screen.getByRole("img", { name: "Photo coming soon" }),
    ).toBeInTheDocument();
    expect(document.querySelector("img")).toBeNull();
  });

  it("renders a lazy responsive image with focal point", () => {
    render(
      <ResponsiveImage asset={asset} sizes="(min-width: 768px) 50vw, 100vw" />,
    );
    const img = screen.getByRole("img", { name: "Sunrise over the hills" });
    expect(img).toHaveAttribute("alt", "Sunrise over the hills");
    expect(img.getAttribute("srcset")).toContain("480w");
    expect(img).toHaveAttribute("width", "1600");
    expect(img).toHaveAttribute("height", "900");
    expect(img).toHaveAttribute("loading", "lazy");
    expect(img).not.toHaveAttribute("fetchpriority");
    expect(img).toHaveStyle({ objectPosition: "30% 70%" });
  });

  it("loads eagerly with high priority when `priority`", () => {
    render(<ResponsiveImage asset={asset} sizes="100vw" priority />);
    const img = screen.getByRole("img", { name: "Sunrise over the hills" });
    expect(img).not.toHaveAttribute("loading", "lazy");
    expect(img).toHaveAttribute("fetchpriority", "high");
  });
});

describe("Logo", () => {
  it("has an accessible name", () => {
    render(<Logo tone="dark" />);
    expect(
      screen.getByRole("img", { name: "Mondelos Nature Park" }),
    ).toBeInTheDocument();
  });
});

describe("LeafDecor", () => {
  it("is decorative and hidden below md", () => {
    const { container } = render(<LeafDecor position="left" />);
    const el = container.firstElementChild as HTMLElement;
    expect(el).toHaveAttribute("aria-hidden", "true");
    expect(el.className).toContain("hidden");
    expect(el.className).toContain("md:block");
  });
});

function stubObserver(): { fire: () => void } {
  let callback: IntersectionObserverCallback = () => {};
  class FakeObserver {
    constructor(cb: IntersectionObserverCallback) {
      callback = cb;
    }
    observe = vi.fn();
    disconnect = vi.fn();
    unobserve = vi.fn();
  }
  vi.stubGlobal("IntersectionObserver", FakeObserver);
  return {
    fire: () =>
      act(() => {
        callback(
          [{ isIntersecting: true } as IntersectionObserverEntry],
          {} as IntersectionObserver,
        );
      }),
  };
}

function placeBelowFold() {
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue({
    top: 5000,
    bottom: 5200,
    left: 0,
    right: 300,
    width: 300,
    height: 200,
    x: 0,
    y: 5000,
    toJSON: () => ({}),
  });
}

describe("Reveal", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("has no opacity-0 class under reduced motion, even when it could be armed", () => {
    mockMatchMedia(false);
    stubObserver();
    placeBelowFold();
    // Control: with motion allowed this same setup is armed and hidden.
    const control = render(<Reveal>Control</Reveal>);
    expect(control.container.innerHTML).toContain("opacity-0");
    control.unmount();

    mockMatchMedia(true);
    const { container } = render(<Reveal>Hello</Reveal>);
    expect(container.innerHTML).not.toContain("opacity-0");
    expect(screen.getByText("Hello")).toBeInTheDocument();
  });

  it("has no opacity-0 class without IntersectionObserver", () => {
    mockMatchMedia(false);
    vi.stubGlobal("IntersectionObserver", undefined);
    const { container } = render(<Reveal>Hello</Reveal>);
    expect(container.innerHTML).not.toContain("opacity-0");
  });

  it("starts hidden when it can observe, then reveals when in view", () => {
    mockMatchMedia(false);
    const observer = stubObserver();
    placeBelowFold();
    const { container } = render(<Reveal>Hello</Reveal>);
    expect(container.innerHTML).toContain("opacity-0");
    observer.fire();
    expect(container.innerHTML).not.toContain("opacity-0");
  });
});

describe("MapEmbed", () => {
  it("renders nothing without a source", () => {
    const { container } = render(<MapEmbed src={null} title="Map" />);
    expect(container).toBeEmptyDOMElement();
  });

  it.each([
    "https://evil.example/maps/embed",
    "http://www.google.com/maps/embed?pb=1",
    "https://www.google.com.evil.example/maps/embed",
    "javascript:alert(1)",
    "https://www.google.com/maps/place/x",
  ])(
    "renders nothing for a source that is not a Google Maps embed: %s",
    (src) => {
      const { container } = render(<MapEmbed src={src} title="Map" />);
      expect(container).toBeEmptyDOMElement();
    },
  );

  it("renders a lazy iframe", () => {
    render(
      <MapEmbed
        src="https://www.google.com/maps/embed?pb=1"
        title="Park map"
      />,
    );
    const frame = screen.getByTitle("Park map");
    expect(frame).toHaveAttribute("loading", "lazy");
    expect(frame).toHaveAttribute(
      "referrerpolicy",
      "no-referrer-when-downgrade",
    );
  });
});
