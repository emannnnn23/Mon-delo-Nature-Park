# Phase 4 — Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Public pages are pre-rendered with real published CMS content and refreshed live in the browser. The contact form stores messages. Loading, error and empty states are handled, and the SEO, sitemap and CSP output is correct and tested.

**Architecture:** `services/content.ts` holds one fetcher per page; each returns domain types through pure row→domain mappers. `lib/routeData.ts` wraps the fetchers for the build-time `loader` (production fails hard; local and preview fall back to placeholders) and for the `clientLoader` (live, with `hydrate = true`). It follows **exactly** the pattern recorded in `docs/superpowers/notes/2026-11-17-prerender-spike.md`. Post-build scripts generate the sitemap and inject a hash-based CSP.

**Tech Stack:** React Router 7 pre-rendering, Supabase JS v2, Node scripts (ESM), Vitest.

**Spec:** `docs/superpowers/specs/2026-11-17-mondelos-website-design.md`. The sections used here are §4, §6, §9.3, §9.7 and §10.

## Global Constraints

Everything in [README → Global Constraints](README.md#global-constraints-apply-to-every-task-in-every-phase) applies. In addition:
- **Public routes never define `HydrateFallback`.** Admin routes may.
- **Public `clientLoader`s never call `serverLoader()` for their data.** It is used only as the failure fallback inside `loadForClient`.

## Review Focus
1. **The Supabase project is paused or unreachable when a visitor loads the site.** The pre-rendered content stays on screen, and a failed refresh is silent and logged to the console. It must never blank the page. → Task 2 tests it.
2. **A production build with Supabase unreachable** must fail with a clear message, never ship placeholders. A preview build must succeed with placeholders. → Task 2 tests it.
3. **An attraction published after the last deploy.** `/discover/<new-slug>` must work via the SPA fallback. → Task 2, and the build test in Task 5.
4. **A double-clicked contact submit** must send exactly one message. → Task 3 tests it.
5. **A published row whose image was deleted** (`media_id` null after a manual DB edit) must render the placeholder, not crash. → Task 1 tests it.

---

### Task 1: Public content services and mappers

**Files:**
- Create: `src/services/mappers.ts`, `src/services/content.ts`
- Test: `src/services/mappers.test.ts`, `src/services/content.test.ts`

**Interfaces:**
- Consumes: `getSupabase()`, `publicMediaUrl` (Phase 2 Task 2), the domain types (Phase 1 Task 11), `isWithinWindow` (Phase 2 Task 3).
- Produces in `mappers.ts`: `toMediaAsset(row | null): MediaAsset | null`, `toSettings`, `toPageSection`, `toAttraction`, `toGalleryImage`, `toTestimonial`, `toAnnouncement` and `toFaq`. Each is pure. `variants` jsonb keys are parsed to numbers.
- Produces in `content.ts` (each takes an optional `client` for tests; each query selects only published rows **and** orders by `sort_order`, so it does not rely only on RLS for ordering or visibility on the client):
  - `getSiteChrome(): Promise<{ settings: SiteSettings; announcement: Announcement | null }>`
  - `getHomeContent(): Promise<HomePageProps>`
  - `getDiscoverContent(): Promise<DiscoverPageProps>`
  - `getAttractionBySlug(slug: string): Promise<Attraction | null>`
  - `listPublishedAttractionSlugs(): Promise<string[]>`
  - `getGalleryContent(): Promise<{ intro: PageSection | null; categories: GalleryCategory[]; images: GalleryImage[] }>`
  - `getAboutContent(): Promise<{ sections: PageSection[] }>`
  - `getVisitContent(): Promise<{ sections: PageSection[]; faqs: Faq[] }>`
  - Media is embedded with Supabase foreign-table selects (for example `cover:media!attractions_cover_media_id_fkey(*)`).
  - Errors throw `ContentError(message, cause)`.

- [ ] **Step 1: Write the failing tests.**
  - `toMediaAsset({ variants: { '960':'a', '480':'b' }, focal_x: 30, … })` has `variants` `{480:'b',960:'a'}` and `focalX` 30.
  - **Review Focus #5:** `toAttraction` with `cover: null` → `cover: null`, and `HomePage` rendered with it shows "Photo coming soon".
  - `getHomeContent(fakeClient)`: assert the fake received `.eq('is_published', true)` and `.order('sort_order')` for attractions; experiences have `kind = 'experience'`; featured attractions have `is_featured = true`, `kind = 'attraction'`, limit 3.
  - `getAttractionBySlug('nope')` with the fake returning no row → `null`.
  - A fake returning `{ error }` → rejects with `ContentError`.
- [ ] **Step 2:** Run `npx vitest run src/services/mappers.test.ts src/services/content.test.ts`. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run the same command. Expected: PASS.
- [ ] **Step 5: Commit:** `feat: public content services and row mappers`.

---

### Task 2: Build/client loader wiring and pre-render list

**Files:**
- Create: `src/lib/routeData.ts`
- Modify: `react-router.config.ts`; `src/routes/_public.tsx`, `home.tsx`, `discover.tsx`, `discover.$slug.tsx`, `gallery.tsx`, `about.tsx`, `visit.tsx`
- Test: `src/lib/routeData.test.ts`, `src/routes/public-loaders.test.tsx`

**Interfaces:**
- Produces in `routeData.ts`:
  - `loadForBuild<T>(fetcher: () => Promise<T>, fallback: T, env = process.env): Promise<T>`.
    - Production is `env.VERCEL_ENV === 'production'`. There, a missing Supabase env or any rejection throws `Error('Production build: could not load content from Supabase — refusing to ship placeholder content. ' + cause)`.
    - Otherwise it logs a warning and returns `fallback`.
  - `loadForClient<T>(fetcher: () => Promise<T>, fallback?: () => Promise<T>): Promise<T>`. On rejection, it `console.warn`s once. Then, if a `fallback` is given, it returns `await fallback()`. If there is no fallback, or the fallback also rejects, it rethrows the original error (which reaches the route ErrorBoundary).
  - The pattern for every public route:
    - `loader = () => loadForBuild(fetchX, placeholdersX)`;
    - `clientLoader = ({ serverLoader }) => loadForClient(fetchX, () => serverLoader())`;
    - `clientLoader.hydrate = true as const`.
  - The build-time snapshot (`serverLoader`) is therefore used **only** when the live fetch fails. The detail route passes no fallback for slugs that weren't pre-rendered. **Adjust this to the exact exports the spike proved.**
- Produces: `react-router.config.ts`
  - `prerender: async () => ['/', '/discover', '/gallery', '/about', '/visit', '/404', ...(await listSlugsForBuild()).map(s => '/discover/' + s)]`.
  - `listSlugsForBuild` uses `loadForBuild(listPublishedAttractionSlugs, placeholders.attractions.filter(a => a.kind === 'attraction').map(a => a.slug))`.
  - The detail route follows the variant from the spike notes for the case of zero slugs.

- [ ] **Step 1: Write the failing tests.**
  - **Review Focus #2:** `loadForBuild(reject, fb, { VERCEL_ENV: 'production', VITE_SUPABASE_URL: 'https://x', VITE_SUPABASE_ANON_KEY: 'k' })` rejects with a message containing "refusing to ship placeholder". `loadForBuild(reject, fb, { VERCEL_ENV: 'preview' })` resolves `fb`.
  - **Review Focus #1:** `loadForClient(reject, () => Promise.resolve(prev))` resolves `prev` and calls `console.warn` once. `loadForClient(reject)` rejects with the original error.
  - `public-loaders.test.tsx`: with `createRoutesStub` and a mocked `getHomeContent` resolving changed content, the home route shows the changed heading after the client loader runs. With it rejecting after the initial data, the original heading stays.
  - **Review Focus #3:** the detail route's `clientLoader` for slug `new-one` calls `getAttractionBySlug('new-one')` (mocked) and renders its name.
- [ ] **Step 2:** Run `npx vitest run src/lib/routeData.test.ts src/routes/public-loaders.test.tsx`. Expected: FAIL.
- [ ] **Step 3:** Implement and wire every public route plus `_public.tsx` (`getSiteChrome`).
- [ ] **Step 4:** Run the same command, then `npm run build` (local, no env). Expected: PASS, and `build/client/discover/<placeholder-slug>/index.html` exists.
- [ ] **Step 5: Commit:** `feat: pre-rendered pages with live client refresh from Supabase`.

---

### Task 3: Contact form submission

**Files:**
- Create: `src/services/contact.ts`
- Modify: `src/routes/visit.tsx`, `src/components/forms/ContactForm.tsx`
- Test: `src/services/contact.test.ts`, modify `src/components/forms/contact-form.test.tsx`

**Interfaces:**
- Consumes: `ContactInput` and `ContactForm` (Phase 2 Task 7); `submit_contact_message` (Phase 1 Task 9).
- Produces: `submitContactMessage(input: ContactInput & { honeypot: string; elapsedMs: number }, client?): Promise<'ok' | 'rate_limited' | 'error'>`.
  - It calls `rpc('submit_contact_message', { p_full_name, p_email, p_phone: input.phone ?? null, p_subject, p_message, p_honeypot, p_elapsed_ms })`.
  - Result `'ok'` → `'ok'`. Error `P0001` with message `rate_limited` → `'rate_limited'`. Anything else → `'error'` (logged with `console.error`, without the message body).

- [ ] **Step 1: Write the failing tests.**
  - The service maps the fake RPC results as described above, and it passes `p_phone: null` when `phone` is undefined.
  - **Review Focus #4:** in the form, `userEvent.dblClick(submit)` (or two rapid clicks) results in `onSubmit` being called exactly once.
- [ ] **Step 2:** Run `npx vitest run src/services/contact.test.ts src/components/forms`. Expected: FAIL.
- [ ] **Step 3:** Implement. The form guards against duplicates with a `submittingRef`, not only the disabled state.
- [ ] **Step 4:** Run the same command. Expected: PASS.
- [ ] **Step 5: Manual check against local Supabase.** Submit once from `/visit` in `npm run dev`. The row appears in the admin Messages inbox. Stop the server and Supabase.
- [ ] **Step 6: Commit:** `feat: contact form stores messages via validated RPC`.

---

### Task 4: Loading, error and empty states

**Files:**
- Modify: `src/root.tsx` (`ErrorBoundary`), `src/routes/_public.tsx` (route `ErrorBoundary`), admin pages (loading skeletons), `src/components/layout/PublicLayout.tsx` (navigation progress bar)
- Test: `src/routes/error-states.test.tsx`

**Interfaces:**
- **Public `ErrorBoundary`:**
  - A 404 response renders the `not-found` page.
  - Any other error renders "We couldn't load this page" with a "Try again" button (`revalidator.revalidate()`) and a link Home, inside `PublicLayout` with the placeholder settings.
- **Navigation:** a 2px gold progress bar across the top while `useNavigation().state !== 'idle'`. It is static (no animation) under reduced motion.
- **Admin:** every list page shows a 3-row skeleton while loading and an error panel with Retry on failure.

- [ ] **Step 1: Write the failing tests.**
  - A route whose `clientLoader` throws `new Error('x')` with no previous data renders "We couldn't load this page" and a "Try again" button.
  - A thrown 404 renders "Page not found".
  - An admin list with the fake pending shows 3 elements with `data-testid="skeleton-row"`.
- [ ] **Step 2:** Run `npx vitest run src/routes/error-states.test.tsx`. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run the same command. Expected: PASS.
- [ ] **Step 5: Commit:** `feat: loading, error and empty states across public and admin`.

---

### Task 5: SEO assets — meta, JSON-LD, robots, sitemap, bundle split

**Files:**
- Create: `scripts/generate-sitemap.mjs`, `public/robots.txt`, `public/favicon.svg`, `src/lib/jsonLd.ts`
- Modify: every public route's `meta` (via `buildMeta`), `src/routes/home.tsx` (JSON-LD `<script type="application/ld+json">`), `package.json` (`"build": "react-router build && node scripts/generate-sitemap.mjs && node scripts/inject-csp.mjs"`; the CSP script arrives in Task 6, so until then it is a no-op file)
- Test: `src/lib/jsonLd.test.ts`, `tests/build/output.test.ts` (runs against an existing `build/client`; skipped with a clear message if the folder is missing)

**Interfaces:**
- Produces: `touristAttractionJsonLd(settings: SiteSettings, siteUrl: string): object`. `@type: 'TouristAttraction'`, `name`, `address` (`PostalAddress` with `streetAddress`, `addressLocality: 'Kawayan'`, `addressRegion: 'Biliran'`, `addressCountry: 'PH'`), `geo` when lat/lng are set, `aggregateRating` (`ratingValue` 4.6, `reviewCount` 70) when both are set, `url`, and `sameAs` (non-null socials).
- Produces: `scripts/generate-sitemap.mjs [buildDir=build/client] [siteUrl=$VITE_SITE_URL]`. It walks the `index.html` files under `buildDir`, excluding `404` and `__spa-fallback`, and writes `sitemap.xml` with `<loc>` entries (paths with trailing slashes removed) and `<lastmod>` = build date.
- `robots.txt`: `User-agent: *`, `Disallow: /admin`, and `Sitemap: https://<site>/sitemap.xml`. The real domain is written at deploy (Phase 5); until then it uses the `VITE_SITE_URL` default.
- **Per-page meta titles:**
  - Home: the site default.
  - "Discover the Park"
  - "Gallery"
  - "About the Park"
  - "Visit Us"
  - Attraction: the attraction's name, with its summary as the description and its cover as `og:image` (the 1600 variant URL).

- [ ] **Step 1: Write the failing tests.**
  - `jsonLd`: with seed settings, `aggregateRating.ratingValue === 4.6` and `reviewCount === 70`. With `googleRating: null`, there is no `aggregateRating`.
  - `tests/build/output.test.ts` (after `npm run build` with no env):
    - `build/client/index.html` contains `<title>Mondelos Nature Park — Kawayan, Biliran</title>`, `property="og:title"`, and the text "Find Your Peace" (pre-rendered content);
    - `build/client/gallery/index.html` contains `<title>Gallery · Mondelos Nature Park</title>`;
    - `sitemap.xml` contains `/discover` and `/gallery` but not `/admin` or `/404`;
    - `robots.txt` contains `Disallow: /admin`;
    - no JS file referenced by `build/client/index.html` contains the string `MediaLibraryPage` (the admin code is split out).
- [ ] **Step 2:** Run `npm run build && npx vitest run src/lib/jsonLd.test.ts tests/build`. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run the same command. Expected: PASS.
- [ ] **Step 5: Commit:** `feat: per-page meta, JSON-LD, robots and sitemap`.

---

### Task 6: CSP injection and Vercel config

**Files:**
- Create: `scripts/inject-csp.mjs`, `vercel.json`
- Test: `scripts/inject-csp.test.ts` (unit, on an HTML fixture), extend `tests/build/output.test.ts`

**Interfaces:**
- Produces: `buildCsp({ scriptHashes: string[]; supabaseUrl: string }): string` (exported from `scripts/inject-csp.mjs`):

```
default-src 'self'; script-src 'self' <'sha256-…' list>; style-src 'self' 'unsafe-inline';
img-src 'self' data: blob: <supabaseUrl>; font-src 'self'; connect-src 'self' <supabaseUrl> <supabaseUrl wss>;
frame-src https://www.google.com; base-uri 'self'; form-action 'self'; object-src 'none'
```

  - `style-src 'unsafe-inline'` is allowed: React style attributes such as `objectPosition` need it, and the risk is low.
  - `frame-ancestors` cannot be set in a meta tag; it goes in the `vercel.json` header.
- Produces: `injectCsp(html: string, supabaseUrl: string): string`. It hashes (SHA-256, base64) every inline `<script>` body, including `type="application/ld+json"` (harmless), and inserts the `<meta http-equiv="Content-Security-Policy" content="…">` as the first child of `<head>`. The CLI rewrites every `.html` file under `build/client`. Without `VITE_SUPABASE_URL` it uses `http://127.0.0.1:55321`.
- Produces: `vercel.json`
  - `"rewrites": [{ "source": "/admin/:path*", "destination": "/__spa-fallback.html" }, { "source": "/discover/:slug", "destination": "/__spa-fallback.html" }]`. Use the fallback filename recorded by the spike. Pre-rendered files take precedence over rewrites on Vercel; confirm this in Phase 5 Task 5.
  - `"headers"`: for all paths, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`, and `Content-Security-Policy: frame-ancestors 'none'`. For `/assets/(.*)`: `Cache-Control: public, max-age=31536000, immutable`.
  - `"cleanUrls": true`, `"trailingSlash": false`.

- [ ] **Step 1: Write the failing tests.**
  - `injectCsp('<html><head></head><body><script>console.log(1)</script></body></html>', 'https://x.supabase.co')` contains `'sha256-` + the base64 SHA-256 of `console.log(1)`, and `connect-src 'self' https://x.supabase.co wss://x.supabase.co`.
  - The build output test: for every `.html` in `build/client`, every inline script's hash is present in that file's CSP meta tag.
  - `vercel.json` parses, and its headers include `frame-ancestors 'none'`.
- [ ] **Step 2:** Run `npx vitest run scripts tests/build` (after `npm run build`). Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run `npm run build && npx vitest run scripts tests/build`. Expected: PASS.
- [ ] **Step 5: Check hydration under the CSP in a real browser.** Run `npx serve build/client -s -l 4173` in the background, open `/` in Playwright Chromium, and assert zero console errors containing "Content Security Policy". Then stop the server.
- [ ] **Step 6:** Run `npm run typecheck && npm run lint && npm run format:check && npm test`. Expected: all exit 0.
- [ ] **Step 7: Finish the phase.** Commit `feat: hash-based CSP and Vercel routing/headers`. Write the phase report, **ask the developer**, push, and open the PR.
