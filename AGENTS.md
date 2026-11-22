# Working in this repository

Instructions for any AI agent or contributor working on Mondelos Nature Park: the public website and admin CMS for a nature park in Kawayan, Biliran, Philippines.

## Start here

Read these in order. Read only what your task needs.

1. This file.
2. [`docs/superpowers/plans/README.md`](docs/superpowers/plans/README.md): roadmap, Global Constraints and the file map.
3. [`docs/superpowers/specs/2026-11-17-mondelos-website-design.md`](docs/superpowers/specs/2026-11-17-mondelos-website-design.md): the design spec.
4. [`docs/superpowers/notes/2026-11-17-prerender-spike.md`](docs/superpowers/notes/2026-11-17-prerender-spike.md): the proven prerender pattern ("The pattern that works"). Read it before touching routes or the build.

## Stack

- React Router 8.5.1 in framework mode, `ssr: false` plus a `prerender` list, `appDirectory: "src"`.
- Vite 8, React 19, TypeScript strict, Tailwind CSS 4 (`@tailwindcss/vite`), Zod, Lucide React.
- Supabase (Postgres, Auth, Storage) through `@supabase/supabase-js` v2.
- Tests: Vitest with Testing Library (jsdom) and pgTAP (`supabase test db`).

## Commands

```
npm run dev                 # dev server (stop it when done)
npm run typecheck           # route typegen, then tsc --noEmit
npm run lint
npm run format:check        # npm run format to fix
npm test                    # Vitest, once
npm run build               # static site into build/client
npm run test:db             # pgTAP, needs the local Supabase stack
npm run db:types            # regenerate src/types/database.ts from the local DB
npx supabase db reset && npx supabase test db   # rebuild local DB from migrations + seed, then test it
npx supabase db lint --level warning            # must report no issues
```

Local Supabase runs as project `mondelos` on ports 553xx (API 55321, DB 55322). Other projects on this machine use 5432x: never touch their containers. Start it only for database work and stop it when done.

## Do and don't

| Rule                                                                                                                                                                                                                                                      | Why                                                                                                     |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Never invent facilities, prices, hours, capacities, names, reviews or reviewers.                                                                                                                                                                          | The site must be honest. Unconfirmed content is seeded `is_sample = true`.                              |
| Testimonials, contact details, opening hours and social links are never sampled; hide them when unknown.                                                                                                                                                  | A made-up phone number or review is a false claim about a real business.                                |
| Access control lives in the database: `is_admin()` checks a live auth session and an admin profile on every request; the frontend guard is convenience only.                                                                                              | The site is static; Postgres is the only server, so it is the only place a permission can be enforced.  |
| Enable RLS in the migration that creates each table. Never disable it.                                                                                                                                                                                    | A table without RLS is open to every client key.                                                        |
| Each migration revokes all from anon/authenticated right after creating each table, then grants explicitly.                                                                                                                                               | Nothing relies on Supabase defaults.                                                                    |
| Functions are not executable by PUBLIC by default: grant `execute` explicitly.                                                                                                                                                                            | Postgres grants execute to PUBLIC unless revoked; a missed grant silently breaks or exposes a function. |
| One policy per operation (select, insert, update, delete), each naming its roles. Writes have both `using` and `with check`. No `for all`, no `using (true)` on writes.                                                                                   | Small, reviewable policies; pgTAP asserts the exact policy set.                                         |
| `security definer` functions use `set search_path = ''` and fully qualified names.                                                                                                                                                                        | Prevents search-path hijacking.                                                                         |
| Only `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` go in the frontend `.env`. Never commit a key, password, hook URL or `.env` file (use `.env.example`). Never use the service-role key in this repo.                                                 | A pushed secret is public forever.                                                                      |
| Migrations: `supabase/migrations/YYYYMMDDHHMMSS_<concern>.sql` (for example `20261122000009_session_bound_admin.sql`), one concern per file; never edit a migration already pushed to the live project. pgTAP: `supabase/tests/NNNNN_<concern>.test.sql`. | Keeps order and review simple; the live project never re-runs an edited migration.                      |
| Locally run typecheck, lint and only the tests for files you touched. Never leave a dev or static server running.                                                                                                                                         | Keeps this machine light; CI runs the full suite.                                                       |
| Never run `supabase login`, `supabase link` or `supabase db push`. The developer does.                                                                                                                                                                    | They touch the remote project.                                                                          |
| Never run `supabase test db --remote`.                                                                                                                                                                                                                    | The test helpers persist in the database.                                                               |
| Security Advisor may warn that `public.is_admin` and `public.submit_contact_message` are security-definer functions executable by anon/authenticated. This is deliberate and accepted.                                                                    | `is_admin` runs inside the anon read policies; the contact RPC is the only public write path.           |
| Branch fresh for each change; never force-push; never commit to `main`. The developer merges pull requests.                                                                                                                                               | The developer decides what ships.                                                                       |
| Conventional commit prefixes (`feat:`, `fix:`, `docs:`...). No AI attribution in commits, pull requests or code comments: no `Co-Authored-By` naming an AI, no "Generated with" line.                                                                     | Commits are the developer's record.                                                                     |
| No extra runtime dependency without stating why in the report. No Framer Motion.                                                                                                                                                                          | Keeps the bundle small.                                                                                 |

## Imitate

| Writing                                       | Copy the shape of                                                                         |
| --------------------------------------------- | ----------------------------------------------------------------------------------------- |
| A content table with RLS, grants and policies | `supabase/migrations/20261117000004_testimonials_announcements_faqs.sql`                  |
| A pgTAP test for a content table              | `supabase/tests/00040_testimonials_announcements_faqs.test.sql`                           |
| A security-definer RPC and its test           | `supabase/migrations/20261117000006_contact.sql`, `supabase/tests/00060_contact.test.sql` |
| Seed data                                     | `supabase/seed.sql`                                                                       |
| A unit test                                   | `src/lib/env.test.ts`                                                                     |

## Verify before reporting done

```
npm run typecheck && npm run lint && npm run format:check && npm test && npm run build
```

For database changes also run `npx supabase db reset && npx supabase test db` and `npx supabase db lint --level warning`.
