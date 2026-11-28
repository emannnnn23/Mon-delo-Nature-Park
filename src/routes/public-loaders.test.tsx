import { render, screen, waitFor } from "@testing-library/react";
import { useEffect, useRef, type ComponentType } from "react";
import {
  createRoutesStub,
  useLoaderData,
  useRevalidator,
  type Params,
} from "react-router";

import { placeholders } from "~/content/placeholders";
import { selectHomeContent, type HomePageProps } from "~/lib/homeContent";
import type { Attraction } from "~/types/content";

import * as detail from "./discover.$slug";
import * as liveDetail from "./discover.$slug.live";
import * as home from "./home";

const content = vi.hoisted(() => ({
  getHomeContent: vi.fn(),
  getAttractionBySlug: vi.fn(),
}));
vi.mock("~/services/content", () => content);

type ClientLoader = (args: {
  params: Params;
  request: Request;
  serverLoader: () => Promise<unknown>;
}) => Promise<unknown>;

// The build-time snapshot a pre-rendered page hydrates with.
const snapshot: HomePageProps = selectHomeContent({
  settings: placeholders.settings,
  sections: placeholders.sections.home,
  attractions: placeholders.attractions,
  galleryImages: placeholders.galleryImages,
  testimonials: placeholders.testimonials,
});
const ORIGINAL_HEADING = "Find Your Peace in Nature.";

function withHeroHeading(props: HomePageProps, heading: string) {
  return {
    ...props,
    sections: props.sections.map((s) =>
      s.key === "hero" ? { ...s, heading } : s,
    ),
  };
}

function Page({ module }: { module: unknown }) {
  const Component = (
    module as { default: ComponentType<{ loaderData: unknown }> }
  ).default;
  return <Component loaderData={useLoaderData()} />;
}

/**
 * The home route hydrated with the snapshot, then refreshed once by its
 * clientLoader, as `clientLoader.hydrate = true` does in the browser.
 */
function renderHydratedHome() {
  function HydratingHome() {
    const { revalidate } = useRevalidator();
    const started = useRef(false);
    useEffect(() => {
      if (started.current) return;
      started.current = true;
      void revalidate();
    }, [revalidate]);
    return <Page module={home} />;
  }
  const clientLoader = home.clientLoader as unknown as ClientLoader;
  const Stub = createRoutesStub([
    {
      id: "home",
      path: "/",
      Component: HydratingHome,
      loader: ({ params, request }: { params: Params; request: Request }) =>
        clientLoader({
          params,
          request,
          serverLoader: () => Promise.resolve(snapshot),
        }),
    },
  ]);
  return render(
    <Stub
      initialEntries={["/"]}
      hydrationData={{ loaderData: { home: snapshot } }}
    />,
  );
}

function renderDetail(
  module: unknown,
  slug: string,
  serverLoader: () => Promise<unknown>,
) {
  const m = module as {
    clientLoader: ClientLoader;
    ErrorBoundary: ComponentType;
  };
  const Stub = createRoutesStub([
    {
      path: "/discover/:slug",
      Component: () => <Page module={module} />,
      ErrorBoundary: m.ErrorBoundary,
      loader: ({ params, request }: { params: Params; request: Request }) =>
        m.clientLoader({ params, request, serverLoader }),
    },
  ]);
  return render(<Stub initialEntries={[`/discover/${slug}`]} />);
}

const notPrerendered = () =>
  Promise.reject(new Error("Unable to decode turbo-stream response"));

const known = placeholders.attractions.find(
  (a) => a.kind === "attraction",
) as Attraction;
const newOne: Attraction = {
  ...known,
  id: "n1",
  slug: "new-one",
  name: "New One",
};

describe("public route clientLoaders", () => {
  // The loaders `import()` this module on first use. Resolving it once up
  // front keeps the cold import out of the first test's wait.
  beforeAll(async () => {
    await import("~/services/content");
  });

  let warn: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    content.getHomeContent.mockReset();
    content.getAttractionBySlug.mockReset();
  });
  afterEach(() => warn.mockRestore());

  it("home swaps the snapshot for live content once the clientLoader runs", async () => {
    content.getHomeContent.mockResolvedValue(
      withHeroHeading(snapshot, "Changed in the CMS."),
    );
    renderHydratedHome();
    expect(
      screen.getByRole("heading", { level: 1, name: ORIGINAL_HEADING }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "Changed in the CMS.",
      }),
    ).toBeInTheDocument();
    expect(content.getHomeContent).toHaveBeenCalledTimes(1);
  });

  it("home keeps the snapshot when the live fetch fails", async () => {
    content.getHomeContent.mockRejectedValue(new Error("offline"));
    renderHydratedHome();
    await waitFor(() => expect(content.getHomeContent).toHaveBeenCalled());
    await waitFor(() => expect(warn).toHaveBeenCalledTimes(1));
    expect(
      screen.getByRole("heading", { level: 1, name: ORIGINAL_HEADING }),
    ).toBeInTheDocument();
  });

  it.each([
    ["loader + clientLoader module", detail],
    ["clientLoader-only module", liveDetail],
  ])(
    "detail (%s) fetches a slug published after the build",
    async (_name, module) => {
      content.getAttractionBySlug.mockResolvedValue(newOne);
      renderDetail(module, "new-one", notPrerendered);
      expect(
        await screen.findByRole("heading", { level: 1, name: "New One" }),
      ).toBeInTheDocument();
      expect(content.getAttractionBySlug).toHaveBeenCalledWith("new-one");
    },
  );

  it("detail shows Page not found for a slug that is not published", async () => {
    content.getAttractionBySlug.mockResolvedValue(null);
    // Even with a snapshot available: an unpublished attraction must not
    // keep showing its build-time page.
    renderDetail(detail, known.slug, () =>
      Promise.resolve({ attraction: known }),
    );
    expect(
      await screen.findByRole("heading", { level: 1, name: "Page not found" }),
    ).toBeInTheDocument();
  });

  it("detail falls back to the snapshot of a pre-rendered slug when offline", async () => {
    content.getAttractionBySlug.mockRejectedValue(new Error("offline"));
    renderDetail(detail, known.slug, () =>
      Promise.resolve({ attraction: known }),
    );
    expect(
      await screen.findByRole("heading", { level: 1, name: known.name }),
    ).toBeInTheDocument();
  });

  it("detail shows the error page when offline and the slug was not pre-rendered", async () => {
    content.getAttractionBySlug.mockRejectedValue(new Error("offline"));
    renderDetail(detail, "new-one", notPrerendered);
    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "We couldn't load this page",
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Page not found" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("New One")).not.toBeInTheDocument();
  });

  it("the clientLoader-only detail module has no build-time loader", () => {
    expect("loader" in liveDetail).toBe(false);
    expect(typeof liveDetail.clientLoader).toBe("function");
    expect(liveDetail.default).toBe(detail.default);
    expect(liveDetail.meta).toBe(detail.meta);
    expect(liveDetail.ErrorBoundary).toBe(detail.ErrorBoundary);
  });
});
