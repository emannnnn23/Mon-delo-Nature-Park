import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentType } from "react";
import {
  Link,
  RouterProvider,
  createMemoryRouter,
  createRoutesStub,
  data,
} from "react-router";

import { AdminLayout } from "~/admin/layouts/AdminLayout";
import { placeholders } from "~/content/placeholders";
import { subscribeToSignOut } from "~/services/auth";

import { ErrorBoundary as FaqsBoundary } from "./admin/faqs";
import { ErrorBoundary as AttractionFormBoundary } from "./admin/attractions.$id";
import { HydrateFallback as AdminHydrateFallback } from "./admin/_layout";
import { ErrorBoundary as PublicBoundary } from "./_public";
import Public from "./_public";

vi.mock("~/services/auth", () => ({
  signOut: vi.fn(),
  subscribeToSignOut: vi.fn(),
}));

const chrome = {
  settings: { ...placeholders.settings, phone: "+63 000 0000" },
  announcement: null,
  year: 2031,
};

// The route component takes its data as a prop, which the framework supplies.
const PublicRoute = Public as unknown as ComponentType<{
  loaderData: typeof chrome;
}>;

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.mocked(subscribeToSignOut).mockReturnValue(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

/** The public layout route as src/routes.ts registers it, with a child page. */
function renderPublic(
  child: {
    loader: () => unknown;
    Component?: () => React.ReactNode;
  },
  layoutLoader: () => unknown = () => chrome,
  entry = "/page",
) {
  const Stub = createRoutesStub([
    {
      id: "routes/_public",
      loader: layoutLoader,
      Component: () => <PublicRoute loaderData={chrome} />,
      ErrorBoundary: PublicBoundary,
      children: [
        {
          path: "/page",
          loader: child.loader,
          Component: child.Component ?? (() => <h1>The page</h1>),
        },
      ],
    },
  ]);
  return render(<Stub initialEntries={[entry]} />);
}

describe("public error boundary", () => {
  it("shows the load error with Try again and Home inside the layout", async () => {
    renderPublic({
      loader: () => {
        throw new Error("x");
      },
    });
    const heading = await screen.findByRole("heading", {
      level: 1,
      name: "We couldn't load this page",
    });
    expect(
      screen.getByRole("button", { name: "Try again" }),
    ).toBeInTheDocument();
    const main = screen.getByRole("main");
    expect(within(main).getByRole("link", { name: "Home" })).toHaveAttribute(
      "href",
      "/",
    );
    // Chrome of the layout route is still there: header and footer.
    expect(screen.getByRole("navigation", { name: "Main" })).toBeVisible();
    expect(screen.getByRole("contentinfo")).toHaveTextContent("+63 000 0000");
    expect(screen.getAllByRole("main")).toHaveLength(1);
    // The heading takes focus so the failure is announced and reachable.
    await waitFor(() => expect(heading).toHaveFocus());
  });

  it("renders the not-found page for a 404 inside the layout", async () => {
    renderPublic({
      loader: () => {
        throw data(null, { status: 404 });
      },
    });
    expect(
      await screen.findByRole("heading", { level: 1, name: "Page not found" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Main" })).toBeVisible();
    expect(screen.getAllByRole("main")).toHaveLength(1);
    expect(
      screen.queryByRole("button", { name: "Try again" }),
    ).not.toBeInTheDocument();
  });

  it("Try again re-runs the loaders and shows the page when it works", async () => {
    let attempts = 0;
    renderPublic({
      loader: () => {
        attempts += 1;
        if (attempts === 1) throw new Error("offline");
        return null;
      },
    });
    await userEvent.click(
      await screen.findByRole("button", { name: "Try again" }),
    );
    expect(
      await screen.findByRole("heading", { level: 1, name: "The page" }),
    ).toBeInTheDocument();
    expect(attempts).toBe(2);
  });

  it("uses a minimal honest chrome when the layout's own data failed", async () => {
    renderPublic({ loader: () => null }, () => {
      throw new Error("offline");
    });
    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "We couldn't load this page",
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Main" })).toBeVisible();
    const footer = screen.getByRole("contentinfo");
    expect(footer).toHaveTextContent("© " + new Date().getFullYear());
    expect(footer).toHaveTextContent("Mondelos Nature Park");
    // Nothing from the placeholder content, no contact details.
    expect(footer).not.toHaveTextContent(placeholders.settings.addressLine);
    expect(within(footer).queryByText(/tel:|@/)).not.toBeInTheDocument();
    expect(
      within(footer).queryByRole("link", { name: /\d{3}/ }),
    ).not.toBeInTheDocument();
  });
});

describe("navigation progress bar", () => {
  function renderSlowNav() {
    let release: (value: null) => void = () => {};
    const slow = new Promise<null>((resolve) => {
      release = resolve;
    });
    const Stub = createRoutesStub([
      {
        id: "routes/_public",
        loader: () => chrome,
        Component: () => <PublicRoute loaderData={chrome} />,
        children: [
          {
            path: "/",
            Component: () => <Link to="/slow">Go slow</Link>,
          },
          { path: "/slow", loader: () => slow, Component: () => <h1>Slow</h1> },
        ],
      },
    ]);
    render(<Stub initialEntries={["/"]} />);
    return release;
  }

  it("shows a hidden 2px gold bar while navigating and removes it after", async () => {
    const release = renderSlowNav();
    await screen.findByRole("link", { name: "Go slow" });
    expect(screen.queryByTestId("navigation-progress")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("link", { name: "Go slow" }));
    const bar = await screen.findByTestId("navigation-progress");
    expect(bar).toHaveAttribute("aria-hidden", "true");
    expect(bar).toHaveClass("h-0.5");
    expect(bar.firstElementChild).toHaveClass("bg-gold-500");
    // Static under reduced motion.
    expect(bar.firstElementChild).toHaveClass("motion-reduce:animate-none");

    await act(async () => release(null));
    await screen.findByRole("heading", { name: "Slow" });
    expect(screen.queryByTestId("navigation-progress")).not.toBeInTheDocument();
  });

  it("does not show during the hydration clientLoader pass", async () => {
    // A hydrating route: a `hydrate` loader runs once at start-up, as the
    // framework's `clientLoader.hydrate = true` does. That pass is the
    // router's initial load, not a navigation, so the state stays idle.
    let release: (value: unknown) => void = () => {};
    const pending = new Promise((resolve) => {
      release = resolve;
    });
    const run = vi.fn(() => pending);
    const hydrating = Object.assign(run, { hydrate: true as const });
    const router = createMemoryRouter(
      [
        {
          id: "routes/_public",
          path: "/",
          loader: hydrating,
          HydrateFallback: undefined,
          Component: () => <PublicRoute loaderData={chrome} />,
          children: [{ index: true, Component: () => <h1>Home</h1> }],
        },
      ],
      { hydrationData: { loaderData: { "routes/_public": chrome } } },
    );
    const seen: string[] = [];
    router.subscribe((state) => seen.push(state.navigation.state));
    render(<RouterProvider router={router} />);
    await screen.findByRole("heading", { name: "Home" });
    // The hydration loader is in flight right now, and no bar is showing.
    expect(run).toHaveBeenCalledTimes(1);
    expect(router.state.navigation.state).toBe("idle");
    expect(screen.queryByTestId("navigation-progress")).not.toBeInTheDocument();
    await act(async () => release(chrome));
    expect(seen).not.toContain("loading");
    expect(screen.queryByTestId("navigation-progress")).not.toBeInTheDocument();
  });
});

/** A promise that stays pending until `release()` is called. */
function gate() {
  let release: (value: null) => void = () => {};
  const promise = new Promise<null>((resolve) => {
    release = resolve;
  });
  return { promise, release };
}

const rows = () => screen.queryAllByTestId("skeleton-row");

describe("admin skeleton: first load", () => {
  function renderFallback(path: string) {
    const Stub = createRoutesStub([
      { path: "*", Component: AdminHydrateFallback },
    ]);
    return render(<Stub initialEntries={[path]} />);
  }

  it.each(["/admin/faqs", "/admin/messages", "/admin/pages/home"])(
    "shows the 3-row skeleton on a hard load of %s, with no shell or user",
    (path) => {
      renderFallback(path);
      expect(rows()).toHaveLength(3);
      expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
      expect(screen.queryByText(/@/)).not.toBeInTheDocument();
    },
  );

  it.each(["/admin", "/admin/settings", "/admin/attractions/new"])(
    "keeps the spinner on a hard load of %s",
    (path) => {
      renderFallback(path);
      expect(rows()).toHaveLength(0);
      expect(
        screen.getByRole("status", { name: "Loading the admin" }),
      ).toBeInTheDocument();
    },
  );
});

describe("admin skeleton: navigation", () => {
  function renderAdmin(
    initial: string,
    children: { path: string; loader?: () => unknown }[],
  ) {
    const Stub = createRoutesStub([
      {
        path: "/admin",
        Component: () => <AdminLayout email="owner@mondelos.test" />,
        children: [
          {
            path: "pages/:page",
            Component: () => <Link to="/admin/pages/about">To about</Link>,
          },
          ...children.map((c) => ({
            path: c.path,
            loader: c.loader,
            Component: () => (
              <>
                <h1>Page {c.path}</h1>
                <Link to="/admin/attractions/new">New attraction</Link>
                <Link to="/admin/messages?status=new">New messages</Link>
              </>
            ),
          })),
        ],
      },
    ]);
    return render(<Stub initialEntries={[initial]} />);
  }

  it("shows a 3-row skeleton while another admin list loads", async () => {
    const slow = gate();
    renderAdmin("/admin/attractions", [
      { path: "attractions" },
      { path: "faqs", loader: () => slow.promise },
    ]);
    await screen.findByRole("heading", { name: "Page attractions" });
    expect(rows()).toHaveLength(0);

    const nav = screen.getAllByRole("navigation", { name: "Admin" })[0];
    await userEvent.click(within(nav).getByRole("link", { name: "FAQs" }));
    await waitFor(() => expect(rows()).toHaveLength(3));
    expect(screen.getByRole("status", { name: "Loading" })).toBeInTheDocument();

    await act(async () => slow.release(null));
    await waitFor(() => expect(rows()).toHaveLength(0));
  });

  it("shows it for a filter change on the same list (messages?status=)", async () => {
    let calls = 0;
    const second = gate();
    renderAdmin("/admin/messages", [
      {
        path: "messages",
        loader: () => (++calls === 1 ? null : second.promise),
      },
    ]);
    await userEvent.click(
      await screen.findByRole("link", { name: "New messages" }),
    );
    await waitFor(() => expect(rows()).toHaveLength(3));
    await act(async () => second.release(null));
    await waitFor(() => expect(rows()).toHaveLength(0));
  });

  it("shows it for a move inside a section (pages/home to pages/about)", async () => {
    const slow = gate();
    let calls = 0;
    const Stub = createRoutesStub([
      {
        path: "/admin",
        Component: () => <AdminLayout email="owner@mondelos.test" />,
        children: [
          {
            path: "pages/:page",
            loader: () => (++calls === 1 ? null : slow.promise),
            Component: () => <Link to="/admin/pages/about">To about</Link>,
          },
        ],
      },
    ]);
    render(<Stub initialEntries={["/admin/pages/home"]} />);
    await userEvent.click(
      await screen.findByRole("link", { name: "To about" }),
    );
    await waitFor(() => expect(rows()).toHaveLength(3));
    await act(async () => slow.release(null));
    await waitFor(() => expect(rows()).toHaveLength(0));
  });

  it("does not blank the page for list to form, or for a form route load", async () => {
    const slow = gate();
    renderAdmin("/admin/attractions", [
      { path: "attractions" },
      { path: "attractions/:id", loader: () => slow.promise },
    ]);
    await userEvent.click(
      await screen.findByRole("link", { name: "New attraction" }),
    );
    // The navigation is loading, and the list page is still on screen.
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(rows()).toHaveLength(0);
    expect(
      screen.getByRole("heading", { name: "Page attractions" }),
    ).toBeInTheDocument();
    await act(async () => slow.release(null));
    expect(
      await screen.findByRole("heading", { name: "Page attractions/:id" }),
    ).toBeInTheDocument();
    expect(rows()).toHaveLength(0);
  });
});

describe("admin skeleton: retry", () => {
  function renderBoundary(
    path: string,
    Boundary: () => React.ReactNode,
    second: Promise<null>,
  ) {
    let attempts = 0;
    const Stub = createRoutesStub([
      {
        path,
        loader: () => {
          attempts += 1;
          if (attempts === 1) throw new Error("offline");
          return second;
        },
        Component: () => <h1>Loaded</h1>,
        ErrorBoundary: Boundary,
      },
    ]);
    render(<Stub initialEntries={[path]} />);
  }

  it("shows an error panel with Retry, then the skeleton while retrying", async () => {
    const second = gate();
    renderBoundary("/admin/faqs", FaqsBoundary, second.promise);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Something went wrong. Please try again.",
    );
    expect(rows()).toHaveLength(0);

    await userEvent.click(screen.getByRole("button", { name: "Retry" }));
    await waitFor(() => expect(rows()).toHaveLength(3));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    await act(async () => second.release(null));
    expect(
      await screen.findByRole("heading", { name: "Loaded" }),
    ).toBeInTheDocument();
    expect(rows()).toHaveLength(0);
  });

  it("keeps the panel (Retry disabled) when a form route is retried", async () => {
    const second = gate();
    renderBoundary(
      "/admin/attractions/new",
      AttractionFormBoundary,
      second.promise,
    );
    await userEvent.click(await screen.findByRole("button", { name: "Retry" }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Retry" })).toBeDisabled(),
    );
    expect(rows()).toHaveLength(0);
    await act(async () => second.release(null));
    await screen.findByRole("heading", { name: "Loaded" });
  });
});
