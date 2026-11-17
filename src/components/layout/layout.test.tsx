import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router";
import { placeholders } from "../../content/placeholders";
import type { Announcement, SiteSettings } from "../../types/content";
import { AnnouncementStrip } from "./AnnouncementStrip";
import { PublicLayout } from "./PublicLayout";
import { SiteFooter } from "./SiteFooter";
import { NAV_LINKS, SiteHeader } from "./SiteHeader";

const settings: SiteSettings = placeholders.settings;

function inRouter(ui: ReactNode, path = "/") {
  return render(<MemoryRouter initialEntries={[path]}>{ui}</MemoryRouter>);
}

describe("SiteHeader", () => {
  it("renders the five nav links and a Plan Your Visit CTA to /visit", () => {
    inRouter(<SiteHeader overHero={false} />);
    const nav = screen.getByRole("navigation", { name: "Main" });
    for (const { label, to } of NAV_LINKS) {
      expect(within(nav).getByRole("link", { name: label })).toHaveAttribute(
        "href",
        to,
      );
    }
    expect(
      screen.getByRole("link", { name: /plan your visit/i }),
    ).toHaveAttribute("href", "/visit");
  });

  it("marks only the current page link with aria-current", () => {
    inRouter(<SiteHeader overHero={false} />, "/gallery");
    const nav = screen.getByRole("navigation", { name: "Main" });
    expect(within(nav).getByRole("link", { name: "Gallery" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(within(nav).getByRole("link", { name: "Home" })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("is a dark surface", () => {
    inRouter(<SiteHeader overHero />);
    expect(screen.getByRole("banner")).toHaveAttribute("data-surface", "dark");
  });
});

describe("MobileMenu", () => {
  it("opens as a dialog with focus inside, and Escape restores focus", async () => {
    const user = userEvent.setup();
    inRouter(<SiteHeader overHero={false} />);
    const button = screen.getByRole("button", { name: /open menu/i });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await user.click(button);
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toContainElement(document.activeElement as HTMLElement);
    expect(
      within(dialog).getByRole("link", { name: /plan your visit/i }),
    ).toHaveAttribute("href", "/visit");

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(button).toHaveFocus();
  });

  it("keeps Tab focus inside the dialog", async () => {
    const user = userEvent.setup();
    inRouter(<SiteHeader overHero={false} />);
    await user.click(screen.getByRole("button", { name: /open menu/i }));
    const dialog = screen.getByRole("dialog");
    for (let i = 0; i < 12; i++) {
      await user.tab();
      expect(dialog).toContainElement(document.activeElement as HTMLElement);
    }
    for (let i = 0; i < 12; i++) {
      await user.tab({ shift: true });
      expect(dialog).toContainElement(document.activeElement as HTMLElement);
    }
  });

  it("closes from the close button and from a link click", async () => {
    const user = userEvent.setup();
    inRouter(<SiteHeader overHero={false} />);
    const button = screen.getByRole("button", { name: /open menu/i });

    await user.click(button);
    await user.click(screen.getByRole("button", { name: /close menu/i }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(button).toHaveFocus();

    await user.click(button);
    await user.click(
      within(screen.getByRole("dialog")).getByRole("link", { name: "About" }),
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("locks body scroll while open and releases it on close", async () => {
    const user = userEvent.setup();
    inRouter(<SiteHeader overHero={false} />);
    await user.click(screen.getByRole("button", { name: /open menu/i }));
    expect(document.body.style.overflow).toBe("hidden");
    await user.keyboard("{Escape}");
    expect(document.body.style.overflow).toBe("");
  });
});

describe("SiteFooter", () => {
  it("has no tel: link when phone is null", () => {
    inRouter(<SiteFooter settings={{ ...settings, phone: null }} />);
    expect(document.querySelector('a[href^="tel:"]')).toBeNull();
  });

  it("shows contact details only when present", () => {
    inRouter(
      <SiteFooter
        settings={{ ...settings, phone: "+63 900 000 0000", email: "a@b.ph" }}
      />,
    );
    expect(document.querySelector('a[href^="tel:"]')).not.toBeNull();
    expect(document.querySelector('a[href="mailto:a@b.ph"]')).not.toBeNull();
    expect(screen.getByText(settings.addressLine)).toBeInTheDocument();
  });

  it("shows only the social links that are set, with accessible names", () => {
    inRouter(
      <SiteFooter
        settings={{
          ...settings,
          socials: {
            facebook: "https://facebook.com/x",
            instagram: null,
            tiktok: "https://tiktok.com/@x",
            youtube: null,
          },
        }}
      />,
    );
    const fb = screen.getByRole("link", { name: "Facebook" });
    expect(fb).toHaveAttribute("rel", "noopener noreferrer");
    expect(fb).toHaveAttribute("target", "_blank");
    expect(screen.getByRole("link", { name: "TikTok" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Instagram" })).toBeNull();
    expect(screen.queryByRole("link", { name: "YouTube" })).toBeNull();
  });

  it("uses the fallback tagline, the configured one when set, and the year", () => {
    const { unmount } = inRouter(<SiteFooter settings={settings} />);
    expect(
      screen.getByText("Nature. Relaxation. Unforgettable Moments."),
    ).toBeInTheDocument();
    expect(
      screen.getByText(new RegExp(`© ${new Date().getFullYear()} Mondelos`)),
    ).toBeInTheDocument();
    unmount();
    inRouter(<SiteFooter settings={{ ...settings, tagline: "Rest easy." }} />);
    expect(screen.getByText("Rest easy.")).toBeInTheDocument();
  });

  it("links the five nav items", () => {
    inRouter(<SiteFooter settings={settings} />);
    const nav = screen.getByRole("navigation", { name: "Footer" });
    expect(within(nav).getAllByRole("link")).toHaveLength(NAV_LINKS.length);
  });
});

describe("AnnouncementStrip", () => {
  it("renders nothing for null", () => {
    const { container } = inRouter(<AnnouncementStrip announcement={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the title and a link when linkHref is set", () => {
    const a: Announcement = {
      id: "1",
      title: "Trail closed Monday",
      body: null,
      linkLabel: "See details",
      linkHref: "/visit",
    };
    inRouter(<AnnouncementStrip announcement={a} />);
    expect(screen.getByText("Trail closed Monday")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "See details" })).toHaveAttribute(
      "href",
      "/visit",
    );
  });

  function withHref(linkHref: string): Announcement {
    return {
      id: "1",
      title: "Notice",
      body: null,
      linkLabel: "More",
      linkHref,
    };
  }

  it("opens an https link as an external anchor in a new tab", () => {
    inRouter(
      <AnnouncementStrip announcement={withHref("https://example.org/a")} />,
    );
    const link = screen.getByRole("link", { name: "More" });
    expect(link).toHaveAttribute("href", "https://example.org/a");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link.getAttribute("rel")).toContain("noopener");
  });

  it.each(["/", "/visit", "/discover/garden-walk"])(
    "treats %s as an internal link",
    (href) => {
      inRouter(<AnnouncementStrip announcement={withHref(href)} />);
      const link = screen.getByRole("link", { name: "More" });
      expect(link).toHaveAttribute("href", href);
      expect(link).not.toHaveAttribute("target");
    },
  );

  it.each([
    "//evil.example/x",
    "/\\evil.example",
    "http://example.org",
    "javascript:alert(1)",
    "mailto:a@b.c",
    "visit",
  ])("renders no link for %s", (href) => {
    inRouter(<AnnouncementStrip announcement={withHref(href)} />);
    expect(screen.getByText("Notice")).toBeInTheDocument();
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("renders no link without linkHref", () => {
    inRouter(
      <AnnouncementStrip
        announcement={{
          id: "1",
          title: "Hello",
          body: null,
          linkLabel: null,
          linkHref: null,
        }}
      />,
    );
    expect(screen.queryByRole("link")).toBeNull();
  });
});

describe("PublicLayout", () => {
  it("has a skip link to #main and a main landmark with that id", () => {
    inRouter(
      <PublicLayout settings={settings} announcement={null} overHero={false}>
        <p>page</p>
      </PublicLayout>,
    );
    const skip = screen.getByRole("link", { name: "Skip to content" });
    expect(skip).toHaveAttribute("href", "#main");
    expect(screen.getByRole("main")).toHaveAttribute("id", "main");
    expect(screen.getByText("page")).toBeInTheDocument();
    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
  });
});
