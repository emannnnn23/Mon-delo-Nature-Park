import { render, screen } from "@testing-library/react";
import { createElement, type ComponentType } from "react";
import {
  createRoutesStub,
  useLoaderData,
  useParams,
  type MetaDescriptor,
  type Params,
} from "react-router";

import * as about from "./about";
import * as discover from "./discover";
import * as detail from "./discover.$slug";
import * as gallery from "./gallery";
import * as home from "./home";
import * as notFound from "./not-found";
import * as publicLayout from "./_public";
import * as visit from "./visit";
import { placeholders } from "~/content/placeholders";

type RouteModule = {
  default: ComponentType<{ loaderData: unknown; params: Params }>;
  loader?: (args: { params: Params }) => unknown;
  meta: (args: { params: Params }) => MetaDescriptor[];
};

// Mirrors what the framework does at runtime: loader data and params are
// handed to the page component as props.
function asRoute(mod: unknown) {
  const m = mod as RouteModule;
  return {
    Component() {
      const loaderData = useLoaderData();
      const params = useParams();
      return createElement(m.default, { loaderData, params });
    },
    loader: m.loader
      ? ({ params }: { params: Params }) => m.loader?.({ params })
      : undefined,
  };
}

function renderAt(path: string) {
  const Stub = createRoutesStub([
    { path: "/", ...asRoute(home) },
    { path: "/discover", ...asRoute(discover) },
    { path: "/discover/:slug", ...asRoute(detail) },
    { path: "/gallery", ...asRoute(gallery) },
    { path: "/about", ...asRoute(about) },
    { path: "/visit", ...asRoute(visit) },
    { path: "*", ...asRoute(notFound) },
  ]);
  return render(createElement(Stub, { initialEntries: [path] }));
}

describe("public route modules", () => {
  const known = placeholders.attractions.find((a) => a.kind === "attraction");

  it.each([
    ["/", "Find Your Peace in Nature."],
    ["/discover", "Discover the Park"],
    ["/gallery", "Gallery"],
    ["/about", "About the Park"],
    ["/visit", "Visit Us"],
    ["/nope", "Page not found"],
  ])("%s renders exactly one h1", async (path, heading) => {
    renderAt(path);
    const h1s = await screen.findAllByRole(
      "heading",
      { level: 1 },
      { timeout: 5000 },
    );
    expect(h1s).toHaveLength(1);
    expect(h1s[0]).toHaveTextContent(heading);
  });

  it("/nope shows Page not found with Home and Visit Us buttons", async () => {
    renderAt("/nope");
    expect(
      await screen.findByRole(
        "heading",
        { level: 1, name: "Page not found" },
        { timeout: 5000 },
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute(
      "href",
      "/",
    );
    expect(screen.getByRole("link", { name: /visit us/i })).toHaveAttribute(
      "href",
      "/visit",
    );
    expect(screen.queryByRole("main")).not.toBeInTheDocument();
  });

  it("detail renders the attraction name for a known placeholder slug", async () => {
    if (!known) throw new Error("no placeholder attraction");
    renderAt(`/discover/${known.slug}`);
    const h1 = await screen.findByRole("heading", { level: 1 });
    expect(h1).toHaveTextContent(known.name);
  });

  it("detail loader throws a 404 response for an unknown slug", () => {
    let thrown: unknown;
    try {
      detail.loader({ params: { slug: "x" } } as never);
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toMatchObject({ init: { status: 404 } });
  });

  it("detail loader returns the attraction for a known slug", () => {
    if (!known) throw new Error("no placeholder attraction");
    expect(detail.loader({ params: { slug: known.slug } } as never)).toEqual({
      attraction: known,
    });
  });

  it("every route module exports meta; page routes export a loader", () => {
    for (const mod of [home, discover, detail, gallery, about, visit]) {
      expect(typeof mod.meta).toBe("function");
      expect(typeof mod.loader).toBe("function");
    }
    expect(typeof notFound.meta).toBe("function");
    // Backs the un-pre-rendered catch-all route, so it must not have a loader.
    expect("loader" in notFound).toBe(false);
  });

  it("only the detail route exports a clientLoader", () => {
    for (const mod of [home, discover, gallery, about, visit, notFound]) {
      expect("clientLoader" in mod).toBe(false);
    }
  });

  // A slug that was not prerendered is served the SPA fallback, which has no
  // `.data` file to fetch; the clientLoader must answer it in the browser.
  describe("detail clientLoader", () => {
    type ClientLoader = ((args: { params: Params }) => unknown) & {
      hydrate?: boolean;
    };
    const clientLoader = (detail as unknown as { clientLoader: ClientLoader })
      .clientLoader;

    it("runs on hydration", () => {
      expect(clientLoader.hydrate).toBe(true);
    });

    it("returns the attraction for a known slug", () => {
      if (!known) throw new Error("no placeholder attraction");
      expect(clientLoader({ params: { slug: known.slug } })).toEqual({
        attraction: known,
      });
    });

    it("throws a 404 response for an unknown slug", () => {
      let thrown: unknown;
      try {
        clientLoader({ params: { slug: "not-a-real-place" } });
      } catch (error) {
        thrown = error;
      }
      expect(thrown).toMatchObject({ init: { status: 404 } });
    });
  });
});

describe("public layout route", () => {
  afterEach(() => vi.useRealTimers());

  it("puts the footer year in both loaders, so prerender and hydration agree", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2030-06-01T12:00:00Z"));
    const client = publicLayout.clientLoader as unknown as () => {
      year: number;
    };
    const server = publicLayout.loader as unknown as () => { year: number };
    expect(server().year).toBe(2030);
    expect(client().year).toBe(2030);
  });
});
