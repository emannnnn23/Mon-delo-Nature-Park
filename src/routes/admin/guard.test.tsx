import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createElement } from "react";
import { createRoutesStub, useLoaderData, useLocation } from "react-router";

import {
  getAdminStatus,
  getSessionEmail,
  isAuthConfigured,
  signOut,
  subscribeToSignOut,
} from "~/services/auth";

import * as dashboard from "./dashboard";
import * as layout from "./_layout";
import * as login from "./login";
import * as adminNotFound from "./not-found";

vi.mock("~/services/auth", () => ({
  getAdminStatus: vi.fn(),
  getSessionEmail: vi.fn(),
  isAuthConfigured: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn(),
  subscribeToSignOut: vi.fn(),
}));

type LoaderArgs = { request: Request };
type Loader = (args: LoaderArgs) => Promise<unknown>;

const layoutLoader = layout.clientLoader as unknown as Loader;
const loginLoader = login.clientLoader as unknown as Loader;

function args(path: string): LoaderArgs {
  return { request: new Request(`http://localhost${path}`) };
}

let signedOutListener: (() => void) | null = null;

beforeEach(() => {
  signedOutListener = null;
  vi.mocked(getAdminStatus).mockResolvedValue("anonymous");
  vi.mocked(getSessionEmail).mockResolvedValue("owner@mondelos.test");
  vi.mocked(isAuthConfigured).mockReturnValue(true);
  vi.mocked(signOut).mockResolvedValue(undefined);
  vi.mocked(subscribeToSignOut).mockImplementation((cb) => {
    signedOutListener = cb;
    return () => {
      signedOutListener = null;
    };
  });
});

afterEach(() => {
  vi.resetAllMocks();
});

describe("admin layout clientLoader (the guard)", () => {
  it("sends an anonymous visitor to login, remembering where they were going", async () => {
    const result = (await layoutLoader(args("/admin/attractions"))) as Response;
    expect(result).toBeInstanceOf(Response);
    expect(result.status).toBe(302);
    expect(result.headers.get("Location")).toBe(
      "/admin/login?next=%2Fadmin%2Fattractions",
    );
    expect(signOut).not.toHaveBeenCalled();
  });

  it("signs a non-admin out and sends them to login with a reason", async () => {
    vi.mocked(getAdminStatus).mockResolvedValue("not-admin");
    const result = (await layoutLoader(args("/admin/attractions"))) as Response;
    expect(signOut).toHaveBeenCalledTimes(1);
    expect(result.headers.get("Location")).toBe(
      "/admin/login?reason=not-admin",
    );
  });

  it("returns an unavailable marker, without signing out, when the check failed", async () => {
    vi.mocked(getAdminStatus).mockResolvedValue("unavailable");
    expect(await layoutLoader(args("/admin/attractions"))).toEqual({
      unavailable: true,
    });
    expect(signOut).not.toHaveBeenCalled();
    expect(getSessionEmail).not.toHaveBeenCalled();
  });

  it("lets an admin through with their email", async () => {
    vi.mocked(getAdminStatus).mockResolvedValue("admin");
    expect(await layoutLoader(args("/admin"))).toEqual({
      email: "owner@mondelos.test",
    });
    expect(signOut).not.toHaveBeenCalled();
  });

  it("treats a vanished session as anonymous", async () => {
    vi.mocked(getAdminStatus).mockResolvedValue("admin");
    vi.mocked(getSessionEmail).mockResolvedValue(null);
    const result = (await layoutLoader(args("/admin"))) as Response;
    expect(result.headers.get("Location")).toBe("/admin/login?next=%2Fadmin");
  });

  it("redirects to login when Supabase is not configured", async () => {
    vi.mocked(isAuthConfigured).mockReturnValue(false);
    vi.mocked(getAdminStatus).mockResolvedValue("anonymous");
    const result = (await layoutLoader(args("/admin"))) as Response;
    expect(result.status).toBe(302);
  });

  it("uses only the path in next, never the query", async () => {
    const result = (await layoutLoader(
      args("/admin/messages?q=//evil.com"),
    )) as Response;
    expect(result.headers.get("Location")).toBe(
      "/admin/login?next=%2Fadmin%2Fmessages",
    );
  });

  it("is client-only: no loader, a HydrateFallback, noindex", () => {
    expect("loader" in layout).toBe(false);
    expect(typeof layout.HydrateFallback).toBe("function");
    expect(layout.clientLoader).toBeTypeOf("function");
    const meta = layout.meta() as { name?: string; content?: string }[];
    expect(meta).toContainEqual({ name: "robots", content: "noindex" });
  });
});

