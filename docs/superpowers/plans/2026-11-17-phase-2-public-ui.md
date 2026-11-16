# Phase 2 — Public UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every public page, built to match the visual reference and rendered from the typed placeholder content. The pages must be responsive, accessible and use only gentle motion.

**Architecture:** Route modules in `src/routes/` stay thin. In this phase each one returns `placeholders` from a `clientLoader`, and Phase 4 swaps in live data. They render presentational components from `src/pages/`, which compose `src/components/*`. Components receive domain types (`src/types/content.ts`) through props and never import Supabase.

**Tech Stack:** React 19, React Router 7, Tailwind 4, Lucide React, Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-11-17-mondelos-website-design.md`. The sections used here are §5, §6, §10 and §11.

## Global Constraints

Everything in [README → Global Constraints](README.md#global-constraints-apply-to-every-task-in-every-phase) applies. In addition:
- **Frontend design.** Before Task 2, load the `frontend-design` skill and keep `docs/reference/visual-reference.png` open. Match its composition, but follow the deviations in spec §5.1.
- **Copy.** Use the exact copy from the README. Never add text that states facts about the park.
- **Touch targets:** at least 44×44px. Only one `h1` per page.

## Review Focus
1. **A very long CMS title or name** (for example, 80 characters in an attraction name or section heading) must wrap without overflowing cards or the hero on a 375px screen. → Task 4 and Task 5 test it.
2. **An empty content set** (no attractions, no gallery images, no FAQs) must hide its whole section, with no orphan heading. → Tasks 4–7 test it.
3. **A keyboard-only user** must be able to open and close the mobile menu and the lightbox, and focus must return to the trigger. → Task 3 and Task 6 test it.
4. **Reduced motion** must stop the slider's auto-advance and the reveal animations, so content is visible immediately. → Task 2 and Task 4 test it.
5. **An unknown gallery `?category=` slug** must fall back to "All", not show an empty grid. → Task 6 tests it.

---

### Task 1: Public layout route and placeholder-backed route modules

**Files:**
- Modify: `src/routes.ts`
- Create: `src/routes/_public.tsx`; `src/routes/home.tsx`, `discover.tsx`, `discover.$slug.tsx`, `gallery.tsx`, `about.tsx`, `visit.tsx`, `not-found.tsx` (each a stub page rendering its `h1`)
- Create: `src/lib/meta.ts`
- Test: `src/lib/meta.test.ts`, `src/routes/routes.test.ts`

**Interfaces:**
- Produces: the routes in `routes.ts`:
  - `layout('routes/_public.tsx', [index('routes/home.tsx'), route('discover','routes/discover.tsx'), route('discover/:slug','routes/discover.$slug.tsx'), route('gallery','routes/gallery.tsx'), route('about','routes/about.tsx'), route('visit','routes/visit.tsx'), route('404','routes/not-found.tsx'), route('*','routes/not-found.tsx', { id: 'catch-all' })])`
  - Admin routes are added in Phase 3.
- Produces: `buildMeta(input: { title?: string; description: string; path: string; image?: string | null; siteUrl: string }): MetaDescriptor[]`.
  - The title is `"<title> · Mondelos Nature Park"`, or `"Mondelos Nature Park — Kawayan, Biliran"` when `title` is undefined.
  - It returns `description`, a canonical `link` (`siteUrl + path`), `og:title`, `og:description`, `og:url`, `og:type=website`, `og:image` (when an image is given), `twitter:card=summary_large_image`, and `og:locale=en_PH`.
- Produces: `SITE_URL` in `src/lib/meta.ts`, read from `import.meta.env.VITE_SITE_URL`, defaulting to `https://mondelos-nature-park.vercel.app`. Add the variable to `.env.example`.

