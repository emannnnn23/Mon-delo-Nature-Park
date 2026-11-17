import type { ReactNode } from "react";
import type { Announcement, SiteSettings } from "../../types/content";
import { AnnouncementStrip } from "./AnnouncementStrip";
import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";

type PublicLayoutProps = {
  settings: SiteSettings;
  announcement: Announcement | null;
  /** True when the page opens with a hero the header should float over. */
  overHero: boolean;
  children: ReactNode;
};

/**
 * Frame for every public page. The announcement strip sits above the sticky
 * header so a hero page can still slide up behind a transparent header.
 */
export function PublicLayout({
  settings,
  announcement,
  overHero,
  children,
}: PublicLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60] focus:rounded-full focus:bg-gold-500 focus:px-5 focus:py-3 focus:text-sm focus:font-semibold focus:text-ink-900"
      >
        Skip to content
      </a>
      <AnnouncementStrip announcement={announcement} />
      <SiteHeader overHero={overHero} />
      <main id="main" tabIndex={-1} className="flex-1 focus:outline-none">
        {children}
      </main>
      <SiteFooter settings={settings} />
    </div>
  );
}
