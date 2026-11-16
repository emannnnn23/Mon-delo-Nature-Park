# Pre-render spike results (2026-11-17)

Throwaway spike proving spec section 4 (`ssr: false` + `prerender` + `clientLoader.hydrate`) on the real stack. Nothing from the spike was merged; this file is the only artifact kept. Phase 4 uses the pattern in "The pattern that works" below.

Versions tested: react-router 8.5.1, @react-router/dev 8.5.1, vite 8.3.8, react 19.3.1. Config: `appDirectory: "src"`, `ssr: false`, minimal `src/entry.server.tsx` from Task 1.

## Result summary

| #   | Check                                                                              | Result                                                            |
| --- | ---------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| 4a  | Build, zero detail slugs, detail route has `loader`                                | FAIL (build error, by design)                                     |
| 4b  | Build, zero detail slugs, detail route is `clientLoader`-only                      | PASS                                                              |
| 4c  | Build, zero detail slugs, `loader` kept, at least one slug                         | PASS (this is check 5)                                            |
| 5   | `spike/index.html` contains `>build<`; `spike/a/index.html` has `<title>a</title>` | PASS                                                              |
| 6.1 | `/spike` shows `client` after hydration                                            | PASS                                                              |
| 6.2 | Client nav `/` to `/spike` shows `client`                                          | PASS                                                              |
| 6.3 | `/spike/b` (not pre-rendered) shows `client` and slug `b`                          | PASS                                                              |
| 6.4 | `/spike/missing` renders the error boundary                                        | PASS                                                              |
| (a) | Pre-rendered content stays visible until `clientLoader` resolves, no HydrateFallback | PASS                                                            |
| (b) | `serverLoader()` inside `clientLoader`: works on pre-rendered, fails on non-pre-rendered | PASS (behaves as expected; failure is a catchable `Error`)  |
| -   | Vercel hosting behaviour (see Hosting notes)                                       | PENDING, Phase 5 Task 5. Check 6.3 was validated only under a catch-all host; on Vercel the narrow `/discover/:slug` rewrite must serve late-published slugs, and other unknown paths must give a real 404 |

GATE outcome: gate passed via variant 4b (clientLoader-only detail route builds with zero slugs; 4c, loader plus at least one slug, also builds). The zero-slug decision is decided by ruling R13 (see below); the untested glue is verified in Phase 4. Controller ruling: use loader + clientLoader when at least one published slug exists; when the build-time slug list is empty, `routes.ts` registers the clientLoader-only detail module; Phase 4 adds a zero-slug build test (see "Zero-slug constraint").

## Documentation and source consulted

- `node_modules/react-router/docs/how-to/pre-rendering.md`:
  - With `ssr: false` and `prerender`, "a `loader` is permitted on any route matched by a `prerender` path". `headers`/`action` are prohibited on all routes.
  - SPA fallback file: `build/client/index.html` if `/` is not pre-rendered, `build/client/__spa-fallback.html` if `/` is pre-rendered. Our config pre-renders `/`, so the fallback is **`__spa-fallback.html`** (confirmed in the build output).
  - Fallback renders only the root route, so non-pre-rendered paths get their data at runtime from `clientLoader`.
- `node_modules/react-router/docs/how-to/client-data.md`: `clientLoader.hydrate = true` runs the `clientLoader` during hydration; without a `HydrateFallback` the route component is server-rendered (here: pre-rendered) first and then `clientLoader` runs on hydration, so server and client data should match to avoid hydration errors. `hydrate` is implied when there is no `loader`.
- `node_modules/@react-router/dev/dist/vite.js`, `validateSsrFalsePrerenderExports` (about line 2451): the build-time validation. For every route id not matched by any pre-render path, it errors if the route exports `loader` (message: ``Prerender: 1 invalid route export in `routes/spike.$slug` when pre-rendering with `ssr:false`: `loader` ``). It also walks parent routes: a parent `loader` without `clientLoader` on a non-pre-rendered child is an error. The check is per route module, not per path. Having `clientLoader` alongside `loader` does not exempt the route.
- Same file, prerender postProcess (about line 3662): `/__spa-fallback.html` is always added to the pre-render list when `ssr === false`.

## Check detail and evidence

### Step 4: zero slugs

`prerender: async () => ["/", "/spike", ...slugs.map(...)]` with `slugs = []`:

- 4a, detail route exports `loader` + `clientLoader`: **build fails**. Output:
  ```
  Prerender: 1 invalid route export in `routes/spike.$slug` when pre-rendering with `ssr:false`: `loader`.
  Error: Invalid route exports found when prerendering with `ssr:false`
  ```
  Cause: no pre-render path matches the route, so it has no build-time execution context for `loader`.
