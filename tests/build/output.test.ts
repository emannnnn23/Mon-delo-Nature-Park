// Checks the static site that `npm run build` writes. It needs an existing
// build/client folder, so it skips (with a message) where there is none, such
// as the unit-test job. The CI Build job runs it after the build.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const BUILD_DIR = join(process.cwd(), "build", "client");
const built = existsSync(join(BUILD_DIR, "index.html"));

if (!built) {
  console.warn(
    "tests/build skipped: build/client/index.html not found. Run `npm run build` first.",
  );
}

const read = (file: string) => readFileSync(join(BUILD_DIR, file), "utf8");

describe.skipIf(!built)("build output", () => {
  it("pre-renders the home page with its title, Open Graph tags and content", () => {
    const html = read("index.html");
    expect(html).toContain(
      "<title>Mondelos Nature Park — Kawayan, Biliran</title>",
    );
    expect(html).toContain('property="og:title"');
    expect(html).toContain("Find Your Peace");
  });

  it("writes the park JSON-LD into the home page without a rating", () => {
    const html = read("index.html");
    const match = html.match(
      /<script type="application\/ld\+json">([^]*?)<\/script>/,
    );
    if (!match) throw new Error("no JSON-LD script in index.html");
    const ld = JSON.parse(match[1]);
    expect(ld["@type"]).toBe("TouristAttraction");
    expect(ld.address.addressLocality).toBe("Kawayan");
    expect(ld).not.toHaveProperty("aggregateRating");
  });

  it("pre-renders the gallery page title", () => {
    expect(read("gallery/index.html")).toContain(
      "<title>Gallery · Mondelos Nature Park</title>",
    );
  });

  it("links the SVG favicon beside favicon.ico", () => {
    const html = read("index.html");
    expect(html).toContain('href="/favicon.svg"');
    expect(html).toContain('href="/favicon.ico"');
    expect(existsSync(join(BUILD_DIR, "favicon.svg"))).toBe(true);
  });

  describe("sitemap.xml", () => {
    const sitemap = () => read("sitemap.xml");

    it("lists the public pages with a home entry ending in a slash", () => {
      const xml = sitemap();
      expect(xml).toContain("/discover</loc>");
      expect(xml).toContain("/gallery</loc>");
      expect(xml).toMatch(/<loc>https?:\/\/[^<]+[^/<]\/<\/loc>/);
      expect(xml).toMatch(/<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/);
    });

    it("leaves out the admin, 404 and SPA fallback pages", () => {
      const xml = sitemap();
      expect(xml).not.toContain("/admin");
      expect(xml).not.toContain("/404");
      expect(xml).not.toContain("__spa-fallback");
    });

    it("includes the pre-rendered attraction pages", () => {
      const xml = sitemap();
      expect(xml).toMatch(/\/discover\/[a-z0-9-]+<\/loc>/);
    });
  });

  it("robots.txt hides the admin and names the sitemap", () => {
    const robots = read("robots.txt");
    expect(robots).toContain("User-agent: *");
    expect(robots).toContain("Disallow: /admin");
    expect(robots).toMatch(/^Sitemap: https?:\/\/\S+\/sitemap\.xml$/m);
  });

  it("keeps the admin code out of the scripts the home page loads", () => {
    // The minifier drops component names, so `MediaLibraryPage` rarely
    // survives in a chunk. "Edit photo" is a UI string of that page that does.
    const markers = ["MediaLibraryPage", "Edit photo"];
    const containsAdmin = (text: string) =>
      markers.some((marker) => text.includes(marker));

    const assets = readdirSync(join(BUILD_DIR, "assets")).filter((f) =>
      f.endsWith(".js"),
    );
    // Control: the admin code is in the build, just in its own chunk. Without
    // this the check below could pass on a marker that no longer exists.
    expect(
      assets.some((file) => containsAdmin(read(`assets/${file}`))),
    ).toBe(true);

    const html = read("index.html");
    const scripts = [
      ...html.matchAll(/(?:src|href)="(\/assets\/[^"]+\.js)"/g),
    ].map((m) => m[1]);
    expect(scripts.length).toBeGreaterThan(0);
    for (const src of scripts) {
      expect(containsAdmin(read(src.slice(1))), src).toBe(false);
    }
  });
});
