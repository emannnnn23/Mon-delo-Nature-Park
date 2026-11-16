# Mondelos Nature Park — Build Roadmap

This is the entry point for building the site. Read it first, then work through the phase plans **in order**, one task at a time, ticking each `- [ ]` box as you go.

**Spec (source of truth):** [`../specs/2026-11-17-mondelos-website-design.md`](../specs/2026-11-17-mondelos-website-design.md)
**Visual reference:** [`../../reference/visual-reference.png`](../../reference/visual-reference.png)

| # | Plan | Branch | Gate before the next phase |
|---|------|--------|----------------------------|
| 1 | [Foundation](2026-11-17-phase-1-foundation.md) | `phase-1-foundation` | Pre-render spike passed (or the developer approved a change); all pgTAP tests green; `supabase db lint` clean; PR merged by the developer |
| 2 | [Public UI](2026-11-17-phase-2-public-ui.md) | `phase-2-public-ui` | All public pages render from placeholder data; screenshots at 375/768/1024/1440 reviewed against the reference; PR merged |
| 3 | [CMS](2026-11-17-phase-3-cms.md) | `phase-3-cms` | Every CMS section does create/edit/delete/publish against local Supabase; upload pipeline works in Chromium and the Safari fallback is unit-tested; PR merged |
| 4 | [Integration](2026-11-17-phase-4-integration.md) | `phase-4-integration` | Public pages read live CMS data; contact form stores messages; build output tests (meta, sitemap, CSP) green; PR merged |
| 5 | [QA & Deployment](2026-11-17-phase-5-qa-deploy.md) | `phase-5-qa-deploy` | Production smoke checklist passed on the live Vercel URL; handover docs written; PR merged |

## How to resume in a new session
1. `git status` and `git branch --show-current` show which phase branch is active.
2. Open that phase's plan. The first unticked `- [ ]` is the next step.
3. Re-read the plan's **Interfaces** blocks for the task you're on. They are the contract with neighbouring tasks.

## Phase ritual (from the brief)

**Start of a phase:**
1. Branch fresh from up-to-date `main`: `git switch main && git pull && git switch -c <branch>`.
2. Tell the developer in a few lines what this phase will build.

**End of a phase**, as a report to the developer in chat and as the PR description:
- **Completed work:** what now works.
- **Changed files:** `git diff --stat main...HEAD`.
- **Outstanding tasks:** anything deferred, with a reason.
- **Tests performed:** the exact commands and their results. Say what was *not* run.
- **Issues needing attention:** decisions, risks, and anything blocked on the client or developer.

Then push the branch and open a PR. **Ask the developer before the first push of each phase.** Only the developer merges.

## Global Constraints (apply to every task in every phase)

**Stack**
- React 19, TypeScript `strict`, Vite.
- React Router v7 framework mode with `appDirectory: "src"`, `ssr: false` and a `prerender` list.
- Tailwind CSS 4 via `@tailwindcss/vite`; Lucide React; Zod; `@supabase/supabase-js` v2.
- Vitest + Testing Library (jsdom); pgTAP via `supabase test db`; Playwright in CI only.
- Install the latest stable minor of each and record the exact versions in `package.json`. No new runtime dependency is added without a line in the phase report saying why.
- No Framer Motion.

**Honesty**
- Never invent facilities, prices, hours, capacities, names, reviews or reviewers.
- Unconfirmed content is seeded `is_sample = true` and shows a "Sample" tag.
- Testimonials, contact details, opening hours and social links are never sampled. When unknown, they are hidden.
- No stock or AI photos. Placeholders are the in-code "Photo coming soon" leaf tile.

**Real seed values**
- Google rating `4.6` from `70` reviews.
- Address: `M8GV+8GP, Balaring Road, Kawayan, Biliran, Philippines`.
- Hero heading `Find Your Peace` / `in Nature.`
- Intro copy: "Discover a peaceful escape surrounded by nature, beautiful landscapes, and unforgettable moments. Whether you're looking for a relaxing getaway, a scenic view, or meaningful time with family and friends, Mondelos Nature Park welcomes you."