- [ ] **Step 1: Write the failing meta tests.**
  - `buildMeta({ title: 'Gallery', description: 'd', path: '/gallery', siteUrl: 'https://x.ph' })` contains `{ title: 'Gallery · Mondelos Nature Park' }`, `{ property: 'og:url', content: 'https://x.ph/gallery' }` and `{ tagName: 'link', rel: 'canonical', href: 'https://x.ph/gallery' }`.
  - Without a `title`, it uses the home title.
  - Without an `image`, there is no `og:image` entry.
- [ ] **Step 2: Write the failing route test.** `routes.test.ts` uses `createRoutesStub` to render each path (`/`, `/discover`, `/discover/x`, `/gallery`, `/about`, `/visit`, `/nope`) and asserts exactly one `h1`.
- [ ] **Step 3:** Run `npx vitest run src/lib/meta.test.ts src/routes`. Expected: FAIL.
- [ ] **Step 4:** Implement `buildMeta`, `routes.ts`, the `_public.tsx` `<Outlet/>` wrapper and the stubs. Each stub exports `meta` via `buildMeta` and a `clientLoader` returning the relevant `placeholders` slice.
- [ ] **Step 5:** Run `npx vitest run src/lib/meta.test.ts src/routes`. Expected: PASS.
- [ ] **Step 6: Commit:** `feat: public route tree and meta helper`.

---

### Task 2: Common primitives

**Files:**
- Create: in `src/components/common/`: `Button.tsx`, `Eyebrow.tsx`, `SectionHeading.tsx`, `SampleTag.tsx`, `PlaceholderImage.tsx`, `ResponsiveImage.tsx`, `Logo.tsx`, `LeafDecor.tsx`, `Reveal.tsx`, `MapEmbed.tsx`
- Create: `src/utils/imageVariants.ts`, `src/lib/supabase.ts` (client factory only), `src/hooks/usePrefersReducedMotion.ts`, `src/hooks/useInView.ts`
- Test: `src/utils/imageVariants.test.ts`, `src/components/common/common.test.tsx`

**Interfaces:**
- Produces: `buildSrcSet(variants: Record<number, string>, toUrl: (path: string) => string): string`. Widths ascending, formatted `"<url> 480w, <url> 960w"`.
- Produces: `pickFallbackSrc(variants: Record<number,string>, target = 960): string`. Returns the smallest width ≥ target, or else the largest.
- Produces: `publicMediaUrl(path: string): string` in `src/lib/supabase.ts`, returning `${supabaseUrl}/storage/v1/object/public/media/${path}`. Also produces `getSupabase(): SupabaseClient<Database> | null`, a singleton that returns `null` when `getPublicEnv()` is null.
- Produces components:
  - `<Button variant="gold" | "outline-light" | "outline-dark" to? href? icon? />`. Renders a React Router `Link` for `to`, an `a` for `href`, and a `button` otherwise. Pill shape.
  - `<Eyebrow>` and `<SectionHeading as="h2" eyebrow? title subtitle? tone="light" | "dark" />`.
  - `<SampleTag />`. The text is "Sample", styled earth-700 on cream-100, uppercase.
  - `<PlaceholderImage label="Photo coming soon" className? />`. A CSS/SVG leaf-pattern tile with `role="img"` and an `aria-label`.
  - `<ResponsiveImage asset: MediaAsset | null sizes priority? className? />`. Falls back to `PlaceholderImage` when the asset is null. Sets `width`/`height` from the asset, `loading="lazy"` unless `priority` (then `fetchPriority="high"`), and `style.objectPosition = "${focalX}% ${focalY}%"`.
  - `<Logo tone="light" | "dark" />`. An inline SVG of a mountain and sun in gold and green, plus the "MONDELOS / NATURE PARK" wordmark, with an `aria-label`.
  - `<LeafDecor position="left" | "right" />`. Has `aria-hidden` and `hidden md:block`.
  - `<Reveal as? delay?>`. Fades and rises once in view (`useInView`, threshold 0.15). It renders already visible when `usePrefersReducedMotion()` is true or IntersectionObserver is missing.
  - `<MapEmbed src title />`. An iframe with `loading="lazy"`, `referrerPolicy="no-referrer-when-downgrade"` and a 4:3 (mobile) or 16:9 (`md`) aspect ratio. It renders nothing when `src` is null.

