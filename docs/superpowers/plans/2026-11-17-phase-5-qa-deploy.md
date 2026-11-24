# Phase 5 — Quality Assurance & Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prove the whole site works, accessibly and fast, then put the demo live on Vercel with production Supabase settings, a daily rebuild, and handover docs.

**Architecture:**
- Playwright smoke and axe tests run only in CI.
- The developer does the Vercel and Supabase dashboard work, following exact click paths; the agent never handles secrets.
- A scheduled GitHub Actions workflow calls a Vercel Deploy Hook.

**Tech Stack:** Playwright, `@axe-core/playwright`, Lighthouse CLI, GitHub Actions, Vercel, Supabase.

**Spec:** `docs/superpowers/specs/2026-11-17-mondelos-website-design.md`. The sections used here are §4 (rebuilds and Vercel routing), §9.4, §10, §12 and §13.

## Global Constraints

Everything in [README → Global Constraints](README.md#global-constraints-apply-to-every-task-in-every-phase) applies. In addition:
- **Developer-only steps** are marked **[Developer]**. The agent writes the instructions and waits; it never asks for a token, password or hook URL in chat.
- **Dashboard labels change over time.** Confirm the current label at the time, and update the click path in `docs/admin-setup.md` if it differs.

## Carried from Phase 3 (binding)
- **`is_admin()` resilience.** If the hosted `postgres` role ever loses read access to `auth.sessions`, `is_admin()` raises an error inside the public read policies and the site goes down. Either add a smoke test after every deploy, or wrap the check in plpgsql so that `insufficient_privilege` returns false.
- **Keep `/admin` out of search engines.** Add `Disallow: /admin` to `robots.txt` and an `X-Robots-Tag: noindex` header on the SPA fallback for `/admin/*`.
- **Admin robustness.**
  - When an admin's session is revoked server-side, show the "expired" message, not "no access". Read their own profile to tell the two apart.
  - A `NO_ROWS` result caused by deletion in another tab should not say "session expired".
  - Reordering rows that share the same `sort_order` must work (three or more tied rows).
  - Set an explicit limit and pagination on `listMedia`, so the 1000-row cap never cuts the list silently.
  - Add a `mailto:` reply link in Messages.
  - Show a "Philippine time" hint on announcement times.
- **Admin accessibility and polish.**
  - Gallery: a banner for dirty captions hidden by the filter; re-derive a category slug that has been cleared; tile labels that don't repeat the alt text; "Unsaved" as `role=status`.
  - Section editors: dismiss the "restored" banner after reverting; check the number of landmarks.
  - Attractions: a name made only of symbols should leave the slug empty; tabs should not share one `aria-controls`.
  - Announcements: clear dependent field errors when a related field changes; refresh status chips on a timer.
  - Dashboard: structured links for missing items.
  - FocalPointPicker: add range inputs.
  - Media library: block or announce closing the upload panel mid-upload.
  - Media: before rollback, check whether the row already exists.
  - Shared: make the `guardSuspended` counter work; CrudList refocus timing; PublishToggle accessible name.
  - pgTAP: negative update tests for tab characters and `//` links.

## Carried from Phase 2 (binding)
- **Content Security Policy.** Components use inline `style` attributes: `objectPosition`, animation delays, gallery `aspectRatio` and the star widths. The CSP must allow style attributes, either through `style-src-attr 'unsafe-inline'` or as part of the planned `style-src 'unsafe-inline'`.
- **Accessibility polish.**
  - One error summary instead of `role="alert"` on every field.
  - A pause/play control on the testimonial slider (WCAG 2.2.2).
  - `inert` on the background while a dialog is open.
  - Move focus to `main` or the `h1` after a route change.
  - A visible hint that image buttons open the photo viewer.
  - A clearer skip-link focus ring on the forest header.
  - Tests for `overHero` and the `data-surface` attributes.
  - Check list semantics in Safari.
- **Design tokens.** Replace the remaining hard-coded hex colours (`AttractionCard` and `ExperienceCard` `#fdfbf6`, `MapsCard`, `Logo`, `LeafDecor`) and the red error utilities with `card` and `error` tokens.
- **Performance.** Consider `zod/mini`: the visit chunk is about 89 KB minified. Skip the `useInView` observer when reduced motion is on.
- **Screenshot size.** `docs/superpowers/notes/phase-2-screenshots` adds about 8.6 MB. Decide whether to keep these in git.

## Review Focus
1. **A first-time visitor on a slow 4G phone** must see the hero heading quickly (LCP under 2.5 s on Lighthouse mobile), and the page must not jump as images load (CLS under 0.1). → Task 3 measures it.
2. **A deep link shared on Facebook to `/discover/<slug>`** must show that attraction's title and image in the preview. → Task 5 checks it with the Facebook Sharing Debugger.
3. **A mistyped URL on the live site** must return a real HTTP 404, not a 200. → Task 5 checks it.
4. **Someone trying to sign up through the Supabase API directly**, bypassing the UI, must be rejected. → Task 5 checks it.
5. **A screen-reader user moving through the homepage** must find landmarks, one `h1`, a labelled form, and no axe violations. → Task 2 tests it.

---

### Task 1: Playwright smoke tests in CI

**Files:**
- Create: `playwright.config.ts`, `e2e/smoke.spec.ts`
- Modify: `.github/workflows/ci.yml` (adds an `e2e` job), `package.json` (`"test:e2e": "playwright test"`)

**Interfaces:**
- **Config:** `webServer` runs `npx serve build/client -s -l 4173`; `baseURL` is `http://localhost:4173`. Two projects: `mobile` (viewport 375×812, `hasTouch`) and `desktop` (1440×900). Chromium only.
- **The `e2e` job:** `supabase start` (which seeds; not `supabase db start`, which has no API gateway), then build with `VITE_SUPABASE_URL=http://127.0.0.1:55321` and the local anon key printed by `supabase status -o env` (a local, non-secret key; this project's API runs on port 55321), then `npx playwright install --with-deps chromium`, then `npm run test:e2e`. Upload the `playwright-report` artifact when the job fails.

- [ ] **Step 1: Write the specs** in `e2e/smoke.spec.ts`:
  - The home page has the `h1` "Find Your Peace in Nature." and 4 "Sample" experience cards.
  - Every nav link reaches a page with a single `h1`. On mobile, the menu opens, a link click navigates, and the menu closes.
  - `/gallery`: clicking the first image opens a dialog, Escape closes it.
  - `/visit`: submitting empty shows errors. A valid submit shows the success text. A 4th submit from the same email shows the rate-limit text.
  - `/admin`: redirects to `/admin/login`. Wrong credentials show "Incorrect email or password."
  - `/discover/not-a-real-place`: shows "Page not found".
- [ ] **Step 2: Check it locally.** Run `npx playwright test --list`. Expected: the specs are listed for both projects. The full run happens in CI only, per README.
- [ ] **Step 3: Commit:** `test(e2e): smoke tests for public pages, contact form and admin guard`.
- [ ] **Step 4:** Push the branch. **Ask the developer before the first push of this phase.** Read the CI result for the `e2e` job and fix any failures (`fix: …` commits). Report the CI run URL and its result.

---

### Task 2: Accessibility audit

**Files:**
- Create: `e2e/a11y.spec.ts`
- Modify: whichever components the findings require

- [ ] **Step 1: Write the spec.** For `/`, `/discover`, `/discover/<first-slug>`, `/gallery`, `/about`, `/visit` and `/admin/login` (desktop and mobile), run `new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze()` and expect `violations` toEqual `[]`. Also check (Review Focus #5) that each page has exactly one `h1`, plus `header`, `nav`, `main` and `footer` landmarks.
- [ ] **Step 2: Review manually.** Use the `design:accessibility-review` skill on the Phase 2 screenshots. Check keyboard-only on the home page: the tab order follows the visual order, focus is always visible, and the slider, lightbox and menu are operable.
- [ ] **Step 3: Fix and verify.** Fix each finding with its own commit (`fix(a11y): …`), then push and confirm the CI `e2e` job is green.

---

### Task 3: Performance pass

**Files:**
- Create: `docs/superpowers/notes/phase-5-lighthouse.md`
- Modify: whatever the findings require (image `sizes`, preloads, font subsets)

- [ ] **Step 1: Measure.** Use a Vercel **preview** deployment once Task 5 Step 3 exists, or `npx serve build/client` locally if it doesn't yet. Run `npx lighthouse <url> --preset=perf --form-factor=mobile --output=json --output-path=<scratchpad>/lh-home.json --quiet` once for `/`, `/gallery` and `/discover`.
- [ ] **Step 2: Record and compare.** Write LCP, CLS, TBT and the Performance score to the notes file. **Targets:** LCP < 2.5 s, CLS < 0.1, Performance ≥ 90.
- [ ] **Step 3: Fix any misses.** Typical causes are a missing hero preload, wrong `sizes`, an un-lazy map iframe, or font blocking. Re-measure once and record the result. If a target still fails, say so in the report with the reason. Do not claim it passed.
- [ ] **Step 4: Commit:** `perf: …` for the fixes and `docs: lighthouse results` for the notes.

---

### Task 4: Responsive and visual sign-off

- [ ] **Step 1: Capture screenshots.** Re-run the Phase 2 Task 8 screenshot script (375/768/1024/1440, every public page), this time with live local CMS data that includes at least one real uploaded image. Also capture `/admin`, `/admin/attractions`, an attraction form and `/admin/messages` at 375 and 1440.
- [ ] **Step 2: Review against the checklist.**
  - The hero crop keeps its subject on phones (the focal point works).
  - No horizontal scroll at 375.
  - Cards and spacing match the reference.
  - Admin forms are usable at 375 (no clipped inputs, tap targets ≥ 44px).

  Fix the issues, then save the final screenshots to `docs/superpowers/notes/phase-5-screenshots/`.
- [ ] **Step 3: Commit:** `fix(ui): …` for each fix and `docs: phase 5 screenshots`. Stop the servers.

---

### Task 5: Production setup and deployment

**Files:**
- Create: `.github/workflows/rebuild.yml`, `docs/deployment.md`
- Modify: `public/robots.txt` (real domain), `docs/admin-setup.md`, `.env.example` (adds `VITE_SITE_URL`)

- [ ] **Step 1: [Developer] Configure the Supabase production project.** In Supabase Dashboard → (Mondelos project):
  - **Authentication → Sign In / Providers →** turn off "Allow new users to sign up".
  - **Authentication → URL Configuration →** set the Site URL to the Vercel URL, and add `https://<vercel-domain>/admin/**` to Redirect URLs.
  - **Advisors → Security Advisor →** run it and confirm there are 0 errors. The agent records any warnings in the report.
- [ ] **Step 2: [Developer] Apply the database and create the admin.**
  - Run `npx supabase db push`.
  - If the seed hasn't been applied yet, run `supabase/seed.sql` once in **SQL Editor**.
  - Create the demo admin with `docs/admin-setup.md`.
- [ ] **Step 3: [Developer] Create the Vercel project.**
  - Vercel Dashboard → **Add New… → Project** → Import Git Repository `emannnnn23/Mon-delo-Nature-Park`. The Framework Preset is "React Router" (if it isn't detected: build command `npm run build`, output directory `build/client`).
  - **Environment Variables** (Production and Preview): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (publishable key from Supabase → Project Settings → API Keys) and `VITE_SITE_URL` (`https://<vercel-domain>`).
  - Deploy.
- [ ] **Step 4: [Developer] Create the deploy hook and the GitHub secret.**
  - Vercel → Project → **Settings → Git → Deploy Hooks**: name `daily-rebuild`, branch `main` → Create, and copy the URL.
  - GitHub → repo → **Settings → Secrets and variables → Actions → New repository secret**: name `VERCEL_DEPLOY_HOOK_URL`, paste the URL.
- [ ] **Step 5: Write `rebuild.yml`.** Triggers: `schedule: - cron: '0 19 * * *'` (03:00 Asia/Manila) and `workflow_dispatch`. One step: `curl -fsS -X POST "$HOOK"`, with `HOOK: ${{ secrets.VERCEL_DEPLOY_HOOK_URL }}`. Commit: `ci: daily rebuild via Vercel deploy hook`.
- [ ] **Step 6: Run the production smoke checklist** against the live URL, recording each result in `docs/deployment.md`:
  - `/`, `/discover`, `/gallery`, `/about` and `/visit` load over HTTPS with live content.
  - **Review Focus #3:** `curl -s -o /dev/null -w '%{http_code}' https://<domain>/definitely-not-here` prints `404`. This closes the spike's pending check. `/admin` and `/discover/<a-new-slug>` load via the fallback (200).
  - **Review Focus #2:** paste `https://<domain>/discover/<slug>` into the Facebook Sharing Debugger (developers.facebook.com/tools/debug). The preview shows the attraction's title and image. Record the result.
  - **Review Focus #4:** `curl -s -X POST "$SUPABASE_URL/auth/v1/signup" -H "apikey: <publishable key>" -H 'Content-Type: application/json' -d '{"email":"probe@example.com","password":"Probe-12345!"}'` returns an error saying sign-ups are disabled. The developer runs this; the key is public, but do not paste it into committed files.
  - Admin login works. Edit a section, then reload the public page: the change shows without a rebuild. Upload a photo from the developer's phone (iPhone if available; this checks the Safari JPEG fallback).
  - Submit the contact form → the message appears in the inbox.
  - Response headers include `X-Content-Type-Options` and `frame-ancestors`. The page has the CSP meta tag, and the browser console shows no CSP errors.
  - `https://<domain>/robots.txt` and `/sitemap.xml` are served.
  - Run "Daily rebuild" from GitHub Actions by hand → a new Vercel deployment appears.
- [ ] **Step 7: Write `docs/deployment.md`.** Cover: environments, env vars (names only), how to redeploy, how to roll back (Vercel → Deployments → ⋯ → Promote to Production), how database changes reach production (`supabase db push`), and the smoke checklist with today's results.
- [ ] **Step 8: Domain (optional, when the client supplies one).** [Developer] Vercel → Project → **Settings → Domains → Add** → follow the DNS records shown. Then update `VITE_SITE_URL`, the Supabase Site URL and `robots.txt`, redeploy, and confirm HTTPS.
- [ ] **Step 9: Close out the project.**
  - Run `npm run typecheck && npm run lint && npm run format:check && npm test && npm run build`. Expected: all exit 0.
  - Commit `docs: deployment guide and production smoke results`.
  - Write the final phase report. Its outstanding items must include the client checklist status and the deferred work: migrating CI to apply migrations automatically, transferring the projects to the client, and the optional in-admin rebuild button.
  - **Ask the developer**, push, and open the PR. Use `superpowers:finishing-a-development-branch`.