describe("other admin modules", () => {
  it("never export a server loader", () => {
    for (const mod of [login, dashboard, adminNotFound]) {
      expect("loader" in mod).toBe(false);
    }
  });

  it("login redirects an already-signed-in admin onward", async () => {
    vi.mocked(getAdminStatus).mockResolvedValue("admin");
    const result = (await loginLoader(
      args("/admin/login?next=%2Fadmin%2Fgallery"),
    )) as Response;
    expect(result.headers.get("Location")).toBe("/admin/gallery");
  });

  it("login ignores an unsafe next for an admin who is already in", async () => {
    vi.mocked(getAdminStatus).mockResolvedValue("admin");
    const result = (await loginLoader(
      args("/admin/login?next=https%3A%2F%2Fevil.com"),
    )) as Response;
    expect(result.headers.get("Location")).toBe("/admin");
  });

  it("login stays put for anonymous and reports whether admin is configured", async () => {
    expect(await loginLoader(args("/admin/login"))).toEqual({
      configured: true,
    });
    vi.mocked(isAuthConfigured).mockReturnValue(false);
    expect(await loginLoader(args("/admin/login"))).toEqual({
      configured: false,
    });
    // Not configured: no point calling the network.
    expect(getAdminStatus).toHaveBeenCalledTimes(1);
  });

  it("login keeps a non-admin on the form (the layout already signed them out)", async () => {
    vi.mocked(getAdminStatus).mockResolvedValue("not-admin");
    expect(await loginLoader(args("/admin/login"))).toEqual({
      configured: true,
    });
  });

  it("login has a HydrateFallback and noindex", () => {
    expect(typeof login.HydrateFallback).toBe("function");
    const meta = login.meta() as { name?: string }[];
    expect(meta.some((m) => m.name === "robots")).toBe(true);
  });

  it("HydrateFallback is a labelled status spinner", () => {
    render(createElement(layout.HydrateFallback));
    expect(
      screen.getByRole("status", { name: /loading/i }),
    ).toBeInTheDocument();
  });
});

function Probe({ label }: { label: string }) {
  const { pathname, search } = useLocation();
  return (
    <p>
      {label} at {pathname}
      {search}
    </p>
  );
}

function renderAdmin(path: string) {
  const Stub = createRoutesStub([
    {
      path: "/admin/login",
      Component: () => <Probe label="Login page" />,
    },
    {
      path: "/admin",
      loader: layoutLoader as never,
      Component() {
        const loaderData = useLoaderData();
        return createElement(layout.default as never, { loaderData });
      },
      children: [
        {
          index: true,
          Component: dashboard.default as never,
        },
        { path: "attractions", Component: () => <h1>Attractions</h1> },
        { path: "*", Component: adminNotFound.default as never },
      ],
    },
  ]);
  return render(<Stub initialEntries={[path]} />);
}

