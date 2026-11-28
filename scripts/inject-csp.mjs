// Adds a hash-based Content-Security-Policy <meta> tag to every built page.
//
//   node scripts/inject-csp.mjs [buildDir=build/client] [supabaseUrl=$VITE_SUPABASE_URL]
//
// The site is static, so the policy cannot be an HTTP header per request. It is
// a meta tag, first in <head>, listing the SHA-256 of every inline <script>
// (the router state and the JSON-LD). Scripts with a `src` are covered by
// 'self'. `frame-ancestors` cannot be set in a meta tag; vercel.json sends it.
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath, URL } from "node:url";

import { loadEnv } from "vite";

/** Local Supabase API, used when VITE_SUPABASE_URL is not set. */
export const DEFAULT_SUPABASE_URL = "http://127.0.0.1:55321";

/** The origin of a Supabase URL, without a trailing slash or path. */
function supabaseOrigin(supabaseUrl) {
  try {
    return new URL(supabaseUrl).origin;
  } catch {
    return supabaseUrl.trim().replace(/\/+$/, "");
  }
}

/** https becomes wss and http becomes ws (Supabase Realtime). */
export function supabaseWsUrl(supabaseUrl) {
  return supabaseOrigin(supabaseUrl).replace(/^http/, "ws");
}

/** The CSP source for one inline script body, exactly as the browser sees it. */
function hashScript(body) {
  return `'sha256-${createHash("sha256").update(body).digest("base64")}'`;
}

export function buildCsp({ scriptHashes, supabaseUrl }) {
  const supabase = supabaseOrigin(supabaseUrl);
  return [
    "default-src 'self'",
    `script-src 'self' ${scriptHashes.join(" ")}`.trimEnd(),
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob: ${supabase}`,
    "font-src 'self'",
    `connect-src 'self' ${supabase} ${supabaseWsUrl(supabase)}`,
    // Must match what src/lib/maps.ts isGoogleEmbed accepts.
    "frame-src https://www.google.com",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ].join("; ");
}

const INLINE_SCRIPT = /<script\b([^>]*)>([^]*?)<\/script>/gi;
const HAS_SRC = /\bsrc\s*=/i;
const CSP_META = /<meta\s+http-equiv="Content-Security-Policy"[^>]*>/gi;
const HEAD_OPEN = /<head(?:\s[^>]*)?>/i;

function escapeAttribute(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Inserts the policy as the first child of <head>. A policy already there is
 * replaced, so running the injector twice leaves one meta tag.
 */
export function injectCsp(html, supabaseUrl) {
  const page = html.replace(CSP_META, "");
  const hashes = new Set();
  for (const [, attributes, body] of page.matchAll(INLINE_SCRIPT)) {
    if (!HAS_SRC.test(attributes)) hashes.add(hashScript(body));
  }
  const csp = buildCsp({ scriptHashes: [...hashes], supabaseUrl });
  const meta = `<meta http-equiv="Content-Security-Policy" content="${escapeAttribute(csp)}"/>`;

  const head = HEAD_OPEN.exec(page);
  if (!head) throw new Error("injectCsp: the page has no <head> element");
  const at = head.index + head[0].length;
  return page.slice(0, at) + meta + page.slice(at);
}

function findHtmlFiles(dir, found = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) findHtmlFiles(full, found);
    else if (name.endsWith(".html")) found.push(full);
  }
  return found;
}

/** Rewrites every .html file under `buildDir`; returns how many. */
export function injectCspInDir(buildDir, supabaseUrl) {
  const files = findHtmlFiles(buildDir);
  for (const file of files) {
    writeFileSync(file, injectCsp(readFileSync(file, "utf8"), supabaseUrl));
  }
  return files.length;
}

function main() {
  const buildDir = process.argv[2] ?? "build/client";
  const env = loadEnv("production", process.cwd(), "VITE_");
  const supabaseUrl =
    process.argv[3] || env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const count = injectCspInDir(buildDir, supabaseUrl);
  console.log(
    `CSP: ${count} pages, connect-src ${supabaseOrigin(supabaseUrl)}`,
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
