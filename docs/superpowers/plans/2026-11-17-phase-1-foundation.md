# Phase 1 — Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A scaffolded React Router v7 + Tailwind 4 project with tooling and CI, a proven pre-render approach, design tokens, and the complete Supabase schema with explicit RLS, storage, seed data and pgTAP tests.

**Architecture:** The React Router framework app lives in `src/` with `ssr: false` and pre-rendering. The database is defined entirely in version-controlled migrations, one concern per file. Every table's grants and policies are explicit, and pgTAP tests check them for anon, a non-admin and an admin.

**Tech Stack:** React 19, React Router 7, Vite, TypeScript, Tailwind 4, Vitest, Supabase CLI, Postgres 15+, pgTAP.

**Spec:** `docs/superpowers/specs/2026-11-17-mondelos-website-design.md`. The sections used here are §3, §4, §5.2, §7, §9 and §11.

## Global Constraints

Everything in [README → Global Constraints](README.md#global-constraints-apply-to-every-task-in-every-phase) applies. In addition:
- Migration files are named `supabase/migrations/20261117000NNN_<concern>.sql`, with one concern per file.
- pgTAP test files are named `supabase/tests/NNNNN_<concern>.test.sql`. Each wraps itself in `begin; select plan(n); … select * from finish(); rollback;`.

## Review Focus
1. **A table is added later without RLS or grants.** Expect the suite to fail, not the table to be silently open. → Task 5 adds a catch-all guard test.
2. **A non-admin authenticated user** (anyone who gets an account somehow) **tries to promote themselves** by updating or inserting `profiles`. Expect this to be rejected. → Task 5 tests it.
3. **An announcement whose `ends_at` is in the past but is still `is_published`** must not be readable by anon. → Task 8 tests it.
4. **Deleting a `media` row that is still referenced** must fail with a foreign-key violation, not leave broken images. → Task 6 tests it.
5. **`attraction_images` for an unpublished attraction** must not be readable by anon, even though the image row itself has no publish flag. → Task 7 tests it.

---

### Task 1: Scaffold, tooling and env parsing

**Files:**
- Create: `package.json`, `react-router.config.ts`, `vite.config.ts`, `tsconfig.json`, `eslint.config.js`, `.prettierrc.json`, `.prettierignore`, `.gitignore`, `.env.example`, `src/root.tsx`, `src/routes.ts`, `src/routes/home.tsx` (temporary hello page), `src/app.css`, `src/test/setup.ts`, `src/lib/env.ts`, `README.md`
- Test: `src/lib/env.test.ts`

**Interfaces:**
- Produces: `getPublicEnv(source?: Record<string, string | undefined>): PublicEnv | null` in `src/lib/env.ts`, where `type PublicEnv = { supabaseUrl: string; supabaseAnonKey: string }`.
  - Returns `null` when either value is missing or empty.
  - Throws `Error('VITE_SUPABASE_URL must be an https URL')` when the URL is not https. `http://127.0.0.1` and `http://localhost` are allowed for local Supabase.
  - The default `source` is `import.meta.env`.
- Produces: npm scripts `dev`, `build`, `typecheck` (`react-router typegen && tsc --noEmit`), `lint`, `format`, `format:check`, `test` (`vitest run`), `test:watch`, `test:db` (`supabase test db`).

- [ ] **Step 1: Generate the template.** Run `npx create-react-router@latest /tmp/mondelo-scaffold --no-git-init --no-install` (the default template already includes Tailwind 4 and TypeScript). Move its files into the repo root, rename `app/` to `src/`, and set `appDirectory: "src"`, `ssr: false` and `prerender: ["/"]` in `react-router.config.ts`. Delete the template's demo/welcome content.
- [ ] **Step 2: Install dependencies.**
  - Runtime: `@supabase/supabase-js zod lucide-react @fontsource/playfair-display @fontsource-variable/dm-sans`.
  - Dev: `vitest jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom typescript-eslint eslint-plugin-react-hooks eslint-plugin-jsx-a11y prettier prettier-plugin-tailwindcss supabase`.
  - Add the `test` block to `vite.config.ts`: `environment: 'jsdom'`, `setupFiles: ['src/test/setup.ts']`, `include: ['src/**/*.test.{ts,tsx}', 'tests/**/*.test.ts']`.
- [ ] **Step 3: Write the failing test** `src/lib/env.test.ts`:

```ts
it('returns null when values are missing', () => {
  expect(getPublicEnv({})).toBeNull();
  expect(getPublicEnv({ VITE_SUPABASE_URL: 'https://x.supabase.co', VITE_SUPABASE_ANON_KEY: '' })).toBeNull();
});
it('returns parsed env', () => {
  expect(getPublicEnv({ VITE_SUPABASE_URL: 'https://x.supabase.co', VITE_SUPABASE_ANON_KEY: 'k' }))
    .toEqual({ supabaseUrl: 'https://x.supabase.co', supabaseAnonKey: 'k' });
});
it('allows local http, rejects other http', () => {
  expect(getPublicEnv({ VITE_SUPABASE_URL: 'http://127.0.0.1:54321', VITE_SUPABASE_ANON_KEY: 'k' })).not.toBeNull();
  expect(() => getPublicEnv({ VITE_SUPABASE_URL: 'http://evil.com', VITE_SUPABASE_ANON_KEY: 'k' }))
    .toThrow('VITE_SUPABASE_URL must be an https URL');
});
```

- [ ] **Step 4:** Run `npx vitest run src/lib/env.test.ts`. Expected: FAIL (module not found).
- [ ] **Step 5:** Implement `getPublicEnv` in `src/lib/env.ts`.
- [ ] **Step 6:** Run `npx vitest run src/lib/env.test.ts`. Expected: 3 passed.
- [ ] **Step 7: Configure tooling and env files.**
  - ESLint (flat config): `typescript-eslint` strict, `react-hooks`, `jsx-a11y` recommended.
  - Prettier with the Tailwind plugin.
  - `.gitignore` covers `node_modules`, `build`, `.react-router`, `.env*` except `.env.example`, `supabase/.temp`, `coverage`, `playwright-report`, `test-results`.
  - `.env.example` lists `VITE_SUPABASE_URL=` and `VITE_SUPABASE_ANON_KEY=`, each with a comment saying where to find it (Supabase Dashboard → project → Project Settings → API Keys).
- [ ] **Step 8:** Run `npm run typecheck && npm run lint && npm run format:check && npm test && npm run build`. Expected: all exit 0, and `build/client/index.html` exists.
- [ ] **Step 9: Commit:** `chore: scaffold React Router app with tooling and env parsing`.

---

### Task 2: Pre-render spike (throwaway — GATE)

Throwaway work in a separate worktree. **Nothing from it is merged.** It proves spec §4 before anything is built on top of it.

**Files (spike worktree only):** `src/routes/spike.tsx`, `src/routes/spike.$slug.tsx`, `react-router.config.ts`
**Kept in the real branch:** `docs/superpowers/notes/2026-11-17-prerender-spike.md` (results)

- [ ] **Step 1: Create the worktree.** `git worktree add ../Mondelo-spike -b spike/prerender`.
- [ ] **Step 2: Build the list route `spike.tsx`.**
  - `loader` returns `{ source: 'build' }`.
  - `clientLoader` returns `{ source: 'client' }` without calling `serverLoader`, with `clientLoader.hydrate = true as const`.
  - **No** `HydrateFallback`.
  - The component renders `<p data-testid="src">{source}</p>`.
- [ ] **Step 3: Build the detail route `spike.$slug.tsx`.**
  - Same shape as the list route, plus `meta` returning `title: slug`.
  - The `clientLoader` returns `{ source: 'client', slug }` for any slug and throws `data(null, { status: 404 })` for slug `missing`.
- [ ] **Step 4: Check pre-rendering with zero slugs.** Set `prerender: async () => ['/', '/spike', ...slugs]` with `slugs = []`. Run `npm run build`.
  - **Record:** does the build pass with zero detail pages? If React Router rejects a `loader` on a non-pre-rendered dynamic route, try (a) removing `loader` from the detail route (clientLoader only) and (b) keeping `loader` with at least one slug. Record which works.
- [ ] **Step 5: Check pre-rendering with slugs.** Set `slugs = ['a']` and build. Check that `build/client/spike/index.html` contains `>build<`, and that `build/client/spike/a/index.html` exists with `<title>a</title>`.
- [ ] **Step 6: Check behaviour in a browser.** Run `npx serve build/client -s` (SPA fallback to `__spa-fallback.html` or `index.html`, whichever the build produced; record which) and load the pages once with `npx playwright` Chromium. Confirm:
  - `/spike` shows `client` after hydration;
  - client navigation from `/` to `/spike` shows `client`;
  - `/spike/b` (not pre-rendered) shows `client` and slug `b`;
  - `/spike/missing` renders the error boundary.

  Then stop the server.
- [ ] **Step 7: Write the results** to `docs/superpowers/notes/2026-11-17-prerender-spike.md`: each check, pass or fail, and the exact pattern that works (route exports and config). The Vercel real-404 check is listed as **pending → Phase 5 Task 5**.
- [ ] **Step 8: GATE.**
  - If every check passes (or a variant from Step 4 does), continue. Phase 4 Task 2 uses the recorded pattern.
  - If anything fails, **stop and report to the developer** with the options before changing the design.
- [ ] **Step 9: Clean up.** `git worktree remove ../Mondelo-spike && git branch -D spike/prerender`. Commit the notes file on `phase-1-foundation`: `docs: record pre-render spike results`.

---

### Task 3: CI workflow

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Write `ci.yml`.**
  - Trigger: `pull_request` and pushes to `main`.
  - Job `checks` (ubuntu-latest, Node LTS, `npm ci`): `typecheck`, `lint`, `format:check`, `test`, `build`. No Supabase env is set, so the build exercises the placeholder fallback.
  - Job `database`: `supabase/setup-cli@v1` → `supabase db start` → `supabase test db` → `supabase db lint --level warning --fail-on warning` (in this job, a lint warning fails the build).
  - Use `concurrency` to cancel superseded runs.
- [ ] **Step 2:** Run `npx --yes action-validator .github/workflows/ci.yml` (or `actionlint` if installed). Expected: no errors.
  - **Report honestly:** the workflow itself is only proven by the first PR's CI run.
- [ ] **Step 3: Commit:** `ci: add checks and database test workflow`.

---

### Task 4: Design tokens, fonts and contrast guard

**Files:**
- Modify: `src/app.css`, `src/root.tsx`
- Create: `src/utils/contrast.ts`
- Test: `src/utils/contrast.test.ts`, `src/styles/tokens.test.ts`

**Interfaces:**
- Produces: `contrastRatio(hexA: string, hexB: string): number` (WCAG 2.1 relative-luminance formula, rounded to 2 decimals).
- Produces: Tailwind colour utilities named after the tokens (`bg-forest-900`, `text-gold-500`, …) and font utilities `font-serif` (Playfair Display) and `font-sans` (DM Sans Variable).

- [ ] **Step 1: Write the failing contrast tests.** `contrast.test.ts`:

```ts
expect(contrastRatio('#000000', '#FFFFFF')).toBe(21);
expect(contrastRatio('#77786F', '#F8F5EC')).toBeLessThan(4.5); // documents why ink-500 is large-text only
```

`tokens.test.ts` reads `src/app.css`, extracts every `--color-<name>: #hex` from `@theme`, and asserts:
- all 10 README tokens exist with exactly the README hex values;
- these pairs are ≥ 4.5: `ink-900/ivory-50`, `ink-600/ivory-50`, `ink-600/cream-100`, `earth-700/cream-100`, `earth-600/ivory-50`, `ivory-50/forest-900`, `gold-500/forest-900`, `ink-900/gold-500`.
- [ ] **Step 2:** Run `npx vitest run src/utils src/styles`. Expected: FAIL.
- [ ] **Step 3:** Implement `contrastRatio`.
- [ ] **Step 4: Write the tokens and fonts.**
  - In `app.css`: `@import "tailwindcss";` and an `@theme` block with the 10 colour tokens, `--font-serif: "Playfair Display", Georgia, serif;` and `--font-sans: "DM Sans Variable", system-ui, sans-serif;`.
  - Base layer: `body { @apply bg-ivory-50 text-ink-900 font-sans antialiased }`; a `:focus-visible` outline in gold on dark surfaces and forest on light ones (via a `[data-surface=dark]` ancestor); and `@media (prefers-reduced-motion: reduce)` setting `*{animation:none!important;transition:none!important;scroll-behavior:auto!important}`.
  - In `root.tsx`: import the `@fontsource` CSS for Playfair Display 400/600/700 + 400-italic (latin) and DM Sans Variable. Add a `<link rel="preload">` for the Playfair 600 latin woff2 only.
- [ ] **Step 5:** Run `npx vitest run src/utils src/styles`. Expected: PASS.
- [ ] **Step 6: Commit:** `feat: add design tokens, self-hosted fonts and contrast guard`.

---

### Task 5: Supabase init, base migration (profiles, is_admin, privileges), test helpers, RLS guard

**Developer step first:** the developer runs `npx supabase login` and `npx supabase link --project-ref <ref>` themselves. Neither the access token nor the database password goes in chat.

**Files:**
- Create: `supabase/config.toml` (via `npx supabase init`), `supabase/migrations/20261117000001_base.sql`
- Test: `supabase/tests/00000_test_helpers.sql`, `supabase/tests/00001_rls_guard.test.sql`, `supabase/tests/00010_profiles.test.sql`

**Interfaces:**
- Produces (SQL):
  - `public.set_updated_at() returns trigger`.
  - `public.is_admin() returns boolean`: `security definer`, `stable`, `set search_path = ''`. `execute` is revoked from `public` and granted to `anon, authenticated`.
  - Table `public.profiles(id uuid pk references auth.users on delete cascade, full_name text, role text not null check (role in ('admin')), created_at, updated_at)`.
- Produces (test helpers, committed into the local DB by `00000_test_helpers.sql`, which does not roll back):
  - `tests.create_user(email text, make_admin boolean default false) returns uuid` inserts into `auth.users`, plus `profiles` when `make_admin`.
  - `tests.authenticate_as(uid uuid)` runs `set local role authenticated` and sets `request.jwt.claims` to `{"sub": uid, "role": "authenticated"}`.
  - `tests.as_anon()` runs `set local role anon` and clears the claims.
  - `tests.reset_role()` runs `reset role`.

- [ ] **Step 1: Write the failing guard test.** `00001_rls_guard.test.sql` asserts, for every table in schema `public` (query `pg_class` with `relkind = 'r'`, joined to `pg_namespace`):
  - `relrowsecurity` is true: `is(count of tables without rls, 0)`;
  - each table has at least one row in `pg_policies`: `is(count of tables without policies, 0)`;
  - `anon` has no `TRUNCATE`, `REFERENCES` or `TRIGGER` privilege on any public table (`information_schema.role_table_grants`).
- [ ] **Step 2: Write the failing profiles test.** `00010_profiles.test.sql`:
  - `has_table('public','profiles')` and `policies_are('public','profiles', array['profiles_select_own'])`.
  - Admin A and non-admin user B exist. Authenticated as B: `select count(*) from profiles` = 0 (B has no row); `is_admin()` = false.
  - As B, `insert into profiles (id, role) values (B, 'admin')` → `throws_ok` with `42501`.
  - As A: `is_admin()` = true, and `select` returns exactly A's row. `update profiles set role='admin' where id = B` affects 0 rows (no update policy).
  - As anon: `is_admin()` = false and `select count(*) from profiles` = 0.
- [ ] **Step 3:** Run `npx supabase start && npx supabase test db`. Expected: FAIL (table missing).
- [ ] **Step 4: Write `20261117000001_base.sql`.**
  - `alter default privileges in schema public revoke all on tables from anon, authenticated;` (and the same for `functions` and `sequences`).
  - `set_updated_at()`, then `profiles` with RLS enabled.
  - `revoke all on profiles from anon, authenticated; grant select on profiles to authenticated;`
  - Policy `profiles_select_own`: `for select to authenticated using (id = (select auth.uid()))`.
  - The updated_at trigger, then `is_admin()` (it reads `public.profiles` with fully qualified names).
- [ ] **Step 5:** Run `npx supabase db reset && npx supabase test db`. Expected: all pass.
- [ ] **Step 6: Commit:** `feat(db): base migration with explicit privileges, profiles and is_admin`.

---

### Task 6: Settings, media, page sections

**Files:**
- Create: `supabase/migrations/20261117000002_settings_media_sections.sql`
- Test: `supabase/tests/00020_settings_media_sections.test.sql`

**Interfaces:**
- Produces: tables `site_settings`, `media` and `page_sections`, with the columns in spec §7.
  - `page_sections` also gets `is_sample boolean not null default false`.
  - `media.alt_text` has `check (length(trim(alt_text)) > 0)`.
  - `variants jsonb not null` (shape `{"480": "2026/x-ab12cd-480.webp", …}`).
  - `focal_x` and `focal_y` are `smallint not null default 50 check (between 0 and 100)`.
  - `page_sections.media_id` and `site_settings.default_og_media_id` reference `media` with `on delete restrict`.
- Policy names follow `<table>_<op>_<role>`: `site_settings_select_public` (to anon, authenticated), `site_settings_update_admin`, `media_select_public`, `media_insert_admin`, `media_update_admin`, `media_delete_admin`, `page_sections_select_published` (anon, authenticated, `using (is_published or (select public.is_admin()))`), `page_sections_insert_admin`, `page_sections_update_admin`, `page_sections_delete_admin`.

- [ ] **Step 1: Write the failing test.**
  - `policies_are` for each of the three tables, with exactly the names above.
  - **As anon:** `select` on `site_settings` returns 1 row; only published sections are visible (seed inside the test: one published row, one unpublished); `insert`, `update` and `delete` on all three tables are denied or affect 0 rows.
  - **As a non-admin:** same as anon.
  - **As an admin:** sees both sections; can insert, update and delete.
  - A second `site_settings` insert fails (`23505`, singleton).
  - Deleting a `media` row referenced by a section → `throws_ok '23503'`.
  - `media` insert with alt text `'   '` → `throws_ok '23514'`.
  - `updated_at` changes after an update (compare before and after with `clock_timestamp` handled via an explicit `now()` comparison in a new statement).
- [ ] **Step 2:** Run `npx supabase test db`. Expected: FAIL.
- [ ] **Step 3: Write the migration.**
  - Tables, constraints and `unique(page, key)`.
  - Indexes: `(is_published, sort_order)` on sections, and FK indexes.
  - Triggers.
  - `revoke all … from anon, authenticated`; grant `select` to anon, authenticated; grant `insert, update, delete` to authenticated (policies gate them to admin).
  - Every write policy uses `(select public.is_admin())` in both `using` and `with check`.
- [ ] **Step 4:** Run `npx supabase db reset && npx supabase test db`. Expected: PASS.
- [ ] **Step 5: Commit:** `feat(db): site settings, media and page sections with RLS`.

---

### Task 7: Attractions, attraction images, gallery

**Files:**
- Create: `supabase/migrations/20261117000003_attractions_gallery.sql`
- Test: `supabase/tests/00030_attractions_gallery.test.sql`

**Interfaces:**
- Produces: tables `attractions`, `attraction_images`, `gallery_categories` and `gallery_images`, with the columns in spec §7.
  - `attractions` and `gallery_images` get `is_sample boolean not null default false`.
  - `attractions.summary` has `check (char_length(summary) <= 160)`.
  - `attractions.icon` has `check (icon in ('leaf','mountain','utensils','waves','tent','trees','sunset','camera','users','flower-2','bed-double','coffee'))`. This is the fixed Lucide list; Phase 3's icon picker uses it.
  - `slug` has `check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')`.
  - `attraction_images` cascades when its attraction is deleted; `gallery_images.category_id` uses `on delete set null`.
- The policies follow the same naming and admin pattern as Task 6. The exception: `attraction_images_select_published` uses `using (exists (select 1 from public.attractions a where a.id = attraction_id and a.is_published) or (select public.is_admin()))`.

- [ ] **Step 1: Write the failing test.**
  - `policies_are` per table.
  - **As anon:** a published attraction is visible and an unpublished one is not. **Review Focus #5:** images of an unpublished attraction return 0 rows, and images of a published one return their rows. Unpublished gallery images and categories are hidden.
  - **As a non-admin:** cannot insert an attraction (`42501`).
  - **As an admin:** full CRUD. Deleting an attraction removes its `attraction_images`. Deleting a category leaves its images with `category_id is null`.
  - Bad slug `'Bad Slug'` → `23514`; `icon = 'rocket'` → `23514`; a 161-char summary → `23514`.
- [ ] **Step 2:** Run `npx supabase test db`. Expected: FAIL.
- [ ] **Step 3:** Write the migration (same grant/policy pattern as Task 6; indexes on `(is_published, sort_order)`, `slug` unique, `(kind, is_published, sort_order)` on attractions, and FK columns).
- [ ] **Step 4:** Run `npx supabase db reset && npx supabase test db`. Expected: PASS.
- [ ] **Step 5: Commit:** `feat(db): attractions and gallery tables with RLS`.

---

### Task 8: Testimonials, announcements, FAQs, dashboard view

**Files:**
- Create: `supabase/migrations/20261117000004_testimonials_announcements_faqs.sql`, `supabase/migrations/20261117000005_recent_updates_view.sql`
- Test: `supabase/tests/00040_testimonials_announcements_faqs.test.sql`, `supabase/tests/00050_recent_updates_view.test.sql`

**Interfaces:**
- Produces: tables `testimonials`, `announcements` and `faqs` (spec §7). `testimonials.quote` is `check (char_length(trim(quote)) between 10 and 600)`.
- Produces: `announcements_select_published` uses `using ((is_published and starts_at <= now() and (ends_at is null or ends_at > now())) or (select public.is_admin()))`, plus `check (ends_at is null or ends_at > starts_at)`.
- Produces: the view `public.recent_content_updates(source text, id uuid, title text, updated_at timestamptz)`.
  - It is a `union all` over `page_sections` (title = `page || ' · ' || key`), `attractions` (name), `gallery_images` (coalesce caption, 'Image'), `gallery_categories` (name), `testimonials` (author_name), `announcements` (title), `faqs` (question) and `site_settings` ('Contact & settings').
  - Each branch is filtered by `where (select public.is_admin())`.
  - It is ordered by `updated_at desc`, limited to 10, and created `with (security_invoker = true)`.
  - Grants: `revoke all from anon, authenticated; grant select to authenticated`.

- [ ] **Step 1: Write the failing tests.**
  - **Review Focus #3:** as anon, an announcement that is published but has `ends_at = now() - interval '1 day'` → 0 rows; a future `starts_at` → 0 rows; a current one → 1 row.
  - Unpublished testimonials and FAQs are hidden from anon.
  - The view: as anon → `throws_ok '42501'`; as a non-admin → 0 rows; as an admin → rows in descending `updated_at` order, at most 10.
- [ ] **Step 2:** Run `npx supabase test db`. Expected: FAIL.
- [ ] **Step 3:** Write both migrations.
- [ ] **Step 4:** Run `npx supabase db reset && npx supabase test db`. Expected: PASS.
- [ ] **Step 5: Commit:** `feat(db): testimonials, announcements, faqs and admin-only updates view`.

---

### Task 9: Contact messages and submit function

**Files:**
- Create: `supabase/migrations/20261117000006_contact.sql`
- Test: `supabase/tests/00060_contact.test.sql`

**Interfaces:**
- Produces: table `contact_messages` (spec §7). Its checks match §9.3:
  - `full_name` 2–100 characters;
  - `email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'`, max 254;
  - `phone` null or `~ '^[0-9 +()-]{0,30}$'`;
  - `subject` 2–150;
  - `message` 10–5000;
  - `status in ('new','read','archived')`.
- Produces: `public.submit_contact_message(p_full_name text, p_email text, p_phone text, p_subject text, p_message text, p_honeypot text, p_elapsed_ms int) returns text`.
  - `security definer`, `set search_path = ''`.
  - Returns `'ok'` when the message is stored or silently discarded.
  - Raises `exception 'rate_limited' using errcode = 'P0001'` when the limit is hit.
  - Raises `check_violation` (`23514`) when input is invalid.
  - `execute` is revoked from `public` and granted to `anon, authenticated`.
  - It trims every text input, and stores an empty phone as null.
- Grants: `revoke all on contact_messages from anon, authenticated; grant select, update, delete on contact_messages to authenticated` (each gated by admin-only policies). **No insert grant.**

- [ ] **Step 1: Write the failing test.**
  - **As anon:**
    - A valid call returns `'ok'`, and one row exists (checked as admin) with trimmed values and `status = 'new'`.
    - Honeypot `'x'` → `'ok'` and no row.
    - `p_elapsed_ms = 2999` → `'ok'` and no row.
    - Each invalid field (name `'A'`, email `'nope'`, phone `'abc'`, subject `'S'`, message `'short'`) → `throws_ok '23514'`.
    - The 4th message from the same email within an hour → `throws_ok 'P0001', 'rate_limited'`.
    - Direct `insert into contact_messages` → `42501`.
    - `select` → `42501`.
  - **As a non-admin:** `select` returns 0 rows.
  - **As an admin:** can select, update `status` to `'read'`, and delete. `status = 'spam'` → `23514`.
  - **Global limit:** insert 50 rows directly as the postgres role with distinct emails and `submitted_at = now()`. Then an anon call → `rate_limited`.
- [ ] **Step 2:** Run `npx supabase test db`. Expected: FAIL.
- [ ] **Step 3:** Write the migration (table, index `(status, submitted_at desc)`, `(email, submitted_at)`, policies `contact_messages_select_admin`, `_update_admin` and `_delete_admin`, then the function).
- [ ] **Step 4:** Run `npx supabase db reset && npx supabase test db`. Expected: PASS.
- [ ] **Step 5: Commit:** `feat(db): contact messages with validated, rate-limited submit function`.

---

### Task 10: Storage bucket and policies

**Files:**
- Create: `supabase/migrations/20261117000007_storage.sql`
- Test: `supabase/tests/00070_storage.test.sql`

**Interfaces:**
- Produces: bucket `media`, created with `insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values ('media','media', true, 5242880, array['image/webp','image/jpeg','image/png'])`.
- Produces: policies on `storage.objects`:
  - `media_objects_insert_admin`: `for insert to authenticated with check (bucket_id = 'media' and (select public.is_admin()))`.
  - `media_objects_update_admin` and `media_objects_delete_admin`, with the same check.
  - No `select` policy is needed, because a public bucket serves files by URL. Listing objects through the API stays admin-only via `media_objects_select_admin`.

- [ ] **Step 1: Write the failing test.**
  - The bucket exists with `public = true`, a 5242880 limit and exactly those three MIME types.
  - **As anon:** `insert into storage.objects (bucket_id, name, owner) values ('media','t.webp', null)` → `42501`.
  - **As a non-admin:** the same → `42501`.
  - **As an admin:** succeeds, and `delete` succeeds.
  - **As a non-admin:** `delete` of the admin's object affects 0 rows.
- [ ] **Step 2:** Run `npx supabase test db`. Expected: FAIL.
- [ ] **Step 3:** Write the migration.
- [ ] **Step 4:** Run `npx supabase db reset && npx supabase test db`. Expected: PASS.
- [ ] **Step 5: Commit:** `feat(db): media storage bucket with admin-only writes`.

---

### Task 11: Seed data, generated types, typed placeholder content

**Files:**
- Create: `supabase/seed.sql`, `src/types/database.ts` (generated), `src/types/content.ts`, `src/content/placeholders.ts`
- Test: `supabase/tests/00090_seed.test.sql`, `src/content/placeholders.test.ts`

**Interfaces:**
- Produces: domain types in `src/types/content.ts`, used by every later phase:

```ts
export type MediaAsset = { id: string; alt: string; width: number; height: number; variants: Record<number, string>; focalX: number; focalY: number };
export type SiteSettings = { parkName: string; tagline: string | null; shortDescription: string | null; addressLine: string; plusCode: string | null;
  latitude: number | null; longitude: number | null; mapsEmbedUrl: string | null; mapsListingUrl: string | null; phone: string | null; email: string | null;
  openingHours: string | null; socials: { facebook: string | null; instagram: string | null; tiktok: string | null; youtube: string | null };
  googleRating: number | null; googleReviewCount: number | null; defaultOgImage: MediaAsset | null };
export type PageKey = 'home' | 'about' | 'visit';
export type PageSection = { key: string; eyebrow: string | null; heading: string | null; body: string | null; ctaLabel: string | null; ctaHref: string | null; image: MediaAsset | null; isSample: boolean };
export type AttractionKind = 'attraction' | 'experience';
export type Attraction = { id: string; kind: AttractionKind; slug: string; name: string; summary: string; description: string | null; icon: AttractionIcon | null; cover: MediaAsset | null; images: { image: MediaAsset; caption: string | null }[]; isFeatured: boolean; isSample: boolean };
export type GalleryCategory = { id: string; name: string; slug: string };
export type GalleryImage = { id: string; image: MediaAsset; caption: string | null; categoryId: string | null; isFeatured: boolean; isSample: boolean };
export type Testimonial = { id: string; authorName: string; quote: string; rating: number | null; source: 'google' | 'facebook' | 'direct'; sourceUrl: string | null; reviewDate: string | null };
export type Announcement = { id: string; title: string; body: string | null; linkLabel: string | null; linkHref: string | null };
export type Faq = { id: string; question: string; answer: string };
export const ATTRACTION_ICONS = ['leaf','mountain','utensils','waves','tent','trees','sunset','camera','users','flower-2','bed-double','coffee'] as const;
export type AttractionIcon = (typeof ATTRACTION_ICONS)[number];
```

- Produces: `placeholders` in `src/content/placeholders.ts`, typed as `{ settings: SiteSettings; sections: Record<PageKey, PageSection[]>; attractions: Attraction[]; galleryCategories: GalleryCategory[]; galleryImages: GalleryImage[]; testimonials: Testimonial[]; announcement: Announcement | null; faqs: Faq[] }`. It mirrors `seed.sql`, and all `image`/`cover` fields are `null`, which the UI renders as `PlaceholderImage`.

- [ ] **Step 1: Write the failing seed test** `00090_seed.test.sql`:
  - `site_settings` has `google_rating = 4.6`, `google_review_count = 70` and `address_line = 'M8GV+8GP, Balaring Road, Kawayan, Biliran, Philippines'`; `phone`, `email`, `opening_hours` and all social URLs are null.
  - `testimonials` count = 0; `faqs` count = 0; `announcements` count = 0.
  - 4 rows have `kind = 'experience' and is_published and is_sample`, with names exactly `Beautiful Gardens`, `Scenic Views`, `Dining` and `Relaxing Pool` and icons `leaf`, `mountain`, `utensils` and `waves`.
  - At least 3 published sample attractions exist, each with a valid slug.
  - The home `hero` section has heading `Find Your Peace in Nature.` and `is_sample = false`. The home `intro` body equals the README intro copy exactly, with `is_sample = false`.
  - The About `story`, `mission` and `vision` sections are `is_sample = true`.
  - Gallery categories `Landscapes`, `Gardens` and `Facilities` exist, published.
- [ ] **Step 2:** Run `npx supabase db reset && npx supabase test db`. Expected: FAIL.
- [ ] **Step 3: Write `seed.sql`.** Sample wording must be illustrative, with no prices, hours, capacities or names. For example, the Dining summary is "Enjoy a meal in a relaxing garden setting."
- [ ] **Step 4:** Run `npx supabase db reset && npx supabase test db`. Expected: PASS.
- [ ] **Step 5: Generate the database types.** Run `npx supabase gen types typescript --local > src/types/database.ts`, and add the `db:types` npm script with that command.
- [ ] **Step 6: Write the failing test** `placeholders.test.ts`:
  - `placeholders.testimonials` is empty;
  - `settings.googleRating === 4.6` and `googleReviewCount === 70`;
  - the four experience names and icons match the seed;
  - every placeholder attraction (both kinds) has `isSample === true`;
  - the home hero heading equals `'Find Your Peace in Nature.'`;
  - `phone`, `email` and `openingHours` are null.
- [ ] **Step 7:** Implement `src/types/content.ts` and `src/content/placeholders.ts`. Run `npx vitest run src/content && npm run typecheck`. Expected: PASS.
- [ ] **Step 8: Commit:** `feat: seed data, generated DB types and typed placeholder content`.

---

### Task 12: Project context docs, lint, remote push, phase report

**Files:**
- Create: `AGENTS.md`, `CLAUDE.md` (a one-line pointer to `AGENTS.md`), `docs/admin-setup.md`, `docs/client-content-checklist.md`

- [ ] **Step 1: Write the project context.** Use the `go-dark:project-context` skill to write `AGENTS.md` with: stack, commands, the file map pointer, Global Constraints (honesty, RLS rules, secrets, local load), and the branch/PR flow.
- [ ] **Step 2: Write `docs/admin-setup.md`** (spec §9.4, with exact click paths):
  1. Turn off sign-ups.
  2. Add the user.
  3. Run the profiles SQL snippet.
  4. Test the login.
  5. Remove an admin.
- [ ] **Step 3: Write `docs/client-content-checklist.md`** with the 10 items from spec §11 as checkboxes.
- [ ] **Step 4:** Run `npx supabase db lint --level warning`. Expected: no issues. Then `npx supabase stop`.
- [ ] **Step 5: Developer step: apply migrations to the remote project.** The developer runs `npx supabase db push`. Seed data does **not** go to remote automatically. The developer runs `supabase/seed.sql` once through Dashboard → project → **SQL Editor** → New query → paste → Run (or `npx supabase db push --include-seed` if available in their CLI version).
- [ ] **Step 6:** Run `npm run typecheck && npm run lint && npm run format:check && npm test && npm run build`. Expected: all exit 0.
- [ ] **Step 7: Finish the phase.** Commit `docs: project context, admin setup and client checklist`. Write the phase report (README ritual), **ask the developer**, push `phase-1-foundation`, and open the PR.