describe("guarded admin shell", () => {
  it("shows the login page to an anonymous visitor, with next", async () => {
    renderAdmin("/admin/attractions");
    expect(
      await screen.findByText(
        "Login page at /admin/login?next=%2Fadmin%2Fattractions",
      ),
    ).toBeInTheDocument();
  });

  it("signs a non-admin out and shows login with the reason", async () => {
    vi.mocked(getAdminStatus).mockResolvedValue("not-admin");
    renderAdmin("/admin");
    expect(
      await screen.findByText("Login page at /admin/login?reason=not-admin"),
    ).toBeInTheDocument();
    expect(signOut).toHaveBeenCalled();
  });

  describe("when the admin check cannot be completed", () => {
    it("shows a retry screen, no admin content, and no sign-out", async () => {
      vi.mocked(getAdminStatus).mockResolvedValue("unavailable");
      renderAdmin("/admin");
      expect(
        await screen.findByText(
          "Can’t reach the server. Check your connection and try again.",
        ),
      ).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
      expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
      expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
      expect(screen.queryByText("Dashboard")).not.toBeInTheDocument();
      expect(signOut).not.toHaveBeenCalled();
    });

    it("Retry checks again and shows the dashboard once it works", async () => {
      const user = userEvent.setup();
      vi.mocked(getAdminStatus)
        .mockResolvedValueOnce("unavailable")
        .mockResolvedValue("admin");
      renderAdmin("/admin");
      await user.click(await screen.findByRole("button", { name: "Retry" }));
      expect(
        await screen.findByRole("heading", { level: 1, name: "Dashboard" }),
      ).toBeInTheDocument();
      expect(signOut).not.toHaveBeenCalled();
    });

    it("Retry goes on to the login page if the session turns out to be gone", async () => {
      const user = userEvent.setup();
      vi.mocked(getAdminStatus)
        .mockResolvedValueOnce("unavailable")
        .mockResolvedValue("anonymous");
      renderAdmin("/admin");
      await user.click(await screen.findByRole("button", { name: "Retry" }));
      expect(
        await screen.findByText("Login page at /admin/login?next=%2Fadmin"),
      ).toBeInTheDocument();
    });
  });

  describe("as an admin", () => {
    beforeEach(() => {
      vi.mocked(getAdminStatus).mockResolvedValue("admin");
    });

    it("renders the dashboard in its own main, with a skip link and one h1", async () => {
      renderAdmin("/admin");
      const h1 = await screen.findByRole("heading", { level: 1 });
      expect(h1).toHaveTextContent("Dashboard");
      expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
      const main = screen.getByRole("main");
      expect(main).toHaveAttribute("id", "main");
      expect(main).toContainElement(h1);
      expect(
        screen.getByRole("link", { name: /skip to content/i }),
      ).toHaveAttribute("href", "#main");
      // No public header or footer.
      expect(screen.queryByRole("contentinfo")).not.toBeInTheDocument();
    });

    it("lists every section, the website link and sign out", async () => {
      renderAdmin("/admin");
      const nav = await screen.findByRole("navigation", { name: "Admin" });
      const expected: [string, string][] = [
        ["Dashboard", "/admin"],
        ["Homepage", "/admin/homepage"],
        ["About", "/admin/about"],
        ["Visit page", "/admin/visit"],
        ["Attractions", "/admin/attractions"],
        ["Gallery", "/admin/gallery"],
        ["Testimonials", "/admin/testimonials"],
        ["Announcements", "/admin/announcements"],
        ["FAQs", "/admin/faqs"],
        ["Messages", "/admin/messages"],
        ["Media", "/admin/media"],
        ["Contact & settings", "/admin/settings"],
      ];
      for (const [name, href] of expected) {
        expect(within(nav).getByRole("link", { name })).toHaveAttribute(
          "href",
          href,
        );
      }
      const site = screen.getByRole("link", { name: /view website/i });
      expect(site).toHaveAttribute("href", "/");
      expect(site).toHaveAttribute("target", "_blank");
      expect(site).toHaveAttribute("rel", expect.stringContaining("noopener"));
      expect(
        screen.getByRole("button", { name: "Sign out" }),
      ).toBeInTheDocument();
      expect(screen.getByText("owner@mondelos.test")).toBeInTheDocument();
    });

    it("marks the current section", async () => {
      renderAdmin("/admin/attractions");
      const nav = await screen.findByRole("navigation", { name: "Admin" });
      expect(
        within(nav).getByRole("link", { name: "Attractions" }),
      ).toHaveAttribute("aria-current", "page");
      expect(
        within(nav).getByRole("link", { name: "Dashboard" }),
      ).not.toHaveAttribute("aria-current");
    });

    it("shows an admin-styled Not found inside the layout for unknown paths", async () => {
      renderAdmin("/admin/nowhere");
      const h1 = await screen.findByRole("heading", { level: 1 });
      expect(h1).toHaveTextContent("Not found");
      expect(screen.getByRole("main")).toContainElement(h1);
      expect(
        screen.getByRole("navigation", { name: "Admin" }),
      ).toBeInTheDocument();
    });

    it("signs out and goes to the login page", async () => {
      const user = userEvent.setup();
      renderAdmin("/admin");
      await user.click(await screen.findByRole("button", { name: "Sign out" }));
      expect(signOut).toHaveBeenCalledTimes(1);
      expect(
        await screen.findByText("Login page at /admin/login"),
      ).toBeInTheDocument();
    });

    it("goes to the login page when the session ends elsewhere", async () => {
      renderAdmin("/admin");
      await screen.findByRole("heading", { level: 1 });
      expect(signedOutListener).not.toBeNull();
      signedOutListener?.();
      expect(
        await screen.findByText("Login page at /admin/login?reason=expired"),
      ).toBeInTheDocument();
    });

    it("stops listening once the admin is left", async () => {
      const { unmount } = renderAdmin("/admin");
      await screen.findByRole("heading", { level: 1 });
      unmount();
      expect(signedOutListener).toBeNull();
    });

    it("opens the menu as a dialog and closes it with Escape", async () => {
      const user = userEvent.setup();
      renderAdmin("/admin");
      const open = await screen.findByRole("button", { name: "Open menu" });
      expect(open).toHaveAttribute("aria-expanded", "false");
      await user.click(open);
      const dialog = screen.getByRole("dialog", { name: "Admin menu" });
      expect(
        within(dialog).getByRole("link", { name: "Attractions" }),
      ).toBeInTheDocument();
      await user.keyboard("{Escape}");
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("closes the menu after choosing a section", async () => {
      const user = userEvent.setup();
      renderAdmin("/admin");
      await user.click(
        await screen.findByRole("button", { name: "Open menu" }),
      );
      const dialog = screen.getByRole("dialog", { name: "Admin menu" });
      await user.click(
        within(dialog).getByRole("link", { name: "Attractions" }),
      );
      expect(
        await screen.findByRole("heading", { level: 1, name: "Attractions" }),
      ).toBeInTheDocument();
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });
});
