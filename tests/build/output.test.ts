// Checks the static site that `npm run build` writes. It needs an existing
// build/client folder, so it skips (with a message) where there is none, such
// as the unit-test job. The CI Build job runs it after the build.
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const BUILD_DIR = join(process.cwd(), "build", "client");
const built = existsSync(join(BUILD_DIR, "index.html"));

// The CI Build job sets this, so a missing build there fails the run instead
// of skipping every check. The unit-test job has no build and leaves it unset.
if (!built && process.env.REQUIRE_BUILD_OUTPUT === "1") {
  throw new Error(
    "REQUIRE_BUILD_OUTPUT=1 but build/client/index.html is missing. Run `npm run build` first.",
  );
}

if (!built) {
  console.warn(
    "tests/build skipped: build/client/index.html not found. Run `npm run build` first.",
  );
}

const read = (file: string) => readFileSync(join(BUILD_DIR, file), "utf8");

const htmlFiles = (dir = ""): string[] =>
  readdirSync(join(BUILD_DIR, dir), { withFileTypes: true }).flatMap((e) =>
    e.isDirectory()
      ? htmlFiles(join(dir, e.name))
      : e.name.endsWith(".html")
        ? [join(dir, e.name)]
        : [],
  );

describe.skipIf(!built)("build output", () => {
  it("pre-renders the home page with its title, Open Graph tags and content", () => {
    const html = read("index.html");
    expect(html).toContain(
      "<title>Mondelos Nature Park — Kawayan, Biliran</title>",
    );
    expect(html).toContain('property="og:title"');
    expect(html).toContain("Find Your Peace");
  });

  it("writes only absolute og:image URLs", () => {
    for (const file of htmlFiles()) {
      for (const m of read(file).matchAll(
        /<meta property="og:image" content="([^"]*)"/g,
      )) {
        expect(m[1], file).toMatch(/^https?:\/\//);
      }
    }
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

  describe("bundle rules", () => {
    const assets = () =>
      readdirSync(join(BUILD_DIR, "assets")).filter((f) => f.endsWith(".js"));

    it("keeps the placeholder content out of every script", () => {
      // Strings that exist only in src/content/placeholders.ts (the
      // build-time fallback of the loaders), which must never reach a client
      // chunk.
      const markers = ["sunset-spot", "Stroll through lush gardens"];
      const source = readFileSync(
        join(process.cwd(), "src", "content", "placeholders.ts"),
        "utf8",
      );
      for (const marker of markers) expect(source).toContain(marker);
      for (const file of assets()) {
        const text = read(`assets/${file}`);
        for (const marker of markers) {
          expect(text.includes(marker), `${file} contains "${marker}"`).toBe(
            false,
          );
        }
      }
    });

    it("keeps supabase-js out of the scripts the home page loads at start", () => {
      // The minifier keeps these class names (they appear in supabase-js
      // error messages and debug output).
      const markers = ["GoTrueClient", "PostgrestClient"];
      const hasSupabase = (text: string) =>
        markers.some((marker) => text.includes(marker));
      // Control: supabase-js is in the build, in a lazy chunk. Without this
      // the check below could pass on markers that no longer exist.
      expect(assets().some((f) => hasSupabase(read(`assets/${f}`)))).toBe(
        true,
      );

      const html = read("index.html");
      const initial = new Set<string>(
        [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+\.js)"/g)].map(
          (m) => m[1].slice(1),
        ),
      );
      expect(initial.size).toBeGreaterThan(0);
      // A chunk also loads the ones it imports statically.
      for (const file of initial) {
        const dir = file.slice(0, file.lastIndexOf("/") + 1);
        for (const m of read(file).matchAll(
          /(?:from|import)\s*"\.\/([^"]+\.js)"/g,
        )) {
          initial.add(dir + m[1]);
        }
      }
      for (const file of initial) {
        expect(hasSupabase(read(file)), file).toBe(false);
      }
    });
  });

  describe("Content-Security-Policy", () => {
    it("covers the home page, the SPA fallback and the 404 page", () => {
      const files = htmlFiles();
      expect(files).toContain("index.html");
      expect(files).toContain("__spa-fallback.html");
      expect(files).toContain(join("404", "index.html"));
    });

    it("puts one policy right after the charset in <head> of every page, before any script, with every inline script hashed", () => {
      for (const file of htmlFiles()) {
        const html = read(file);
        const metas =
          html.match(/<meta http-equiv="Content-Security-Policy"/g) ?? [];
        expect(metas, file).toHaveLength(1);
        const head = html.match(
          /<head><meta charSet="utf-8"\/><meta http-equiv="Content-Security-Policy" content="([^"]*)"\/>/,
        );
        if (!head) {
          throw new Error(`${file}: policy not right after the charset meta`);
        }
        expect(html.indexOf("<script"), file).toBeGreaterThan(
          html.indexOf("Content-Security-Policy"),
        );
        const csp = head[1];
        expect(csp, file).toContain("script-src 'self' ");
        for (const m of html.matchAll(/<script\b([^>]*)>([^]*?)<\/script>/g)) {
          if (/\bsrc\s*=/.test(m[1])) continue;
          const hash = `'sha256-${createHash("sha256").update(m[2]).digest("base64")}'`;
          expect(csp, `${file}: ${hash}`).toContain(hash);
        }
      }
    });
  });

  describe("vercel.json", () => {
    type VercelConfig = {
      rewrites: { source: string; destination: string }[];
      headers: { source: string; headers: { key: string; value: string }[] }[];
      cleanUrls: boolean;
      trailingSlash: boolean;
    };
    const config = () =>
      JSON.parse(
        readFileSync(join(process.cwd(), "vercel.json"), "utf8"),
      ) as VercelConfig;

    it("denies framing and sets the security headers on every path", () => {
      const all = config().headers.find((h) => h.source === "/(.*)");
      const values = Object.fromEntries(
        (all?.headers ?? []).map((h) => [h.key, h.value]),
      );
      expect(values["Content-Security-Policy"]).toBe("frame-ancestors 'none'");
      expect(values["X-Content-Type-Options"]).toBe("nosniff");
      expect(values["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
      expect(values["Permissions-Policy"]).toBe(
        "camera=(), microphone=(), geolocation=()",
      );
    });

    it("caches hashed assets for a year", () => {
      const assets = config().headers.find((h) => h.source === "/assets/(.*)");
      expect(assets?.headers).toContainEqual({
        key: "Cache-Control",
        value: "public, max-age=31536000, immutable",
      });
    });

    it("rewrites the admin and attraction pages to the SPA fallback file that exists", () => {
      const { rewrites } = config();
      const sources = rewrites.map((r) => r.source);
      expect(sources).toContain("/admin/:path*");
      expect(sources).toContain("/discover/:slug");
      for (const r of rewrites) {
        expect(r.destination).toBe("/__spa-fallback.html");
      }
      expect(existsSync(join(BUILD_DIR, "__spa-fallback.html"))).toBe(true);
    });

    it("sends other unknown pages to the SPA fallback, which shows the not-found page, but never assets or files", () => {
      const catchAll = config().rewrites.at(-1);
      if (!catchAll) throw new Error("vercel.json has no rewrites");
      const matches = (path: string) =>
        new RegExp(`^${catchAll.source}$`).test(path);
      expect(matches("/no/such/page")).toBe(true);
      expect(matches("/typo")).toBe(true);
      expect(matches("/assets/missing.js")).toBe(false);
      expect(matches("/sitemap.xml")).toBe(false);
      expect(matches("/favicon.ico")).toBe(false);
      expect(matches("/discover/x.data")).toBe(false);
    });

    it("pre-renders the not-found page with one noindex tag", () => {
      const html = read("404/index.html");
      expect(html.match(/<meta name="robots" content="noindex"\/>/g)).toHaveLength(
        1,
      );
    });

    it("uses clean URLs without trailing slashes", () => {
      expect(config().cleanUrls).toBe(true);
      expect(config().trailingSlash).toBe(false);
    });
  });
});
