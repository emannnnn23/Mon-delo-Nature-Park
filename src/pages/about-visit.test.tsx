import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";

import { placeholders } from "~/content/placeholders";
import * as aboutRoute from "~/routes/about";
import * as visitRoute from "~/routes/visit";
import type { Faq, PageSection } from "~/types/content";

import { AboutPage } from "./AboutPage";
import { VisitPage, type VisitPageProps } from "./VisitPage";

function renderAbout(sections: PageSection[] = placeholders.sections.about) {
  return render(
    <MemoryRouter>
      <AboutPage sections={sections} />
    </MemoryRouter>,
  );
}

const visitProps: VisitPageProps = {
  sections: placeholders.sections.visit,
  faqs: placeholders.faqs,
  settings: placeholders.settings,
};

function renderVisit(overrides: Partial<VisitPageProps> = {}) {
  return render(
    <MemoryRouter>
      <VisitPage {...visitProps} {...overrides} />
    </MemoryRouter>,
  );
}

const faq = (n: number): Faq => ({
  id: `f${n}`,
  question: `Question ${n}?`,
  answer: `Answer ${n}.`,
});

describe("routes", () => {
  it("load their content at build time", () => {
    expect(aboutRoute.loader()).toEqual({
      sections: placeholders.sections.about,
    });
    expect(visitRoute.loader()).toEqual({
      sections: placeholders.sections.visit,
      faqs: placeholders.faqs,
      settings: placeholders.settings,
    });
  });
});

describe("AboutPage", () => {
  it("has one h1 and no main landmark of its own", () => {
    const { container } = renderAbout();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(
      screen.getByRole("heading", { level: 1, name: "About the Park" }),
    ).toBeInTheDocument();
    expect(container.querySelector("main")).toBeNull();
  });

  it("marks story, mission and vision as Sample", () => {
    renderAbout();
    for (const name of ["Our Story", "Our Mission", "Our Vision"]) {
      const heading = screen.getByRole("heading", { level: 2, name });
      const section = heading.closest("section") as HTMLElement;
      expect(within(section).getByText("Sample")).toBeInTheDocument();
    }
  });

  it("renders sections in order and only those present", () => {
    const keep = placeholders.sections.about.filter(
      (s) => s.key === "vision" || s.key === "story",
    );
    renderAbout([keep[1], keep[0]]);
    const headings = screen
      .getAllByRole("heading", { level: 2 })
      .map((h) => h.textContent);
    expect(headings.slice(0, 2)).toEqual(["Our Story", "Our Vision"]);
    expect(
      screen.queryByRole("heading", { name: "Our Mission" }),
    ).not.toBeInTheDocument();
  });

  it("uses a neutral label when a section has no heading and hides Sample when confirmed", () => {
    renderAbout([
      {
        key: "story",
        eyebrow: null,
        heading: null,
        body: "First paragraph.\n\nSecond paragraph.",
        ctaLabel: null,
        ctaHref: null,
        image: null,
        isSample: false,
      },
    ]);
    expect(
      screen.getByRole("heading", { level: 2, name: "Our Story" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Sample")).not.toBeInTheDocument();
    expect(screen.getByText("First paragraph.")).toBeInTheDocument();
    expect(screen.getByText("Second paragraph.")).toBeInTheDocument();
  });

  it("ends with a link to Discover", () => {
    renderAbout();
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Facilities and highlights",
      }),
    ).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /discover/i });
    expect(link).toHaveAttribute("href", "/discover");
  });
});

describe("VisitPage", () => {
  it("has one h1, the address and plus code, and no main landmark", () => {
    const { container } = renderVisit();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(
      screen.getByRole("heading", { level: 1, name: "Visit Us" }),
    ).toBeInTheDocument();
    expect(container.querySelector("main")).toBeNull();
    expect(
      screen.getAllByText(placeholders.settings.addressLine).length,
    ).toBeGreaterThan(0);
    expect(screen.getAllByText("M8GV+8GP").length).toBeGreaterThan(0);
  });

  it("links Get Directions by plus code", () => {
    renderVisit();
    const link = screen.getByRole("link", { name: /get directions/i });
    expect(link.getAttribute("href")).toContain(
      "destination=M8GV%2B8GP%20Kawayan%2C%20Biliran",
    );
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("shows the Google Maps card without an embed URL, and an iframe with one", () => {
    const { unmount } = renderVisit();
    expect(screen.getByText("Find us on Google Maps")).toBeInTheDocument();
    expect(document.querySelector("iframe")).toBeNull();
    unmount();
    renderVisit({
      settings: {
        ...placeholders.settings,
        mapsEmbedUrl: "https://www.google.com/maps/embed?pb=1",
      },
    });
    expect(document.querySelector("iframe")).not.toBeNull();
    expect(
      screen.queryByText("Find us on Google Maps"),
    ).not.toBeInTheDocument();
  });

  it("hides opening hours, phone and email when unknown", () => {
    renderVisit();
    expect(
      screen.queryByRole("heading", { name: "Opening hours" }),
    ).not.toBeInTheDocument();
    expect(document.querySelector("a[href^='tel:']")).toBeNull();
    expect(document.querySelector("a[href^='mailto:']")).toBeNull();
  });

  it("shows opening hours, phone and email when set", () => {
    renderVisit({
      settings: {
        ...placeholders.settings,
        openingHours: "Daily, 8am to 5pm",
        phone: "+63 900 000 0000",
        email: "hello@example.com",
      },
    });
    expect(
      screen.getByRole("heading", { name: "Opening hours" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Daily, 8am to 5pm")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /\+63 900 000 0000/ }),
    ).toHaveAttribute("href", "tel:+639000000000");
    expect(
      screen.getByRole("link", { name: /hello@example\.com/ }),
    ).toHaveAttribute("href", "mailto:hello@example.com");
  });

  it("hides the FAQ section when there are no FAQs and shows native details when there are", () => {
    const { unmount } = renderVisit({ faqs: [] });
    expect(
      screen.queryByRole("heading", { name: "Frequently Asked Questions" }),
    ).not.toBeInTheDocument();
    unmount();
    const { container } = renderVisit({ faqs: [faq(1), faq(2)] });
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Frequently Asked Questions",
      }),
    ).toBeInTheDocument();
    expect(container.querySelectorAll("details > summary")).toHaveLength(2);
    expect(screen.getByText("Question 1?")).toBeInTheDocument();
  });

  it("shows the intro and getting-here sections with Sample tags", () => {
    renderVisit();
    for (const name of ["Plan Your Visit", "Getting Here"]) {
      const heading = screen.getByRole("heading", { level: 2, name });
      const section = heading.closest("section") as HTMLElement;
      expect(within(section).getByText("Sample")).toBeInTheDocument();
    }
  });

  it("has the contact form under Send Us a Message", () => {
    renderVisit();
    expect(
      screen.getByRole("heading", { level: 2, name: "Send Us a Message" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /send message/i }),
    ).toBeInTheDocument();
  });
});
