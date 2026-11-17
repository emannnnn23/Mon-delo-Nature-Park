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
import * as visit from "./visit";
import { placeholders } from "~/content/placeholders";

type RouteModule = {
  default: ComponentType<{ loaderData: unknown; params: Params }>;
  clientLoader: (args: { params: Params }) => unknown;
  meta: (args: { params: Params }) => MetaDescriptor[];
};

// Mirrors what the framework does at runtime: loader data and params are
// handed to the page component as props.
function asRoute(mod: RouteModule) {
  return {
    Component() {
      const loaderData = useLoaderData();
      const params = useParams();
      return createElement(mod.default, { loaderData, params });
    },
    loader: ({ params }: { params: Params }) => mod.clientLoader({ params }),
  };
}

function renderAt(path: string) {
  const Stub = createRoutesStub([
    { path: "/", ...asRoute(home as unknown as RouteModule) },
    { path: "/discover", ...asRoute(discover as unknown as RouteModule) },
    { path: "/discover/:slug", ...asRoute(detail as unknown as RouteModule) },
    { path: "/gallery", ...asRoute(gallery as unknown as RouteModule) },
    { path: "/about", ...asRoute(about as unknown as RouteModule) },
    { path: "/visit", ...asRoute(visit as unknown as RouteModule) },
    { path: "*", ...asRoute(notFound as unknown as RouteModule) },
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
    ["/discover/x", "Page not found"],
  ])("%s renders exactly one h1", async (path, heading) => {
    renderAt(path);
    const h1s = await screen.findAllByRole("heading", { level: 1 });
    expect(h1s).toHaveLength(1);
    expect(h1s[0]).toHaveTextContent(heading);
  });

  it("detail renders the attraction name for a known placeholder slug", async () => {
    if (!known) throw new Error("no placeholder attraction");
    renderAt(`/discover/${known.slug}`);
    const h1 = await screen.findByRole("heading", { level: 1 });
    expect(h1).toHaveTextContent(known.name);
  });

  it("every route module exports meta and clientLoader", () => {
    for (const mod of [
      home,
      discover,
      detail,
      gallery,
      about,
      visit,
      notFound,
    ]) {
      expect(typeof mod.meta).toBe("function");
      expect(typeof mod.clientLoader).toBe("function");
    }
  });
});