- 4b, detail route exports only `clientLoader` (+ `meta`, component, `clientLoader.hydrate`): **build passes**. Output files: `index.html`, `spike.data`, `spike/index.html`, `__spa-fallback.html`.
- 4c, `loader` kept with `slugs = ["a"]`: **build passes**. Output files: `index.html`, `spike.data`, `spike/index.html`, `spike/a.data`, `spike/a/index.html`, `__spa-fallback.html`.

### Step 5: pre-rendered output (slugs = ["a"])

- `build/client/spike/index.html` contains `<p data-testid="src">build</p>`.
- `build/client/spike/a/index.html` contains `<title>a</title>` and `data-testid="src">build</p><p data-testid="slug">a`.
- With JavaScript disabled in the browser, `/spike` shows `build` and `/spike/a` shows `build`, slug `a`, title `a`.
- `react-router typegen && tsc --noEmit` passes for all spike routes, including `serverLoader()` typed inside `clientLoader`.

### Step 6: browser (Chrome 152 via Playwright, headless)

Host used: a tiny static server that mimics a real host rewrite (serve the file if it exists, directory to `index.html`, anything else to `/__spa-fallback.html`). Script and logs lived in the scratchpad (not committed).

| Scenario                                     | Observed                                                                            |
| -------------------------------------------- | ----------------------------------------------------------------------------------- |
| Direct `/spike`, sampled every ~100 ms       | `build` for 0 to ~960 ms, then `client` from ~1090 ms; no console errors/warnings  |
| Client nav `/` to `/spike`                   | `client` (nav waits for `clientLoader`; no `.data` request was made)                |
| Direct `/spike/a`                            | `client`, slug `a`, title `a`                                                       |
| Direct `/spike/b` (fallback served)          | `client`, slug `b`, title `b`; HTTP 200; no errors                                  |
| Client nav `/` to `/spike/b`                 | `client` + `b`                                                                      |
| Direct `/spike/missing`                      | HTTP 200 (fallback file), root `ErrorBoundary` shows "404 / The requested page could not be found." |
| Client nav `/` to `/spike/missing`           | same error boundary                                                                 |

The `clientLoader` in the spike had an added 1 s delay (only to test (a)); the logic otherwise matches the brief.

### (a) No flash to empty on hydration

With `clientLoader.hydrate = true` and **no** `HydrateFallback`, the pre-rendered DOM (`build`) stays in place during hydration and until `clientLoader` resolves, then swaps to `client`. Sampled at ~100 ms steps: `build` through ~960 ms, `client` from ~1090 ms. No empty state, no hydration warning in the console. This relies on the loader data and the client data rendering the same shape (here only the value differed, and that produced no mismatch because hydration renders with the server `loader` data first).

Consequence for Phase 4: do **not** add a `HydrateFallback` to pre-rendered public routes. It would replace the pre-rendered content during hydration. (The content of a pre-rendered `clientLoader`-only route in the HTML was not inspected in this spike.)

### (b) `serverLoader()` as failure fallback inside `clientLoader`

Test route `spike-sl.$slug` (`loader` + `clientLoader` that does `try { await serverLoader() } catch`), `/spike-sl/a` pre-rendered, `/spike-sl/b` not:

- Pre-rendered slug `a`, direct load: returns the pre-rendered loader data (`build`) without a network request (hydration reuses it).
- Pre-rendered slug `a`, client navigation: `serverLoader()` fetches `/spike-sl/a.data`, the pre-rendered data file, and returns `build`. Works.
- Non-pre-rendered slug `b`, direct load and client navigation: `serverLoader()` **rejects**. In the spike host the `.data` URL fell through to the HTML fallback, so the error was `Unable to decode turbo-stream response` (a plain `Error`, catchable). On a real host the `/b.data` request would 404, which is also a rejection. Either way it is an error, not data.

So `serverLoader()` is a usable "last resort" only for pre-rendered slugs, and the `clientLoader` must always `try/catch` it. It must not be relied on for slugs that were published after the build. Phase 4 uses `serverLoader()` only as a try/catch-wrapped failure fallback, never as the data source.

## The pattern that works

`react-router.config.ts`:

```ts
import type { Config } from "@react-router/dev/config";

export default {
  appDirectory: "src",
  ssr: false,
  // an async function (or a plain array) returning the paths; `/` must be listed
  // so the SPA fallback is written as __spa-fallback.html
  prerender: async () => ["/", "/spike", ...slugs.map((s) => `/spike/${s}`)],
} satisfies Config;
```

`src/routes.ts`:

```ts
route("spike", "routes/spike.tsx"),
route("spike/:slug", "routes/spike.$slug.tsx"),
```

List route (`routes/spike.tsx`): `loader` + `clientLoader` with `clientLoader.hydrate = true as const`, **no** `HydrateFallback`:

