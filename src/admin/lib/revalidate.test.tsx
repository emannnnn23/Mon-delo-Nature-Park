import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  Link,
  Outlet,
  RouterProvider,
  createMemoryRouter,
  useLoaderData,
} from "react-router";
import type { ShouldRevalidateFunctionArgs } from "react-router";

import { skipSearchOnlyRevalidation } from "./revalidate";

function args(
  from: string,
  to: string,
  extra: Partial<ShouldRevalidateFunctionArgs> = {},
): ShouldRevalidateFunctionArgs {
  return {
    currentUrl: new URL(from, "http://localhost"),
    nextUrl: new URL(to, "http://localhost"),
    currentParams: {},
    nextParams: {},
    defaultShouldRevalidate: true,
    ...extra,
  } as ShouldRevalidateFunctionArgs;
}

describe("skipSearchOnlyRevalidation", () => {
  it("skips when only the query string changed", () => {
    expect(
      skipSearchOnlyRevalidation(
        args("/admin/gallery", "/admin/gallery?category=x"),
      ),
    ).toBe(false);
  });

  it("revalidates when the path changes", () => {
    expect(
      skipSearchOnlyRevalidation(args("/admin/gallery", "/admin/faqs")),
    ).toBe(true);
  });

  it("revalidates after a form submission", () => {
    expect(
      skipSearchOnlyRevalidation(
        args("/admin/gallery", "/admin/gallery?x=1", { formMethod: "POST" }),
      ),
    ).toBe(true);
  });

  it("revalidates on an explicit revalidate (same URL)", () => {
    expect(
      skipSearchOnlyRevalidation(args("/admin/gallery", "/admin/gallery")),
    ).toBe(true);
  });

  it("follows the default when it says no", () => {
    expect(
      skipSearchOnlyRevalidation(
        args("/a", "/b", { defaultShouldRevalidate: false }),
      ),
    ).toBe(false);
  });
});

describe("search-only navigation in a router", () => {
  it("does not call the child loader again, while the guard middleware still runs", async () => {
    const middleware = vi.fn(
      async (_: unknown, next: () => Promise<unknown>) => {
        await next();
      },
    );
    const loader = vi.fn(async () => ({ n: 1 }));
    function List() {
      useLoaderData();
      return (
        <>
          <Link to="/admin/list?tab=b">Tab B</Link>
          <Link to="/admin/other">Other</Link>
        </>
      );
    }
    const router = createMemoryRouter(
      [
        {
          path: "/admin",
          middleware: [middleware],
          Component: Outlet,
          children: [
            {
              path: "list",
              loader,
              shouldRevalidate: skipSearchOnlyRevalidation,
              Component: List,
            },
            { path: "other", Component: () => <p>Other page</p> },
          ],
        },
      ],
      { initialEntries: ["/admin/list"] },
    );
    render(<RouterProvider router={router} />);
    await screen.findByRole("link", { name: "Tab B" });
    expect(loader).toHaveBeenCalledTimes(1);
    const before = middleware.mock.calls.length;
    await userEvent.click(screen.getByRole("link", { name: "Tab B" }));
    expect(router.state.location.search).toBe("?tab=b");
    expect(loader).toHaveBeenCalledTimes(1);
    // Documented behaviour: the layout's client middleware (the admin guard)
    // still runs on a search-only navigation, even though no loader does.
    expect(middleware.mock.calls.length - before).toBe(1);
  });
});
