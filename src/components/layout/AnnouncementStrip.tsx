import { Link } from "react-router";
import type { Announcement } from "../../types/content";

type AnnouncementStripProps = { announcement: Announcement | null };

/** A same-site path: one leading slash, not `//host` or `/\host`. */
const INTERNAL_PATH = /^\/([^/\\]|$)/;

/**
 * Slim notice above the header. Renders nothing when there is no announcement.
 * The link is a router Link for a site path, a new-tab anchor for `https://`,
 * and left out for anything else.
 */
export function AnnouncementStrip({ announcement }: AnnouncementStripProps) {
  if (!announcement) return null;
  const { title, body, linkHref, linkLabel } = announcement;
  const label = linkLabel ?? "Learn more";
  const linkClass =
    "inline-flex min-h-11 items-center font-semibold text-gold-500 underline underline-offset-4 hover:text-ivory-50";

  return (
    <aside
      aria-label="Announcement"
      data-surface="dark"
      className="bg-forest-800 text-ivory-50"
    >
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-4 gap-y-0 px-5 py-1 text-center text-sm sm:px-8">
        <p>
          <span className="font-semibold">{title}</span>
          {body ? <span className="text-ivory-50/80"> {body}</span> : null}
        </p>
        {linkHref && INTERNAL_PATH.test(linkHref) ? (
          <Link to={linkHref} className={linkClass}>
            {label}
          </Link>
        ) : linkHref?.startsWith("https://") ? (
          <a
            href={linkHref}
            target="_blank"
            rel="noopener noreferrer"
            className={linkClass}
          >
            {label}
          </a>
        ) : null}
      </div>
    </aside>
  );
}
