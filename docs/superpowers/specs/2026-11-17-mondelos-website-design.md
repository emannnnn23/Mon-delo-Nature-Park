# Mondelos Nature Park — Website & CMS Design

- **Date:** 2026-11-17
- **Status:** Approved by the developer (repo owner), 2026-11-17
- **Source brief:** the owner's "Master Development Prompt" (summarised here; this document is the source of truth from now on)
- **Visual reference:** [`docs/reference/visual-reference.png`](../../reference/visual-reference.png)

---

## 1. Intent

Mondelos Nature Park (Kawayan, Biliran, Philippines) needs an official website that makes people **want to visit**. A visitor should feel the park's warmth, calm and natural beauty within seconds of landing, then quickly find out where it is, what is there and how to get in touch.

The park owner must be able to keep the site current without a developer: change text, swap photos, add attractions and reviews, and publish announcements through a simple admin area at `/admin`.

**Stage:** the first release is a demo, built by the developer to show the park's owners. It must still be production-quality, so it can go live as-is once they adopt it.

Most visitors will arrive from links shared on Facebook and from Google Maps, mostly on phones. This drives two decisions: mobile-first layouts, and link previews (title, description and image per page) that work without JavaScript.

## 2. Goals, non-goals, anti-goals

### Goals
1. A premium, warm, photo-led public site with five pages (Home, Discover, Gallery, About, Visit Us) plus a detail page for each attraction.
2. Visual language that follows the reference image closely (see §5).
3. A small, practical CMS covering the content listed in §8, with image upload.
4. Security that holds even if the frontend is bypassed: Row Level Security on every table, admin-only writes, and no service-role key in the browser.
5. A contact form that stores messages safely, plus a small admin inbox for reading them.
6. Good SEO and Core Web Vitals: pre-rendered pages, per-page meta and Open Graph tags, a sitemap, optimised images.
7. Deployed on Vercel with Supabase as the backend, on Supabase's free tier.

### Non-goals (first release — future paid enhancements)
Online booking (rooms, tables, events), payments and checkout, customer accounts, automated email notifications, live chat, virtual tours, advanced analytics, a weather widget.

### Anti-goals (would be a failure even if everything "works")
- **Fabricated content.** No invented facilities, prices, hours, reviews, reviewer names or stories. No AI or stock photo presented as the real park.
- **Generic template feel.** No SaaS-style gradients, glassmorphism, rounded-everything cards, neon or dashboard look on the public site.
- **Showy motion.** Heavy animation that slows phones or ignores reduced-motion settings.
- **A CMS the owner can't use.** Overbuilt forms, jargon, or anything that needs SQL for everyday edits.
- **Security shortcuts.** Disabling RLS "to make it work", or trusting frontend role checks.

## 3. Constraints