- [ ] **Step 1: Write the failing tests.**
  - `buildSrcSet({960:'b',480:'a'}, p => '/'+p) === '/a 480w, /b 960w'`.
  - `pickFallbackSrc({480:'a',1600:'c'}) === 'c'` and `pickFallbackSrc({480:'a'}) === 'a'`.
  - `ResponsiveImage` with a null asset renders an element with the accessible name "Photo coming soon". With an asset, it has `alt`, `srcset`, `width`, `height` and `loading="lazy"`; with `priority`, it has no `loading=lazy` and does have `fetchpriority="high"`.
  - `Reveal` under a mocked `matchMedia('(prefers-reduced-motion: reduce)')` that matches has no `opacity-0` class.
  - `Button` with `to="/visit"` renders a link with href `/visit`.
  - `SampleTag` has the text "Sample".
- [ ] **Step 2:** Run `npx vitest run src/utils/imageVariants.test.ts src/components/common`. Expected: FAIL.
- [ ] **Step 3:** Implement each file to the interfaces above.
- [ ] **Step 4:** Run the same command. Expected: PASS.
- [ ] **Step 5: Commit:** `feat: common UI primitives and responsive image`.

---

### Task 3: Layout — header, mobile menu, footer, announcement strip

**Files:**
- Create: `src/components/layout/SiteHeader.tsx`, `MobileMenu.tsx`, `SiteFooter.tsx`, `AnnouncementStrip.tsx`, `PublicLayout.tsx`
- Create: `src/hooks/useScrolled.ts`, `src/utils/dates.ts`
- Modify: `src/routes/_public.tsx` (renders `PublicLayout` with `settings` and `announcement` from its `clientLoader`)
- Test: `src/components/layout/layout.test.tsx`, `src/utils/dates.test.ts`

**Interfaces:**
- Produces: `NAV_LINKS = [{to:'/',label:'Home'},{to:'/discover',label:'Discover'},{to:'/gallery',label:'Gallery'},{to:'/about',label:'About'},{to:'/visit',label:'Visit Us'}] as const` in `SiteHeader.tsx`.
- Produces: `isWithinWindow(startsAt: string, endsAt: string | null, now: Date): boolean` in `utils/dates.ts`. It mirrors the SQL rule (starts ≤ now < ends); Phase 4 uses it to double-check the date window on the client.
- Produces: `<PublicLayout settings: SiteSettings announcement: Announcement | null overHero: boolean>`. It renders the skip link ("Skip to content" → `#main`), `SiteHeader`, `AnnouncementStrip`, `<main id="main">` and `SiteFooter`.
- **Header behaviour:**
  - When `overHero` is true, the header is transparent with ivory links until `useScrolled(24)`. Otherwise it is solid `forest-900`.
  - The active link gets a gold text colour and a 2px gold underline.
  - "Plan Your Visit" is a gold pill linking to `/visit`.
  - Below `lg`, a menu button opens `MobileMenu`.
- **MobileMenu:** `role="dialog"` with `aria-modal`. It slides in from the right, traps focus, closes on Esc, a link click or the close button, and returns focus to the menu button. Links are at least 44px tall, and the Plan Your Visit CTA sits at the bottom.
- **Footer:** Logo, the italic tagline "Nature. Relaxation. Unforgettable Moments." (from `settings.tagline`, or this string if null), the nav links, the address, phone and email only when non-null, social icons only for non-null URLs (Lucide `Facebook`, `Instagram`, `Youtube`; TikTok as an inline SVG), and "© {current year} Mondelos Nature Park. All rights reserved."