```tsx
export async function loader() { return { source: "build" }; }
export async function clientLoader() { return { source: "client" }; }
clientLoader.hydrate = true as const;
export default function Spike({ loaderData }: Route.ComponentProps) {
  return <p data-testid="src">{loaderData.source}</p>;
}
```

Detail route (`routes/spike.$slug.tsx`), when at least one slug is pre-rendered:

```tsx
import { data } from "react-router";
export async function loader({ params }: Route.LoaderArgs) { return { source: "build", slug: params.slug }; }
export async function clientLoader({ params }: Route.ClientLoaderArgs) {
  if (params.slug === "missing") throw data(null, { status: 404 });
  return { source: "client", slug: params.slug };
}
clientLoader.hydrate = true as const;
export function meta({ params }: Route.MetaArgs) { return [{ title: params.slug }]; }
```

Types: `Route.ComponentProps`, `Route.LoaderArgs`, `Route.ClientLoaderArgs`, `Route.MetaArgs`, imported from `./+types/<file>` exactly as in v7.

React Router 8 differences from the v7-based plan: none found for this pattern. APIs used are unchanged (`data()`, `clientLoader.hydrate`, `Route.*` types, `prerender` as array or async function, `__spa-fallback.html`). The new details are the strict build-time validation below and `prerender` also accepting `{ paths, concurrency }`.

## Zero-slug constraint (Phase 4 must handle this)

Build-time validation is **per route module**: a route that exports `loader` must be matched by at least one pre-rendered path, else the build fails. Therefore for each public detail route (`/activities/:slug`, `/facilities/:slug`, etc.):

- If the build has at least one published slug, keep `loader` + `clientLoader` (pre-rendered HTML contains the content; better for SEO).
- If there could be zero published slugs, the build breaks. Options, in order of preference:
  1. Keep `loader`, and make `routes.ts` (it can run async code / read the same slug list as `prerender`) register a `clientLoader`-only variant of the detail route module when the slug list is empty. Not built in the spike; the two halves (loader variant, clientLoader-only variant) were each verified separately.
  2. Fail the build with a clear message when there are zero published slugs (acceptable only if seed data guarantees at least one).
  3. Drop `loader` from detail routes permanently (variant 4b, always works) at the cost of no content in the pre-rendered detail HTML.
- The same rule applies to parent routes: a parent `loader` without a `clientLoader` fails the build if a non-pre-rendered child exists.

## Hosting notes

- `npx serve build/client -s` (the brief's command) is **not** a faithful host for this build. It falls back to `index.html`, which is the pre-rendered home page here, and it served the home HTML even for `/spike`. The SPA still worked client-side, but the pre-rendered HTML for `/spike` was not delivered. For the spike checks I used a catch-all host (files and `*/index.html` first, then `/* -> /__spa-fallback.html` with status 200), which is the generic pattern in the React Router docs (`sirv-cli build/client --single __spa-fallback.html`; `_redirects` style `/* /__spa-fallback.html 200`). **Do not use the catch-all as the production pattern.**
- Scope of check 6.3: `/spike/b` (not pre-rendered) rendering `client` + slug `b` was validated **only under a catch-all** fallback host. The production spec differs: Vercel rewrites only `/admin/*` and `/discover/*` to `__spa-fallback.html`, and every other unmatched path gets the prerendered `404.html` with a real 404 status. On Vercel the narrow `/discover/:slug` rewrite is what serves late-published slugs. Unknown `/discover/<slug>` paths are a soft 404 (HTTP 200 + not-found page) by design, because the rewrite returns 200; other unknown paths must be a real 404. Neither the rewrite precedence nor these statuses were verified here; both are to be verified in Phase 5 Task 5.
- The fallback returns HTTP 200 for unknown slugs, so a non-existent slug shows the 404 error boundary only after the `clientLoader` throws `data(null, { status: 404 })`; the HTTP status stays 200 and the page is soft-404. Real HTTP 404 behaviour on Vercel (narrow rewrites plus `404.html`): **pending, Phase 5 Task 5**.
- `__spa-fallback.html` body is empty (`<body>` then scripts only), because the root route has no `HydrateFallback`. Non-pre-rendered slugs therefore show a blank page until `clientLoader` resolves. Phase 4 may want a root-level `HydrateFallback` for the fallback shell, but it applies only to the root route and must not be added to pre-rendered public routes.

## Spike environment deviations (for the record)

- The spike worktree was created at `<scratchpad>/spike-prerender` instead of `.claude/worktrees/spike-prerender` because the tool sandbox refused `git worktree add` outside the session worktree. It was removed afterwards along with the branch `spike/prerender`.
- Playwright's Chromium download failed (network), so the browser check used the system Google Chrome 152 through Playwright (`executablePath`).
- `playwright` and `serve` were installed in a scratch directory outside the repo, not as project dependencies.
