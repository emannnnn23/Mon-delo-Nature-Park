import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createElement } from "react";
import {
  RouterContextProvider,
  createRoutesStub,
  useLoaderData,
  useLocation,
  useRouteError,
} from "react-router";

import {
  getAdminStatus,
  getSessionEmail,
  isAuthConfigured,
  signIn,
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

type Next = () => Promise<unknown>;
type Middleware = (
  args: { request: Request; context: RouterContextProvider },
  next: Next,
) => Promise<unknown>;
type Loader = (args: {
  request: Request;
  context: RouterContextProvider;
}) => Promise<unknown>;

const guard = (layout.clientMiddleware as unknown as Middleware[])[0];
const layoutLoader = layout.clientLoader as unknown as Loader;
const loginLoader = login.clientLoader as unknown as (args: {
  request: Request;
}) => Promise<unknown>;

function request(path: string) {
  return new Request(`http://localhost${path}`);
}

/** Runs the guard and reports what it threw, whether `next` ran, and the context. */
async function runGuard(path: string) {
  const context = new RouterContextProvider();
  const next = vi.fn(async () => ({}));
  let thrown: unknown = null;
  try {
    await guard({ request: request(path), context }, next);
  } catch (error) {
    thrown = error;
  }
  return { thrown, next, context };
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

describe("admin layout guard (clientMiddleware)", () => {
  it("sends an anonymous visitor to login, remembering where they were going", async () => {
    const { thrown, next } = await runGuard("/admin/attractions");
    expect(thrown).toBeInstanceOf(Response);
    const response = thrown as Response;
    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe(
      "/admin/login?next=%2Fadmin%2Fattractions",
    );
    expect(next).not.toHaveBeenCalled();
    expect(signOut).not.toHaveBeenCalled();
  });

  it("signs a non-admin out and sends them to login with a reason", async () => {
    vi.mocked(getAdminStatus).mockResolvedValue("not-admin");
    const { thrown, next } = await runGuard("/admin/attractions");
    expect(signOut).toHaveBeenCalledTimes(1);
    expect((thrown as Response).headers.get("Location")).toBe(
      "/admin/login?reason=not-admin",
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("throws a 503 without signing out when the check could not be completed", async () => {
    vi.mocked(getAdminStatus).mockResolvedValue("unavailable");
    const { thrown, next } = await runGuard("/admin/attractions");
    expect(thrown).toMatchObject({ init: { status: 503 } });
    expect(next).not.toHaveBeenCalled();
    expect(signOut).not.toHaveBeenCalled();
    expect(getSessionEmail).not.toHaveBeenCalled();
  });

  it("lets an admin through and hands the email to the layout loader", async () => {
    vi.mocked(getAdminStatus).mockResolvedValue("admin");
    const { thrown, next, context } = await runGuard("/admin");
    expect(thrown).toBeNull();
    expect(next).toHaveBeenCalledTimes(1);
    expect(signOut).not.toHaveBeenCalled();
    expect(await layoutLoader({ request: request("/admin"), context })).toEqual(
      { email: "owner@mondelos.test" },
    );
  });

  it("treats a vanished session as anonymous", async () => {
    vi.mocked(getAdminStatus).mockResolvedValue("admin");
    vi.mocked(getSessionEmail).mockResolvedValue(null);
    const { thrown, next } = await runGuard("/admin");
    expect((thrown as Response).headers.get("Location")).toBe(
      "/admin/login?next=%2Fadmin",
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("uses only the path in next, never the query", async () => {
    const { thrown } = await runGuard("/admin/messages?q=//evil.com");
    expect((thrown as Response).headers.get("Location")).toBe(
      "/admin/login?next=%2Fadmin%2Fmessages",
    );
  });

  it("is client-only: no loader, a middleware, HydrateFallback and ErrorBoundary, noindex", () => {
    expect("loader" in layout).toBe(false);
    expect(Array.isArray(layout.clientMiddleware)).toBe(true);
    expect(typeof layout.clientLoader).toBe("function");
    expect(typeof layout.HydrateFallback).toBe("function");
    expect(typeof layout.ErrorBoundary).toBe("function");
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
    const result = (await loginLoader({
      request: request("/admin/login?next=%2Fadmin%2Fgallery"),
    })) as Response;
    expect(result.headers.get("Location")).toBe("/admin/gallery");
  });

  it("login ignores an unsafe next for an admin who is already in", async () => {
    vi.mocked(getAdminStatus).mockResolvedValue("admin");
    const result = (await loginLoader({
      request: request("/admin/login?next=https%3A%2F%2Fevil.com"),
    })) as Response;
    expect(result.headers.get("Location")).toBe("/admin");
  });

  it("login stays put for anonymous and reports whether admin is configured", async () => {
    expect(await loginLoader({ request: request("/admin/login") })).toEqual({
      configured: true,
    });
    vi.mocked(isAuthConfigured).mockReturnValue(false);
    expect(await loginLoader({ request: request("/admin/login") })).toEqual({
      configured: false,
    });
    // Not configured: no point calling the network.
    expect(getAdminStatus).toHaveBeenCalledTimes(1);
  });

  it("login keeps a non-admin or an unreachable server on the form", async () => {
    for (const status of ["not-admin", "unavailable"] as const) {
      vi.mocked(getAdminStatus).mockResolvedValue(status);
      expect(await loginLoader({ request: request("/admin/login") })).toEqual({
        configured: true,
      });
    }
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

function withLoaderData(component: unknown) {
  return function Wrapped() {
    const loaderData = useLoaderData();
    return createElement(component as never, { loaderData });
  };
}

function LayoutError() {
  const error = useRouteError();
  return createElement(layout.ErrorBoundary as never, { error });
}

/** The real guard, loaders and pages wired as in routes.ts. */
function renderAdmin(
  path: string,
  { realLogin = false }: { realLogin?: boolean } = {},
) {
  const childLoader = vi.fn(async () => null);
  const Stub = createRoutesStub([
    realLogin
      ? {
          path: "/admin/login",
          loader: loginLoader as never,
          Component: withLoaderData(login.default),
        }
      : { path: "/admin/login", Component: () => <Probe label="Login page" /> },
    {
      path: "/admin",
      middleware: layout.clientMiddleware as never,
      loader: layoutLoader as never,
      Component: withLoaderData(layout.default),
      ErrorBoundary: LayoutError,
      children: [
        { index: true, Component: dashboard.default as never },
        {
          path: "attractions",
          loader: childLoader,
          Component: () => <h1>Attractions</h1>,
        },
        { path: "*", Component: adminNotFound.default as never },
      ],
    },
  ]);
  return { childLoader, ...render(<Stub initialEntries={[path]} />) };
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

  it("does not run a child loader when the guard redirects", async () => {
    const { childLoader } = renderAdmin("/admin/attractions");
    await screen.findByText(/Login page at/);
    expect(childLoader).not.toHaveBeenCalled();
  });

  it("signs a non-admin out and shows login with the reason", async () => {
    vi.mocked(getAdminStatus).mockResolvedValue("not-admin");
    const { childLoader } = renderAdmin("/admin/attractions");
    expect(
      await screen.findByText("Login page at /admin/login?reason=not-admin"),
    ).toBeInTheDocument();
    expect(signOut).toHaveBeenCalled();
    expect(childLoader).not.toHaveBeenCalled();
  });

  describe("when the admin check cannot be completed", () => {
    beforeEach(() => {
      vi.mocked(getAdminStatus).mockResolvedValue("unavailable");
    });

    it("shows a retry screen, no admin content, no sign-out, and runs no child loader", async () => {
      const { childLoader } = renderAdmin("/admin/attractions");
      expect(
        await screen.findByText(
          "Can’t reach the server. Check your connection and try again.",
        ),
      ).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
      expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
      expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
      expect(screen.queryByText("Attractions")).not.toBeInTheDocument();
      expect(signOut).not.toHaveBeenCalled();
      expect(childLoader).not.toHaveBeenCalled();
    });

    it("Retry checks again and shows the page once it works", async () => {
      const user = userEvent.setup();
      vi.mocked(getAdminStatus)
        .mockResolvedValueOnce("unavailable")
        .mockResolvedValue("admin");
      const { childLoader } = renderAdmin("/admin/attractions");
      await user.click(await screen.findByRole("button", { name: "Retry" }));
      expect(
        await screen.findByRole("heading", { level: 1, name: "Attractions" }),
      ).toBeInTheDocument();
      expect(signOut).not.toHaveBeenCalled();
      expect(childLoader).toHaveBeenCalledTimes(1);
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

    it("runs a child loader once the guard has passed", async () => {
      const { childLoader } = renderAdmin("/admin/attractions");
      await screen.findByRole("heading", { level: 1, name: "Attractions" });
      expect(childLoader).toHaveBeenCalledTimes(1);
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

    it("goes to the login page, keeping the place, when the session ends elsewhere", async () => {
      renderAdmin("/admin/attractions");
      await screen.findByRole("navigation", { name: "Admin" });
      await waitFor(() => expect(signedOutListener).not.toBeNull());
      act(() => signedOutListener?.());
      expect(
        await screen.findByText(
          "Login page at /admin/login?reason=expired&next=%2Fadmin%2Fattractions",
          {},
          { timeout: 4000 },
        ),
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

describe("login with the real route and guard", () => {
  // Regression: a sign-in the guard bounces back lands on the same login route
  // (no remount); the form must be usable again, not stuck on "Signing in...".
  it("re-enables the form and shows the notice when the guard bounces a non-admin", async () => {
    const user = userEvent.setup();
    const answers = ["anonymous", "not-admin"] as const;
    let call = 0;
    vi.mocked(getAdminStatus).mockImplementation(async () => {
      const answer = answers[call] ?? "anonymous";
      call += 1;
      return answer;
    });
    vi.mocked(signIn).mockResolvedValue({ ok: true });

    renderAdmin("/admin/login", { realLogin: true });
    await user.type(await screen.findByLabelText("Email"), "a@b.co");
    await user.type(screen.getByLabelText("Password"), "secret-pw");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByText(/doesn.t have access/i)).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Sign in" })).toBeEnabled(),
    );
    expect(signOut).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText("Password")).toHaveValue("");
    expect(screen.getByLabelText("Email")).toHaveValue("a@b.co");
  });
});