- [ ] **Step 1: Write the failing tests.**
  - `isWithinWindow('2026-01-01', null, new Date('2026-06-01'))` is true. `isWithinWindow('2026-01-01', '2026-02-01', new Date('2026-06-01'))` is false. A start in the future is false.
  - The header renders the 5 nav links plus "Plan Your Visit" linking to `/visit`. On `/gallery`, the Gallery link has `aria-current="page"`.
  - **Mobile menu (Review Focus #3):** click the menu button → a dialog is visible and focus is inside it. `userEvent.keyboard('{Escape}')` → the dialog is gone and focus is on the menu button.
  - The footer with `phone: null` has no `tel:` link. With `facebook` set, it has a link with the accessible name "Facebook". The copyright text contains the current year.
  - The announcement strip renders nothing for `null`, and renders the title plus a link when `linkHref` is set.
  - The skip link exists and targets `#main`.
- [ ] **Step 2:** Run `npx vitest run src/components/layout src/utils/dates.test.ts`. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run the same command. Expected: PASS.
- [ ] **Step 5: Commit:** `feat: site header, mobile menu, footer and announcement strip`.

---

### Task 4: Homepage

**Files:**
- Create: in `src/components/home/`: `Hero.tsx`, `IntroSection.tsx`, `ExperienceCards.tsx`, `DiscoverPreview.tsx`, `GalleryTestimonialsBand.tsx`, `TestimonialSlider.tsx`, `VisitSection.tsx`
- Create: `src/components/attractions/ExperienceCard.tsx`, `AttractionCard.tsx`, `src/components/attractions/iconMap.ts`
- Create: `src/pages/HomePage.tsx`
- Modify: `src/routes/home.tsx`
- Test: `src/components/home/home.test.tsx`

**Interfaces:**
- Consumes: Task 2 primitives, `MediaAsset` and the other types from Phase 1 Task 11.
- Produces: `HomePageProps = { settings: SiteSettings; sections: PageSection[]; experiences: Attraction[]; featuredAttractions: Attraction[]; galleryImages: GalleryImage[]; testimonials: Testimonial[] }`.
- Produces: `iconMap: Record<AttractionIcon, LucideIcon>`.
- Produces: `<AttractionCard attraction />`, linking to `/discover/${slug}`, and `<ExperienceCard attraction />`. Both show `SampleTag` when `isSample`.
- **Hero:**
  - Location pill: a `MapPin` icon in gold with the text "Kawayan, Biliran, Philippines".
  - `h1`: "Find Your Peace" (ivory), with a line break, then "in Nature." (gold `<span>`). The source is the `hero` section heading, split at " in ". If the admin's heading has no " in ", the whole heading renders ivory.
  - The section body is the italic serif intro.
  - Buttons: "Explore the Park" (gold) → `/discover`, and "Plan Your Visit" (outline-light) → `/visit`.
  - Scroll indicator: a mouse icon plus "Scroll Down", linking to `#welcome`. Its bounce animation is skipped under reduced motion.
  - Background: `ResponsiveImage priority` with `sizes="100vw"`, plus a left/bottom dark gradient overlay.
  - Height: `min-h-[560px] h-[100svh] lg:h-[88vh]`.
- **IntroSection** (`id="welcome"`): the eyebrow "WELCOME TO" with a hairline, `h2` = park name, the intro body, and an outline-dark "Learn More" button → `/about`.
- **ExperienceCards:** published experiences as cards — image, a round `forest-900` icon badge overlapping the image's bottom edge, a serif title and a two-line summary.
  - On phones: a horizontal scroll-snap row. On `md`: 2 columns. On `xl`: 4 columns.
  - The section is hidden when there are no experiences.
- **DiscoverPreview:** `h2` "Discover the Park" with up to 3 featured attractions (`is_featured`) in an editorial layout (one large card plus two stacked on `lg`), and a "See all attractions" link → `/discover`. Hidden when empty.
- **GalleryTestimonialsBand:** a `forest-900` band with `data-surface="dark"`.
  - Left: "Our Gallery", the subtitle from the `gallery` section, "View Gallery" → `/gallery`, and a mosaic of up to 5 featured images (grid-template-areas: 1 large plus 4 small on `lg`; 2 columns on phones).
  - Right: "What Our Guests Say", the Google "G" mark, `{rating} / 5`, 5 stars (filled according to the rating), "({count} reviews)", and `TestimonialSlider`.
  - When there are no testimonials, show a "Read reviews on Google" link to `settings.mapsListingUrl` instead (or no link if that is null).
- **TestimonialSlider:** one quote at a time, with prev/next buttons (`aria-label`s "Previous review" and "Next review"), dots, and the author as "— {authorName}".
  - It auto-advances every 7s, unless reduced motion is on or the slider is hovered or focused.
  - It uses `aria-live="polite"` only when auto-advance is off.
- **VisitSection:** `h2` "Visit Us", the address, `MapEmbed` (`settings.mapsEmbedUrl`), and a "Get Directions" gold button → `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(plusCode ?? addressLine)}` (opens in a new tab with `rel="noopener"`). It also shows phone and email when present.

- [ ] **Step 1: Write the failing tests** (render `HomePage` with `placeholders`, plus variants):
  - The `h1` text is "Find Your Peace in Nature." and "in Nature." is inside the gold span.
  - The "Explore the Park" link has href `/discover`, and "Plan Your Visit" (in the hero) has href `/visit`. No "Watch Tour" text exists anywhere.
  - Four experience cards are rendered, each with "Sample" visible.
  - With `testimonials: []`: the text "4.6 / 5" and "(70 reviews)" is present, and no `blockquote` exists.
  - With 2 testimonials: the first quote is visible. Clicking "Next review" shows the second. Under reduced motion, `vi.advanceTimersByTime(8000)` does **not** change the quote.
  - With `experiences: []`: no heading for the experiences section. With `featuredAttractions: []`: no "Discover the Park" heading. (Review Focus #2.)
  - The Get Directions href contains `destination=M8GV%2B8GP`.
  - With an 80-character attraction name, the card's title element has the `break-words` class. (Review Focus #1: a class assertion here; the visual check is in Task 8.)
- [ ] **Step 2:** Run `npx vitest run src/components/home`. Expected: FAIL.
- [ ] **Step 3:** Implement the components, `HomePage` and the route (the `meta` uses `buildMeta` with no title and the description from the `intro` body, truncated to 155 characters).
- [ ] **Step 4:** Run the same command. Expected: PASS.
- [ ] **Step 5: Commit:** `feat: homepage sections matching the visual reference`.

---

### Task 5: Discover and attraction detail pages

**Files:**
- Create: `src/pages/DiscoverPage.tsx`, `src/pages/AttractionPage.tsx`
- Modify: `src/routes/discover.tsx`, `src/routes/discover.$slug.tsx`
- Test: `src/pages/discover.test.tsx`

**Interfaces:**
- Produces: `DiscoverPageProps = { intro: PageSection | null; attractions: Attraction[]; experiences: Attraction[] }` and `AttractionPageProps = { attraction: Attraction }`.
- Produces: the detail route's `clientLoader`, which throws `data(null, { status: 404 })` when the slug is not found. `not-found.tsx` is reused as the route's `ErrorBoundary` content.
- **Layout:**
  - **Discover:** a page header band (`forest-900`, the serif `h1` "Discover the Park" with an intro line), an attractions grid (1 / 2 / 3 columns), then an "Experiences" section reusing `ExperienceCard`. Each section is hidden when empty.
  - **Detail:** a cover hero (60vh), `h1` = name, `SampleTag`, the description as paragraphs (split on blank lines, rendered as text, never HTML), a grid of additional images that opens `Lightbox` (built in Task 6; until then, a plain grid), and a "Back to Discover" link.

- [ ] **Step 1: Write the failing tests.**
  - Discover lists every placeholder attraction name. Each card links to `/discover/<slug>`.
  - The detail page for the first placeholder shows its name in the `h1` and "Sample". A description containing `<script>` is rendered as literal text.
  - The detail route with an unknown slug renders "Page not found".
  - With an 80-character name, the `h1` has `break-words` (Review Focus #1).
- [ ] **Step 2:** Run `npx vitest run src/pages/discover.test.tsx`. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run the same command. Expected: PASS.
- [ ] **Step 5: Commit:** `feat: discover and attraction detail pages`.

---

### Task 6: Gallery page with category filter and lightbox

**Files:**
- Create: `src/components/common/Lightbox.tsx`, `src/components/gallery/GalleryGrid.tsx`, `src/components/gallery/CategoryFilter.tsx`, `src/pages/GalleryPage.tsx`
- Modify: `src/routes/gallery.tsx`; `src/pages/AttractionPage.tsx` (use `Lightbox`); `GalleryTestimonialsBand.tsx` (the mosaic opens `Lightbox`)
- Test: `src/components/gallery/gallery.test.tsx`

**Interfaces:**
- Produces: `<Lightbox items: { image: MediaAsset; caption: string | null }[] index: number | null onClose(): void onIndexChange(i: number): void />`.
  - It is a `role="dialog"` with `aria-modal` and `aria-label="Image viewer"`.
  - It shows the largest variant, the caption, and a counter "3 / 12".
  - Keys: ←/→ navigate, Esc closes. Horizontal swipe ≥ 50px navigates. Focus is trapped while open and returned to the opener on close. Body scroll is locked while open.
- Produces: `resolveCategory(param: string | null, categories: GalleryCategory[]): string | null`. Returns the category id for a known slug, otherwise `null` (meaning "All").
- **Page:** `h1` "Gallery". Category chips are buttons with `aria-pressed`, with "All" first, and selecting one updates `?category=<slug>` (`useSearchParams`, `replace: true`).
  - The grid uses CSS columns: 2 on phones, 3 on `md`, 4 on `xl`. Each item is a button opening the lightbox, with the caption below in `ink-600`.
  - Images use `sizes="(min-width:1280px) 25vw, (min-width:768px) 33vw, 50vw"`.

- [ ] **Step 1: Write the failing tests.**
  - `resolveCategory('gardens', cats)` returns the gardens id. `resolveCategory('nope', cats)` and `resolveCategory(null, cats)` return `null` (Review Focus #5).
  - Rendering `/gallery?category=nope` has "All" with `aria-pressed="true"` and shows all images.
  - Clicking the "Gardens" chip leaves only gardens images and puts `category=gardens` in the URL.
  - Clicking an image opens a dialog showing "1 / N". `{ArrowRight}` shows "2 / N". `{Escape}` closes it and focus returns to the clicked image button (Review Focus #3).
  - With `galleryImages: []`: the text "Photos coming soon" and no chips.
- [ ] **Step 2:** Run `npx vitest run src/components/gallery`. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run the same command. Expected: PASS.
- [ ] **Step 5: Commit:** `feat: gallery page with category filter and accessible lightbox`.

---

### Task 7: About and Visit Us pages, contact form UI

**Files:**
- Create: `src/pages/AboutPage.tsx`, `src/pages/VisitPage.tsx`, `src/components/forms/Field.tsx`, `src/components/forms/ContactForm.tsx`, `src/lib/validation/contact.ts`
- Modify: `src/routes/about.tsx`, `src/routes/visit.tsx`
- Test: `src/lib/validation/contact.test.ts`, `src/components/forms/contact-form.test.tsx`, `src/pages/about-visit.test.tsx`

**Interfaces:**
- Produces: `contactSchema` (Zod), with exactly the database limits:
  - `fullName` trimmed, 2–100;
  - `email` trimmed, `.email()`, max 254;
  - `phone` trimmed, optional, `/^[0-9 +()-]{0,30}$/`, with empty → `undefined`;
  - `subject` 2–150;
  - `message` 10–5000.
- Produces: `type ContactInput = z.infer<typeof contactSchema>`.
- Produces: `<ContactForm onSubmit(input: ContactInput & { honeypot: string; elapsedMs: number }): Promise<'ok' | 'rate_limited' | 'error'> />`.
  - It has a visually hidden honeypot field named `website` (`tabIndex={-1}`, `autoComplete="off"`, `aria-hidden` on its wrapper).
  - It records the mount time to compute `elapsedMs`.
  - It shows inline field errors linked by `aria-describedby`, and disables the submit button while sending.
  - Outcome messages:
    - success: "Thank you — your message has been sent. We'll get back to you soon."
    - `rate_limited`: "You've sent several messages recently. Please try again in a little while."
    - `error`: "Something went wrong sending your message. Please try again."
  - In Phase 2, the route passes a stub `onSubmit` that resolves `'ok'`. Phase 4 wires the real one.
- **About:** a page header with `h1` "About the Park". Sections `intro`, `story`, `mission`, `vision` and `surroundings` render in that order, each only if present, each with `SampleTag` when `isSample`. It ends with a "Facilities and highlights" block linking to `/discover`.
- **Visit:** `h1` "Visit Us". Shows the address and plus code, `MapEmbed`, Get Directions, a contact list (phone and email only when present), opening hours only when non-null, an FAQ section (native `<details>`/`<summary>`) only when FAQs exist, and `ContactForm` under the `h2` "Send Us a Message".

- [ ] **Step 1: Write the failing tests.**
  - Schema: `{fullName:'A'}` fails on `fullName`. A valid full object passes. `phone: ''` parses to `undefined`. `phone: 'abc'` fails. A 5001-character message fails.
  - Form: submitting empty shows 4 errors, and the name input has `aria-invalid="true"` with `aria-describedby` pointing at its error. A valid submit calls `onSubmit` with `honeypot: ''` and a numeric `elapsedMs`, then shows the success text. A `'rate_limited'` result shows the rate-limit text.
  - About with placeholder data shows "Sample" on story, mission and vision.
  - Visit with `openingHours: null` has no "Opening hours" heading. With `faqs: []`, there is no "Frequently Asked Questions" heading.
- [ ] **Step 2:** Run `npx vitest run src/lib/validation src/components/forms src/pages/about-visit.test.tsx`. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run the same command. Expected: PASS.
- [ ] **Step 5: Commit:** `feat: about and visit pages with contact form UI`.

---

### Task 8: 404 page, responsive and visual review, phase report

**Files:**
- Modify: `src/routes/not-found.tsx` (styled: `h1` "Page not found", a friendly line, buttons Home and Visit Us); `src/root.tsx` (`ErrorBoundary` using the same look)
- Create: `docs/superpowers/notes/phase-2-screenshots/` (PNG files, committed)

- [ ] **Step 1: Write the failing test.** The `/nope` route renders the `h1` "Page not found" and a link to `/`.
- [ ] **Step 2: Implement.** Then run `npx vitest run src/routes`. Expected: PASS.
- [ ] **Step 3: Capture screenshots.** Run `npm run build && npx serve build/client -s -l 4173` in the background. Use a one-off Playwright script (kept in the scratchpad, not the repo) to save full-page screenshots of `/`, `/discover`, `/discover/<first-slug>`, `/gallery`, `/about`, `/visit` and `/nope` at widths 375, 768, 1024 and 1440 into the notes folder. **Stop the server afterwards.**
- [ ] **Step 4: Review against the reference.** Compare the 1440 homepage with `docs/reference/visual-reference.png`: section order, nav, hero composition, the card badge overlap, the green band split, and the footer. Then check every 375 shot for horizontal overflow, cropped text and tap targets. Fix each issue, with a commit per fix (`fix(ui): …`).
- [ ] **Step 5:** Run `npm run typecheck && npm run lint && npm run format:check && npm test && npm run build`. Expected: all exit 0.
- [ ] **Step 6: Finish the phase.** Commit the screenshots (`docs: phase 2 screenshots`). Write the phase report (README ritual), including which screenshots were reviewed and the fixes made. **Ask the developer**, push, and open the PR.
