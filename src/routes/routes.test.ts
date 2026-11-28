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

// No Supabase in unit tests: every live fetch fails, so the build-time
// loaders fall back to the placeholder content (as a local build does).
const content = vi.hoisted(() => {
  const offline = () => vi.fn(() => Promise.reject(new Error("offline")));
  return {
    getSiteChrome: offline(),
    getHomeContent: offline(),
    getDiscoverContent: offline(),
    getAttractionBySlug: offline(),
    listPublishedAttractionSlugs: offline(),
    getGalleryContent: offline(),
    getAboutContent: offline(),
    getVisitContent: offline(),
  };
});
vi.mock("~/services/content", () => content);

beforeEach(() => {
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

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

  it("detail loader throws a 404 response for an unknown slug", async () => {
    await expect(
      detail.loader({ params: { slug: "x" } } as never),
    ).rejects.toMatchObject({ init: { status: 404 } });
  });

  it("detail loader returns the placeholder attraction for a known slug", async () => {
    if (!known) throw new Error("no placeholder attraction");
    await expect(
      detail.loader({ params: { slug: known.slug } } as never),
    ).resolves.toEqual({ attraction: known });
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

  it("every page route refreshes live through a hydrating clientLoader", () => {
    for (const mod of [
      publicLayout,
      home,
      discover,
      detail,
      gallery,
      about,
      visit,
    ]) {
      const clientLoader = (mod as { clientLoader?: { hydrate?: boolean } })
        .clientLoader;
      expect(typeof clientLoader).toBe("function");
      expect(clientLoader?.hydrate).toBe(true);
      // A HydrateFallback would replace the pre-rendered HTML on hydration.
      expect("HydrateFallback" in mod).toBe(false);
    }
    expect("clientLoader" in notFound).toBe(false);
  });
});

describe("public layout route", () => {
  afterEach(() => vi.useRealTimers());

  it("puts the footer year in both loaders, so prerender and hydration agree", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2030-06-01T12:00:00Z"));
    const client = publicLayout.clientLoader as unknown as (args: {
      serverLoader: () => Promise<unknown>;
    }) => Promise<{ year: number }>;
    const server = publicLayout.loader as unknown as () => Promise<{
      year: number;
    }>;
    // The build falls back to placeholders here; the browser reads live.
    expect((await server()).year).toBe(2030);
    content.getSiteChrome.mockImplementationOnce(
      () =>
        Promise.resolve({
          settings: placeholders.settings,
          announcement: null,
        }) as never,
    );
    expect(
      (await client({ serverLoader: () => Promise.reject(new Error("x")) }))
        .year,
    ).toBe(2030);
  });
});
