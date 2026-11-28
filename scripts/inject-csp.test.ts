import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  buildCsp,
  DEFAULT_SUPABASE_URL,
  injectCsp,
  injectCspInDir,
  supabaseWsUrl,
} from "./inject-csp.mjs";

const sha = (text: string) =>
  `'sha256-${createHash("sha256").update(text).digest("base64")}'`;

const metaContent = (html: string) => {
  const match = html.match(
    /<meta http-equiv="Content-Security-Policy" content="([^"]*)"\/?>/,
  );
  if (!match) throw new Error("no CSP meta tag");
  return match[1];
};

describe("supabaseWsUrl", () => {
  it("turns https into wss and http into ws", () => {
    expect(supabaseWsUrl("https://x.supabase.co")).toBe("wss://x.supabase.co");
    expect(supabaseWsUrl("http://127.0.0.1:55321")).toBe(
      "ws://127.0.0.1:55321",
    );
  });
});

describe("buildCsp", () => {
  const csp = buildCsp({
    scriptHashes: ["'sha256-aaa'", "'sha256-bbb'"],
    supabaseUrl: "https://x.supabase.co",
  });

  it("lists every hash after 'self' in script-src", () => {
    expect(csp).toContain("script-src 'self' 'sha256-aaa' 'sha256-bbb';");
  });

  it("allows the Supabase URL for images and its https and wss forms for connections", () => {
    expect(csp).toContain("img-src 'self' data: blob: https://x.supabase.co;");
    expect(csp).toContain(
      "connect-src 'self' https://x.supabase.co wss://x.supabase.co;",
    );
  });

  it("restricts the rest as the spec says", () => {
    expect(csp).toContain("default-src 'self';");
    expect(csp).toContain("style-src 'self' 'unsafe-inline';");
    expect(csp).toContain("font-src 'self';");
    expect(csp).toContain("frame-src https://www.google.com;");
    expect(csp).toContain("base-uri 'self';");
    expect(csp).toContain("form-action 'self';");
    expect(csp).toContain("object-src 'none'");
    expect(csp).not.toContain("frame-ancestors");
  });

  it("ignores a trailing slash on the Supabase URL", () => {
    expect(
      buildCsp({ scriptHashes: [], supabaseUrl: "https://x.supabase.co/" }),
    ).toContain(
      "connect-src 'self' https://x.supabase.co wss://x.supabase.co;",
    );
  });
});

describe("injectCsp", () => {
  const page =
    '<!DOCTYPE html><html><head><meta charSet="utf-8"/><title>t</title></head><body><script>console.log(1)</script></body></html>';

  it("hashes the inline script and allows the Supabase connections", () => {
    const out = injectCsp(page, "https://x.supabase.co");
    const csp = metaContent(out);
    expect(csp).toContain(sha("console.log(1)"));
    expect(csp).toContain(
      "connect-src 'self' https://x.supabase.co wss://x.supabase.co",
    );
  });

  it("puts the meta tag right after the charset meta, before the title", () => {
    const out = injectCsp(page, "https://x.supabase.co");
    expect(out).toMatch(
      /<head><meta charSet="utf-8"\/><meta http-equiv="Content-Security-Policy" content="[^"]*"\/><title>/,
    );
  });

  it("finds a lower-case charset meta too", () => {
    const html =
      '<html><head><meta charset="utf-8"><title>t</title></head><body></body></html>';
    expect(injectCsp(html, "https://x.supabase.co")).toMatch(
      /<head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy"/,
    );
  });

  it("goes first in <head> when there is no charset meta", () => {
    const html = "<html><head><title>t</title></head><body></body></html>";
    expect(injectCsp(html, "https://x.supabase.co")).toMatch(
      /<head><meta http-equiv="Content-Security-Policy"[^>]*\/><title>/,
    );
  });

  it("stays before a script even when the charset meta comes after it", () => {
    const html =
      '<html><head><script>a()</script><meta charset="utf-8"></head><body></body></html>';
    const out = injectCsp(html, "https://x.supabase.co");
    expect(out.indexOf("Content-Security-Policy")).toBeLessThan(
      out.indexOf("<script"),
    );
  });

  it("hashes the exact body, whitespace and JSON-LD included, and skips src scripts", () => {
    const body = '\n  {"@type":"Thing","name":"a & b"}\n';
    const html = `<html><head><script type="application/ld+json">${body}</script><script type="module" src="/assets/a.js"></script></head><body><script>x()</script></body></html>`;
    const csp = metaContent(injectCsp(html, "https://x.supabase.co"));
    expect(csp).toContain(sha(body));
    expect(csp).toContain(sha("x()"));
    expect(csp.match(/sha256-/g)).toHaveLength(2);
  });

  it("is idempotent", () => {
    const once = injectCsp(page, "https://x.supabase.co");
    const twice = injectCsp(once, "https://x.supabase.co");
    expect(twice).toBe(once);
    expect(twice.match(/Content-Security-Policy/g)).toHaveLength(1);
  });

  it("replaces a stale policy instead of adding a second one", () => {
    const once = injectCsp(page, "https://old.supabase.co");
    const twice = injectCsp(once, "https://new.supabase.co");
    expect(twice.match(/Content-Security-Policy/g)).toHaveLength(1);
    expect(metaContent(twice)).toContain("https://new.supabase.co");
    expect(metaContent(twice)).not.toContain("old.supabase.co");
  });

  it("keeps the content attribute safe from quotes and ampersands", () => {
    // Not a parsable URL, so it is used as given and must still be escaped.
    const out = injectCsp(page, 'a"b&c<d>');
    const content = metaContent(out);
    expect(content).toContain("a&quot;b&amp;c&lt;d&gt;");
    expect(content).not.toMatch(/&(?!amp;|quot;|lt;|gt;)/);
  });

  it("does not mistake <header> for <head>", () => {
    const html =
      "<html><head><title>t</title></head><body><header></header></body></html>";
    const out = injectCsp(html, "https://x.supabase.co");
    expect(out.indexOf("Content-Security-Policy")).toBeLessThan(
      out.indexOf("<title>"),
    );
  });

  it("throws on a page with no <head>", () => {
    expect(() => injectCsp("<p>hi</p>", "https://x.supabase.co")).toThrow(
      /<head>/,
    );
  });
});

describe("injectCspInDir", () => {
  it("rewrites every .html file, nested ones and the SPA fallback included", () => {
    const root = mkdtempSync(join(tmpdir(), "csp-"));
    mkdirSync(join(root, "404"));
    mkdirSync(join(root, "discover"));
    const files = ["index.html", "__spa-fallback.html", "404/index.html"];
    for (const file of files)
      writeFileSync(
        join(root, file),
        "<html><head></head><body><script>a()</script></body></html>",
      );
    writeFileSync(join(root, "discover", "x.data"), "not html");

    expect(injectCspInDir(root, DEFAULT_SUPABASE_URL)).toBe(3);
    for (const file of files)
      expect(readFileSync(join(root, file), "utf8")).toContain(sha("a()"));
    expect(readFileSync(join(root, "discover", "x.data"), "utf8")).toBe(
      "not html",
    );
  });
});