**Security**
- Only `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are ever in frontend code or `.env`. The service-role key never enters the repo, Vercel or chat.
- RLS is enabled in the migration that creates each table.
- Each migration runs `revoke all … from anon, authenticated`, then grants explicitly.
- One policy per operation per role. No `for all`, and no `using (true)` on writes.
- Never disable RLS to make something work.

**Colour tokens**

| Token | Value | Note |
|---|---|---|
| `forest-900` | `#183F32` | |
| `forest-800` | `#244B3A` | |
| `ivory-50` | `#F8F5EC` | |
| `cream-100` | `#EEE8D9` | |
| `gold-500` | `#D6AA55` | |
| `earth-600` | `#806B50` | |
| `earth-700` | `#6E5B43` | Added: AA small text on cream |
| `ink-900` | `#262923` | |
| `ink-600` | `#66675F` | Added: AA muted small text |
| `ink-500` | `#77786F` | Large or decorative text only; 4.1:1 on ivory fails AA for small text |

**Fonts and code style**
- Playfair Display for headings and italic accents; DM Sans for body. Both self-hosted via `@fontsource`.
- The brief's `src/` layout (see file map below), with business logic kept in `services/` and `lib/`, out of components.

**Local machine**
- Run typecheck, lint and the touched tests only.
- `supabase start` only for database tasks; `supabase stop` when the DB task block ends.
- Never leave a dev server running. Report "ports free / containers stopped" at the end of each phase.

**Git**
- No AI attribution in commits, PRs or code comments.
- Conventional commit prefixes (`feat:`, `fix:`, `test:`, `chore:`, `docs:`).
- Never force-push.

**Secrets**
- The developer runs `supabase login`, `supabase link` and `vercel login` themselves.
- Never print, paste or commit keys, passwords or hook URLs.

## File map (target end state)

```
src/
  root.tsx                    # html shell, fonts preload, global ErrorBoundary
  routes.ts                   # route config
  app.css                     # Tailwind import, @theme tokens, base styles
  routes/                     # route modules: loader/clientLoader/meta only; render pages/*
    _public.tsx               # PublicLayout wrapper route
    home.tsx discover.tsx discover.$slug.tsx gallery.tsx about.tsx visit.tsx not-found.tsx
    admin/                    # admin route modules (login, layout guard, sections)
  pages/                      # presentational page components (HomePage.tsx, …)
  components/
    common/                   # Button, Eyebrow, SectionHeading, SampleTag, ResponsiveImage,
                              # PlaceholderImage, Logo, LeafDecor, Reveal, Lightbox, MapEmbed
    layout/                   # SiteHeader, MobileMenu, SiteFooter, AnnouncementStrip, PublicLayout
    home/                     # Hero, IntroSection, ExperienceCards, DiscoverPreview,
                              # GalleryTestimonialsBand, TestimonialSlider, VisitSection
    attractions/              # AttractionCard, ExperienceCard
    gallery/                  # GalleryGrid, CategoryFilter
    forms/                    # ContactForm, Field
  admin/
    layouts/AdminLayout.tsx
    components/               # FormField, PublishToggle, SampleBadge, ConfirmDialog, ReorderButtons,
                              # MediaUploader, ImagePicker, Toast, CrudList
    pages/                    # LoginPage, DashboardPage, PageSectionsPage, Attractions*, Gallery*,
                              # Testimonials, Announcements, Faqs, Settings, Messages, MediaLibrary
  hooks/                      # useScrolled, usePrefersReducedMotion, useInView, useSession, useUnsavedChanges
  lib/                        # supabase.ts, env.ts, routeData.ts, meta.ts, validation/*.ts
  services/                   # content.ts (public reads), contact.ts, media.ts, auth.ts, admin/*.ts
  types/                      # database.ts (generated), content.ts (domain types)
  utils/                      # slug.ts, imageVariants.ts, encodeImage.ts, mediaPath.ts, dates.ts, contrast.ts
  content/placeholders.ts     # typed fallback content
supabase/
  config.toml  seed.sql
  migrations/                 # 20261117000001_base.sql … (one concern per file)
  tests/                      # 00000_test_helpers.sql, *.test.sql (pgTAP)
scripts/                      # generate-sitemap.mjs, inject-csp.mjs
tests/build/                  # tests over build/client output
e2e/                          # Playwright smoke (CI only)
.github/workflows/            # ci.yml, rebuild.yml
public/                       # robots.txt, favicon.svg
vercel.json  .env.example  AGENTS.md  CLAUDE.md
docs/admin-setup.md  docs/client-content-checklist.md
```
