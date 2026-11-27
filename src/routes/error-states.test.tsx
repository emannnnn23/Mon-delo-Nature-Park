import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentType } from "react";
import {
  Link,
  Outlet,
  RouterProvider,
  createMemoryRouter,
  createRoutesStub,
  data,
} from "react-router";

import { AdminLayout } from "~/admin/layouts/AdminLayout";
import { placeholders } from "~/content/placeholders";
import { subscribeToSignOut } from "~/services/auth";

import { ErrorBoundary as FaqsBoundary } from "./admin/faqs";
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

describe("admin loading and error states", () => {
  function renderAdmin(slow: Promise<null>) {
    const Stub = createRoutesStub([
      {
        path: "/admin",
        Component: () => <AdminLayout email="owner@mondelos.test" />,
        children: [
          { path: "attractions", Component: () => <h1>Attractions page</h1> },
          { path: "faqs", loader: () => slow, Component: () => <Outlet /> },
        ],
      },
    ]);
    return render(<Stub initialEntries={["/admin/attractions"]} />);
  }

  it("shows a 3-row skeleton while the next admin list loads", async () => {
    let release: (value: null) => void = () => {};
    const slow = new Promise<null>((resolve) => {
      release = resolve;
    });
    renderAdmin(slow);
    await screen.findByRole("heading", { name: "Attractions page" });
    expect(screen.queryAllByTestId("skeleton-row")).toHaveLength(0);

    const nav = screen.getAllByRole("navigation", { name: "Admin" })[0];
    await userEvent.click(within(nav).getByRole("link", { name: "FAQs" }));
    await waitFor(() =>
      expect(screen.getAllByTestId("skeleton-row")).toHaveLength(3),
    );
    expect(screen.getByRole("status", { name: "Loading" })).toBeInTheDocument();

    await act(async () => release(null));
    await waitFor(() =>
      expect(screen.queryAllByTestId("skeleton-row")).toHaveLength(0),
    );
  });

  it("shows an error panel with Retry that re-runs the loader", async () => {
    let attempts = 0;
    const Stub = createRoutesStub([
      {
        path: "/",
        loader: () => {
          attempts += 1;
          if (attempts === 1) throw new Error("offline");
          return null;
        },
        Component: () => <h1>Loaded FAQs</h1>,
        ErrorBoundary: FaqsBoundary,
      },
    ]);
    render(<Stub />);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Something went wrong. Please try again.",
    );
    await userEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(
      await screen.findByRole("heading", { name: "Loaded FAQs" }),
    ).toBeInTheDocument();
    expect(attempts).toBe(2);
  });
});