| Area | Constraint |
|---|---|
| Frontend | React 19, TypeScript (strict), Vite, Tailwind CSS 4, Lucide React icons |
| Routing / rendering | React Router v7 in framework mode (Vite plugin), `ssr: false`, with pre-rendering (see §4) |
| Backend | Supabase: Postgres, Auth, Storage. Free tier, so **no** Supabase image transformations |
| Hosting | Vercel (static output) |
| Tooling | ESLint, Prettier, Vitest + Testing Library, environment variables via `.env` (never committed) |
| Secrets | Only the Supabase URL and the anon/publishable key are allowed in frontend code. The service-role key never enters the repo or Vercel frontend env |
| Content honesty | Placeholders are clearly marked as placeholders (§11) |
| Repo | `github.com/emannnnn23/Mon-delo-Nature-Park`, default branch `main`. Each phase is built on its own branch and goes in through a pull request that the owner merges |
| Accounts (demo stage) | This first build is a **demo** that the developer (repo owner) will show to the park's owners. The developer creates the Supabase project first, and the Vercel project later, under their own accounts. Migrations are applied by hand with `supabase db push` after each merge. Automating migrations in CI and transferring the projects to the client are deferred until the client takes the site on |
| Local machine | Keep local load low: run typecheck, lint and the touched tests locally. CI runs the full suites. Start local Supabase (Docker) only for database/RLS work and stop it afterwards |
| Commits | No AI attribution lines in commits, PRs or code comments (owner's standing rule) |

## 4. Approaches considered

**Chosen: pre-rendered public pages (option 1).**

| Option | How it works | Trade-off |
|---|---|---|
| **1. Pre-rendered public pages** ✅ | React Router v7 framework mode with `ssr: false` and a `prerender` list. Each public route is emitted as its own HTML file with real content and per-page `<title>`, description and Open Graph tags. After load, the page fetches the latest published content from Supabase, so CMS edits appear without a rebuild. `/admin/*` is client-only (SPA fallback). | A bit more setup. Link-preview text and image for a page refresh only on the next deploy |
| 2. Plain single-page app | One `index.html`, everything rendered in the browser | Simplest, but every shared Facebook link shows the same generic preview, and crawlers see an empty page first |
| 3. Switch to Next.js / SSR server | Server-rendered on every request | Contradicts the agreed stack and adds a server to run. Rejected |

**Why option 1:** the owner picked it. Facebook link previews only read static HTML, and most traffic is expected to come through Facebook shares.

**How it must behave:**
- **Two loaders per public route.**
  - A build-time `loader` fetches published content with the anon key. It is used only while pre-rendering.
  - A `clientLoader` with `clientLoader.hydrate = true` (and **no** `HydrateFallback` on public routes) fetches straight from Supabase. It never calls `serverLoader`, because with `ssr: false` a plain `loader` would serve the stale build-time `.data` file on client navigation.
  - The pre-rendered HTML therefore contains real content. Hydration then refreshes it, and every client navigation gets fresh data.
- **Build failure policy.**
  - When `VERCEL_ENV === 'production'`, a failed or empty content fetch **fails the build**. Vercel keeps the last good deployment live, and Facebook never caches placeholder pages.
  - Local and preview builds fall back to bundled placeholder content.
- **Pre-render list:** `/`, `/discover`, `/gallery`, `/about`, `/visit`, `/404`, plus `/discover/:slug` for each attraction published at build time.
- **Attraction detail route.**
  - Attractions published after a deploy are served by the SPA fallback; the route's `clientLoader` fetches them by slug from Supabase.
  - The route must also build when **zero** attractions are published (the launch state).
  - Unknown slugs render the 404 page.
- **Vercel routing** (`vercel.json`):
  - Pre-rendered files are served first.
  - Only `/admin/*` and `/discover/*` are rewritten to the SPA fallback HTML.
  - Every other unmatched path gets the pre-rendered `404.html` with a real 404 status.
- **Rebuilds.** A scheduled GitHub Actions workflow calls a Vercel **Deploy Hook** once a day (around 03:00 Asia/Manila) and can also be run by hand (`workflow_dispatch`).
  - This refreshes link previews and pre-renders newly published attractions.
  - It doubles as a keep-alive: free-tier Supabase projects pause after about a week without activity.
  - The hook URL is stored only as a GitHub Actions secret.
  - An in-admin "Rebuild now" button is a possible later addition (it would need a Supabase Edge Function). It is not in the first release.
- **Phase 1 spike (must pass before Phase 2).** A throwaway proof of all of the above:
  - pre-rendered content in the HTML, hydration refresh and client-navigation refresh;
  - a non-pre-rendered slug working through the fallback;
  - a successful build with zero slugs;
  - a real 404 status on Vercel.

  Any failure comes back to the owner before the design changes.

## 5. Visual design

### 5.1 How the reference maps onto the site

The reference is one dense screen. The real homepage keeps its look but gives each section room, in this order:

```
┌ Nav: transparent over hero → solid deep green after scroll ──────────────────┐
│ HERO (dark photo, subtle overlay)                                            │
│   📍 Kawayan, Biliran, Philippines (pill)  ───── gold hairline               │
│   "Find Your Peace" (ivory serif) / "in Nature." (gold serif)                │
│   italic serif intro line                                                    │
│   [Explore the Park →] (gold pill)   [Plan Your Visit] (outlined pill)       │
│   scroll indicator (mouse icon + "Scroll Down")                              │
├ ANNOUNCEMENT strip (only when one is active) ─────────────────────────────────┤
│ IVORY  "WELCOME TO" eyebrow + hairline / park name / intro / [Learn More →]  │
│        Experience cards ×N (image, round green icon badge on the image edge, │
│        serif title, 2-line text)                                             │
│ IVORY  Discover the Park: editorial attraction cards → /discover/:slug       │
│ GREEN  Our Gallery (asymmetric mosaic + [View Gallery →])                    │
│        │ What Our Guests Say: Google 4.6/5 ★ (70 reviews), quote slider      │
│ IVORY  Visit Us: address, map embed, [Get Directions →], contact, socials    │
│ GREEN  Footer: logo + tagline · nav · contact · socials · © year             │
└──────────────────────────────────────────────────────────────────────────────┘
```

On desktop, Gallery and Testimonials share one green band, as in the reference. On mobile they stack.

**Deliberate deviations from the reference**

| Reference shows | Site does | Why |
|---|---|---|
| "Watch Tour" secondary CTA | "Plan Your Visit" → `/visit` | Virtual tours are out of scope |
| A named guest quote | Only testimonials the admin enters from real reviews. When there are none, the block shows the rating and a "Read reviews on Google" link | No fabricated testimonials |
| Gardens / Scenic Views / Dining / Pool cards | Seeded **published but flagged `is_sample`**. Each shows a small "Sample" tag until the admin confirms it (which clears the flag) or deletes it | The demo must look complete, while never passing off unconfirmed facilities as fact |
| Photorealistic park photos | Neutral placeholders until the client supplies photos | Reference images look AI-generated |
| Mountain-and-sun logo | A simple SVG mark plus a "MONDELOS / NATURE PARK" wordmark drawn in code, replaced when the client supplies a logo | No official logo yet |

### 5.2 Design tokens (Tailwind 4 `@theme`)

| Token | Value | Use |
|---|---|---|
| `forest-900` | `#183F32` | Primary dark bands, nav when solid, footer |
| `forest-800` | `#244B3A` | Hover / secondary dark surfaces |
| `ivory-50` | `#F8F5EC` | Main light background |
| `cream-100` | `#EEE8D9` | Cards, alternate light bands |
| `gold-500` | `#D6AA55` | Primary buttons, "in Nature." line, active nav underline, hairlines |
| `earth-600` | `#806B50` | Eyebrows, small accents |
| `ink-900` | `#262923` | Body text on light |
| `ink-500` | `#77786F` | Muted text |

The builder may derive a few tints and shades for hover and border states. **Contrast rule:** body text must meet WCAG AA on its background. Gold is used for large text, buttons with dark text, and decoration. Gold must never be used for small body text on ivory.

**Typography**
- **Headings:** Playfair Display (matches the reference's high-contrast serif). Italic Playfair is used for the hero intro and the footer tagline.
- **Body and UI:** DM Sans.
- Both fonts are self-hosted via `@fontsource` (no runtime Google Fonts request), subset to Latin, with `font-display: swap`. Only the two heading/serif files the hero needs are preloaded.
- **Scale:** fluid with `clamp()`. The hero heading is roughly 40px on phones and 88px on wide screens.
- **Eyebrows:** small uppercase sans with wide letter-spacing, followed by a gold hairline.

**Shape and texture**
- Buttons are pills. Cards use a small radius (6–8px) with a soft warm shadow.
- Section edges carry faint leaf silhouettes (inline SVG, `aria-hidden`, low opacity) like the reference's corners. These are decorative only and hidden on small screens if they crowd the content.
- The hero overlay is a dark gradient from left and bottom, so text stays readable on any photo.

**Motion**
- Fade-and-rise on scroll (IntersectionObserver + CSS), gentle image reveal, and hover transitions on buttons and cards.
- The mobile menu slides in.
- No Framer Motion unless a later need clearly requires it.
- Everything is disabled under `prefers-reduced-motion: reduce`.

### 5.3 Responsive behaviour
- **Breakpoints:** Tailwind defaults (`sm` 640, `md` 768, `lg` 1024, `xl` 1280).
- **Nav:** below `lg`, the links collapse into a full-height slide-in menu with large touch targets and the Plan Your Visit CTA at the bottom. Focus is trapped while it's open; Esc closes it.
- **Hero:** `100svh` on phones (min 560px), about 88vh on desktop. Each hero image has an admin-set focal point (`object-position`) so phone crops keep the subject.
- **Experience and attraction cards:** a horizontal scroll-snap row on phones, 2 columns on tablet, 4 (experiences) or a 3-column editorial grid (attractions) on desktop.
- **Gallery mosaic:** 2 columns on phones, an asymmetric grid on desktop.
- **Touch targets:** at least 44×44px.

## 6. Pages and routes

| Route | Content |
|---|---|
| `/` | Homepage as in §5.1 |
| `/discover` | Intro, then published attractions (cover, name, summary), then published experiences |
| `/discover/:slug` | Attraction detail: cover, name, full description, additional images (lightbox), back link |
| `/gallery` | Category filter (chips, "All" default, filter state in `?category=` for shareable URLs), responsive masonry grid, captions, fullscreen lightbox (keyboard, swipe, Esc, focus return), lazy loading |
| `/about` | Introduction, story and background, mission and vision (each only if content exists), natural surroundings, facilities and highlights (links to Discover) |
| `/visit` | Full address and plus code, Google Maps embed, Get Directions, contact details, opening hours (if supplied), FAQ (if any are published), contact form |
| `*` | Friendly 404 in the site's style |
| `/admin/login` | Email and password sign-in |
| `/admin` | Dashboard |
| `/admin/*` | CMS sections (§8) |

**Navigation:** Home, Discover, Gallery, About, Visit Us, plus a **Plan Your Visit** CTA linking to `/visit`. The active link gets a gold underline, as in the reference.

**Empty states:** a public section whose content set is empty is hidden entirely; the page never shows an empty heading. The admin dashboard tells the owner what is still missing.

## 7. Data model (Postgres)

All tables share these conventions:
- `id uuid primary key default gen_random_uuid()`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`, maintained by a shared `set_updated_at()` trigger
- Content tables also have `is_published boolean not null default false` and `sort_order int not null default 0`

| Table | Key columns | Notes |
|---|---|---|
| `profiles` | `id` (FK `auth.users`, PK), `full_name`, `role text check (role in ('admin'))` | One row per admin. Created by the setup process (§9.4) |
| `site_settings` | Single row, enforced by `singleton boolean primary key default true check (singleton)`. Columns: `park_name`, `tagline`, `short_description`, `address_line`, `plus_code`, `latitude`, `longitude`, `maps_embed_url`, `maps_listing_url`, `phone`, `email`, `opening_hours` (text), `facebook_url`, `instagram_url`, `tiktok_url`, `youtube_url`, `google_rating numeric(2,1)`, `google_review_count int`, `default_og_media_id` | "Contact information" in the CMS edits this row. No `is_published`; it is always public |
| `media` | `storage_base_path`, `alt_text` (required, non-empty), `width`, `height`, `variants jsonb` (width → path), `focal_x`, `focal_y` (0–100), `original_filename` | One row per uploaded image. Every other table references images through `media_id` |
| `page_sections` | `page text check (page in ('home','about','visit'))`, `key text`, `eyebrow`, `heading`, `body`, `cta_label`, `cta_href`, `media_id`, `is_published`, `sort_order`; `unique (page, key)` | Editable text blocks. Homepage keys: `hero`, `intro`, `discover`, `gallery`, `testimonials`, `visit`. About keys: `intro`, `story`, `mission`, `vision`, `surroundings`. Visit keys: `intro`, `getting_here` |
| `attractions` | `kind text check (kind in ('attraction','experience'))`, `slug unique`, `name`, `summary` (≤160 chars), `description`, `icon` (one of a fixed list of Lucide icon names), `cover_media_id`, `is_featured`, `is_published`, `sort_order` | Experiences are short cards with icons. Attractions get a detail page |
| `attraction_images` | `attraction_id` (FK, cascade), `media_id`, `caption`, `sort_order` | Additional images for a detail page |
| `gallery_categories` | `name`, `slug unique`, `is_published`, `sort_order` | |
| `gallery_images` | `media_id`, `category_id` (FK, `on delete set null`), `caption`, `is_featured` (homepage mosaic), `is_published`, `sort_order` | |
| `testimonials` | `author_name`, `quote`, `rating smallint check 1–5` (nullable), `source text check in ('google','facebook','direct')`, `source_url`, `review_date`, `is_published`, `sort_order` | Admin form reminds the owner to use only real reviews, with permission |
| `announcements` | `title`, `body`, `link_label`, `link_href`, `starts_at`, `ends_at` (nullable), `is_published` | Public site shows the newest published one whose date window covers now |
| `faqs` | `question`, `answer`, `is_published`, `sort_order` | Shown on `/visit` only if any are published |
| `contact_messages` | `full_name`, `email`, `phone`, `subject`, `message`, `status text check in ('new','read','archived') default 'new'`, `submitted_at` | Length and format checks in constraints (§9.3) |

**Relationships:**
- `media` is referenced with `on delete restrict`, so a photo that is still in use cannot be deleted. The admin UI explains where it is used.
- `attraction_images` cascades when its attraction is deleted.

**Indexes:**
- `(is_published, sort_order)` on each content table
- Unique `slug` columns
- Every foreign key column
- `contact_messages (status, submitted_at desc)`

**View:** `recent_content_updates` is a `union all` of `(table, id, title, updated_at)` across content tables, ordered by `updated_at desc`, limited to 10. It feeds the dashboard.
- It is created with `security_invoker = true` **and** filtered by `where public.is_admin()`.
- `select` on it is revoked from `anon`.
- Without these, published rows would leak through it to the public.

## 8. CMS (`/admin`)

**Look:** a clean, practical interface using the same fonts and palette, but neutral (ivory background, forest sidebar). No marketing styling. On phones the sidebar becomes a top bar with a menu, and tables become stacked cards.

| Section | What the admin can do |
|---|---|
| Dashboard | Counts: published attractions, gallery images, published announcements, new messages. List of the 10 most recent content updates. A "still missing" checklist of placeholder content (§11) |
| Homepage | Edit each homepage section (text, CTA, image, publish toggle) |
| About | Edit About sections |
| Attractions & experiences | List, create, edit, delete, reorder (up/down buttons, no drag-and-drop required), publish/unpublish, set featured, pick icon, cover image, additional images |
| Gallery categories | CRUD, reorder, publish |
| Gallery images | Upload (multi-file), caption, category, featured, publish, reorder, delete |
| Testimonials | CRUD, publish, reorder |
| Announcements | CRUD, date window, publish |
| FAQs | CRUD, publish, reorder |
| Contact & settings | Edit `site_settings` (address, map links, phone, email, hours, socials, Google rating and count, default share image) |
| Messages | Inbox: list (new first), open, mark read/archived, delete |
| Media library | Grid of all uploads with alt text. Edit alt text and focal point, delete if unused |

**Shared admin behaviours:**
- Every form validates on the client with Zod. The same rules exist as database constraints.
- Saving shows clear success or error messages.
- Deletes ask for confirmation.
- Unsaved-change guard on navigation.
- An image picker opens the media library or uploads a new image inline.

**Upload pipeline (in the browser, before upload):**
1. **Accept:** JPEG, PNG or WebP up to 15 MB. Anything else is rejected with a clear message.
2. **Decode** with `createImageBitmap`. Reject images smaller than 800px on the long edge for hero/cover use (warning only for gallery).
3. **Re-encode** to WebP at widths 480, 960, 1600 and 2400 (skipping widths larger than the original), quality about 0.8.
   - Re-encoding strips EXIF, including GPS location.
   - **Safari fallback:** Safari's canvas `toBlob` quietly returns PNG for WebP. If the returned blob's type is not `image/webp`, encode JPEG at about 0.82 instead.
   - `variants` records each variant's real path, so the public site never assumes an extension.
4. **Upload** to bucket `media` at `{yyyy}/{slug-from-alt-or-filename}-{6-char-id}-{width}.{webp|jpg}`, so filenames are descriptive.
5. **Insert** the `media` row with dimensions and variants. Alt text is required before saving.
6. **Rollback:** if any step fails, already-uploaded variants are removed.

**Public images:** the `<ResponsiveImage>` component renders `srcset`/`sizes` from `variants`, sets `width`/`height` to avoid layout shift, uses `loading="lazy"` except the hero (`fetchpriority="high"`), and applies the focal point.

## 9. Security

### 9.1 Roles
- **Public (anon):** reads published content only, and submits the contact form through one function.
- **Admin:** an authenticated user who has a `profiles` row with `role = 'admin'`.
- `public.is_admin()` is a `security definer`, `stable` function with `search_path` set to empty. It returns true when that row exists for `auth.uid()`.
- Every write policy uses `is_admin()`. The frontend route guard is only a convenience; the database is the real gate.

### 9.2 Row Level Security (enabled on every table)

| Table | anon / authenticated non-admin | admin |
|---|---|---|
| Content tables (`page_sections`, `attractions`, `attraction_images`*, `gallery_categories`, `gallery_images`, `testimonials`, `announcements`, `faqs`) | `select` where `is_published` (announcements also within their date window) | full CRUD |
| `site_settings` | `select` | `select`, `update` |
| `media` | `select` on all rows and columns (paths, alt text, dimensions, focal point; nothing sensitive, and files are public by URL anyway) | full CRUD |
| `contact_messages` | **no direct access** (insert only via the function in §9.3) | `select`, `update`, `delete` |
| `profiles` | own row `select` | own row `select`; role changes only via SQL/setup |
| `recent_content_updates` (view) | none: grant revoked, and the view filters on `is_admin()` | `select` |

\* `attraction_images` is readable when its parent attraction is published.

### 9.3 Contact form
`public.submit_contact_message(full_name, email, phone, subject, message, honeypot, elapsed_ms)` is a `security definer` function granted to `anon`. Direct insert is revoked. The function:
- Silently accepts but discards the message when the hidden `honeypot` field is filled or when the form was submitted in under 3 seconds.
- Validates lengths: name 2–100, subject 2–150, message 10–5000, phone ≤30 with a digits/spaces/`+()-` pattern. It validates email format with a pragmatic regex. All of these are also `check` constraints on the table.
- Rate-limits: at most 3 messages per email address per hour, and 50 in total per hour. Over the limit it returns a friendly "please try again later" error.
- Stores trimmed text only. Nothing is ever rendered as HTML in the admin.

### 9.4 Admin accounts (no public registration)
- **Public sign-up is turned off.** Supabase Dashboard → (project) → **Authentication** → **Sign In / Providers** → turn off **"Allow new users to sign up"**. The builder confirms the exact label at implementation time.
- **Adding an admin:**
  1. The owner adds the user in Supabase Dashboard → **Authentication** → **Users** → **Add user** → **Create new user** (email and password, auto-confirm).
  2. The owner runs the documented SQL snippet in **SQL Editor**: `insert into profiles (id, full_name, role) select id, '<name>', 'admin' from auth.users where email = '<email>';`
  3. These steps live in `docs/admin-setup.md`.
- **Sessions:** the Supabase JS client persists and refreshes the session. Logout clears it. An expired session sends the admin back to `/admin/login` with a message.

### 9.5 Storage
- **Bucket `media`** is public for read (needed for fast, cacheable public images). It allows only `image/webp`, `image/jpeg` and `image/png`, with a file size limit of 5 MB per variant.
- **Write rules:** `storage.objects` insert/update/delete policies on bucket `media` require `is_admin()`.
- **Accepted risk:** an unpublished item's image is reachable if someone knows its exact URL. Paths contain random ids, so this is acceptable for a park website.

### 9.6 How RLS is implemented and verified (nothing relies on Supabase defaults)

**In the migrations** (`supabase/migrations/`, version-controlled; nothing configured by hand in the dashboard):
1. Every table runs `alter table … enable row level security` in the **same migration that creates it**.
2. **Explicit grants, not defaults.** Supabase grants `anon` and `authenticated` broad privileges on `public` by default. Every migration therefore runs:
   - `revoke all on <table> from anon, authenticated`;
   - then grants only what that role needs (for example `grant select on attractions to anon`).

   Default privileges for new tables in `public` are also revoked, so a forgotten grant fails closed.
3. **One policy per operation per role.** Policies are written separately for `select`, `insert`, `update` and `delete`, each naming its role (`to anon`, `to authenticated`). Writes always have both `using` and `with check`. There are no `for all` catch-all policies and no `using (true)` on writes.
4. **Admin checks live in the database.** `is_admin()` runs as `security definer` with `set search_path = ''` and fully qualified names. `execute` on it is revoked from `public` and granted only to the roles that need it. The contact function follows the same pattern.
5. **Storage** is set up in a migration too. The `media` bucket (with its MIME and size limits) is created there, and explicit `storage.objects` policies are scoped to `bucket_id = 'media'`: public read, admin-only insert, update and delete.
6. **The view** `recent_content_updates` uses `security_invoker` plus the `is_admin()` filter, and `anon` has no grant (§7).

**In the tests** (pgTAP, `supabase/tests/`, run by `supabase test db`):
- **A catch-all guard.** A test queries `pg_class` and fails if **any** table in `public` has RLS disabled, or has no policies. This catches tables added later.
- **Policy inventory.** `policies_are()` per table, so an unexpected extra policy fails the suite.
- **Behaviour tests per role.** Each runs as `anon`, as an authenticated **non-admin**, and as an admin, by switching `set local role` and `request.jwt.claims`. Each role checks:
  - which rows `select` returns (published versus unpublished, and the announcement date window);
  - that inserts, updates and deletes are rejected or allowed as §9.2 says;
  - that a non-admin can't make themselves admin through `profiles`;
  - that the dashboard view returns nothing to non-admins.
- **Storage.** Anon and non-admin uploads and deletes on `media` are rejected; admin uploads succeed.
- **Contact function.** Valid input is stored. Each invalid field is rejected. The honeypot and minimum fill time discard the message. Rate limits trigger. Anon cannot read `contact_messages` or insert into it directly.
- **Linting.** `supabase db lint` and the Security Advisor checks must come back clean before each phase that touches the database is reported done.

### 9.7 Secrets and headers
- `.env` holds `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (the publishable key). It is git-ignored, and `.env.example` documents both.
- `vercel.json` sets the security headers `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` and `frame-ancestors 'none'`.
- **Content-Security-Policy:**
  - React Router puts inline scripts into pre-rendered HTML, and static files have no per-request nonce.
  - So a post-build script computes SHA-256 hashes of every inline script in each HTML file and injects a `<meta http-equiv="Content-Security-Policy">` tag.
  - The policy allows `'self'` plus those hashes for scripts, the Supabase URL for `connect-src` and `img-src`, and Google Maps for `frame-src`.
  - `'unsafe-inline'` for scripts is not allowed.
  - A test over the build output checks that every inline script's hash is present.

## 10. SEO, performance, accessibility

**SEO**
- Each route's `meta` export sets the title (`<Page> · Mondelos Nature Park`), meta description, canonical URL, and Open Graph/Twitter tags (image from section media or `default_og_media_id`).
- `robots.txt` disallows `/admin`.
- `sitemap.xml` is generated at build time from the pre-render list.
- `TouristAttraction` JSON-LD on the homepage, built from `site_settings`.
- Semantic landmarks (`header`, `nav`, `main`, `footer`), one `h1` per page, logical heading order.

**Performance targets on a mid-range phone (Lighthouse mobile):**
- LCP under 2.5 s, CLS under 0.1, INP under 200 ms
- Hero image preloaded
- Google Maps iframe lazy-loaded with `loading="lazy"`
- Admin code split from the public bundle

**Accessibility:** WCAG 2.1 AA.
- Visible focus rings (gold on dark, forest on light)
- Skip link
- Labelled form fields with inline errors linked through `aria-describedby`
- Testimonial slider pauses on hover and focus, has prev/next buttons, and never auto-advances under reduced motion
- Lightbox is a proper dialog

## 11. Placeholder content and the client checklist

**Sample content (owner's decision: show it all in the demo)**
- `page_sections`, `attractions` and `gallery_images` have an `is_sample boolean not null default false` column.
- Seed rows describing anything the client hasn't confirmed are **published with `is_sample = true`**. This covers the four experience cards (Beautiful Gardens, Scenic Views, Dining, Relaxing Pool), sample attractions, and About story, mission and vision text.
- The public site shows a small, unobtrusive "Sample" tag (earth-brown text on cream, sans, uppercase) on every sample item. Sample text is written to read as illustrative, never as specific factual claims: no prices, hours, capacities or names.
- In the admin, sample items carry a badge and a **"Mark as confirmed"** action that clears the flag. The dashboard's "still missing" list counts the remaining sample items.
- **Never sample:** testimonials (real only; with none, the block shows the rating and a "Read reviews on Google" link), contact details, opening hours and social links. When these are unknown, they are hidden.

**Placeholder images:** a neutral leaf-pattern tile labelled "Photo coming soon", generated in code. No external stock or AI image is used. The developer can upload real park photos, with the park's permission, through the admin.

**Real values seeded from the brief:**
- Google rating: 4.6 / 5 from 70 reviews
- Address: M8GV+8GP, Balaring Road, Kawayan, Biliran, Philippines
- Hero heading ("Find Your Peace in Nature.") and the intro copy

**Waiting on the client** (tracked in the dashboard's "still missing" list and in `docs/client-content-checklist.md`):
1. Logo files
2. Park photographs (hero, attractions, gallery)
3. Confirmed list of attractions and facilities, with descriptions
4. Real guest reviews, with permission to quote
5. Phone, email and opening hours
6. Social media URLs
7. Official Google Maps listing URL
8. Park story, mission and vision
9. FAQs
10. Production domain

## 12. Testing strategy

| Layer | Tooling | Where it runs |
|---|---|---|
| Unit (validation schemas, image-variant math, slug/filename helpers, date-window logic) | Vitest | Locally (touched tests) + CI |
| Components (nav, forms, lightbox, gallery filter, empty states) | Vitest + Testing Library (jsdom) | Locally (touched tests) + CI |
| Database: RLS, constraints, contact function, rate limits | pgTAP via `supabase test db` against local Supabase | Locally only during DB tasks (stop Docker after) + CI |
| Build: pre-render output contains meta tags and content; sitemap present | Vitest over the build output | CI |
| Smoke E2E (home loads, nav works, contact form validation, admin login guard) | Playwright, Chromium, 2 viewports | CI only |
| Visual and responsive QA | Manual review at 375, 768, 1024 and 1440 px against the reference | Phase 5 checklist |

**CI** (GitHub Actions on pull requests): typecheck, lint, Prettier check, unit and component tests, `supabase test db`, build, Playwright smoke.

## 13. Delivery phases

Each phase is built on its own branch and merged by the owner through a pull request. Each phase ends with a report: work completed, files changed, outstanding tasks, tests run (with results), and issues needing attention.

1. **Foundation:** scaffold, tooling, CI, design tokens and fonts, Supabase project link, full schema with RLS, storage and pgTAP tests, seed data, project `AGENTS.md`/`CLAUDE.md`.
2. **Public UI:** layout, nav and footer, all public pages built against typed placeholder data, responsive behaviour, motion, lightbox.
3. **CMS:** auth and guard, admin layout, media pipeline, CRUD screens, inbox, dashboard.
4. **Integration:** data services, pre-render loaders and client refresh, contact form wiring, loading, error and empty states, SEO assets.
5. **Quality assurance:** full test pass, RLS verification, accessibility audit, Lighthouse, responsive review, fixes.
6. **Deployment:** Supabase production settings, Vercel project and env, domain and HTTPS, production smoke test, `docs/admin-setup.md` and handover.

## 14. Decisions taken for the owner (please check)

- Experiences live in the `attractions` table with `kind = 'experience'`, not a separate table.
- Images go through one `media` table, and deletion is blocked while an image is in use.
- Image variants are made in the browser (free tier). Originals are not stored.
- An admin **Messages** inbox and a **FAQs** section are added. Without them, stored messages are unreadable and the "FAQ if supplied" item has no home.
- Announcements show as a slim strip under the nav on every public page while active.
- Spam protection is a honeypot, a minimum fill time and a database rate limit. A captcha can be added later.
- Fonts are Playfair Display and DM Sans, self-hosted.
- Framer Motion is not used.
- The testimonial slider shows a single quote at a time, as in the reference.
- Link previews and newly published attraction pages refresh through a **daily scheduled rebuild** (plus a manual run from GitHub). It also keeps the free Supabase project from pausing. There is no in-admin rebuild button in the first release.
- **Production builds fail rather than ship placeholders** when Supabase can't be reached. The live site stays on the last good version.
- **Safari uploads fall back to JPEG variants**, because Safari can't encode WebP from a canvas.
- **CSP is delivered as a per-build `<meta>` tag with script hashes**, not as a static header.
- *(Owner's decision)* **Unconfirmed content is shown in the demo as tagged "Sample"** instead of being hidden. *(Owner's decision)* **The developer owns the Supabase and Vercel accounts during the demo**, and migrations are applied by hand.

## 15. Left to the builder
- Component breakdown and file names within the agreed `src/` structure
- Exact spacing scale, shadow values and tint steps derived from the tokens
- Exact fluid type steps
- Implementation details of the lightbox, slider and scroll animations
- Seed placeholder wording beyond what the brief supplies
- The list of Lucide icons offered for experiences
- Exact pgTAP test cases (they must cover every policy in §9.2 and every rule in §9.3)
