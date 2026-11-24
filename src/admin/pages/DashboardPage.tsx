import { Link } from "react-router";

import {
  PAGE_TITLES,
  isPageKey,
  sectionLabel,
} from "~/admin/lib/sectionLabels";
import { RECENT_LABELS, type DashboardData } from "~/services/admin/dashboard";

type DashboardPageProps = { data: DashboardData };

const DATE = new Intl.DateTimeFormat("en-PH", {
  dateStyle: "medium",
  timeStyle: "short",
});

function formatDate(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "" : DATE.format(date);
}

type RecentItem = DashboardData["recent"][number];

/**
 * Where an item is edited, and what to call it. The view names a page section
 * as "<page> · <key>", so the page is read from that title; an unknown page
 * falls back to the home page editor.
 */
function recentTarget(item: RecentItem): { to: string; title: string } {
  switch (item.source) {
    case "page_sections": {
      const [page, ...rest] = item.title.split(" · ");
      const key = rest.join(" · ");
      if (isPageKey(page) && key !== "") {
        return {
          to: `/admin/pages/${page}`,
          title: `${PAGE_TITLES[page]}: ${sectionLabel(page, key)}`,
        };
      }
      return { to: "/admin/pages/home", title: item.title };
    }
    case "attractions":
      return { to: `/admin/attractions/${item.id}`, title: item.title };
    case "gallery_images":
    case "gallery_categories":
      return { to: "/admin/gallery", title: item.title };
    case "testimonials":
      return { to: "/admin/testimonials", title: item.title };
    case "announcements":
      return { to: "/admin/announcements", title: item.title };
    case "faqs":
      return { to: "/admin/faqs", title: item.title };
    case "site_settings":
      return { to: "/admin/settings", title: item.title };
    default:
      return { to: "/admin", title: item.title };
  }
}

/** The admin page where a missing item is fixed. */
function missingTarget(item: string): string {
  if (item === "Guest reviews") return "/admin/testimonials";
  if (item === "Park photos") return "/admin/gallery";
  if (item.endsWith("sample items still to confirm"))
    return "/admin/attractions";
  return "/admin/settings";
}

const TILE =
  "flex min-h-11 flex-col rounded-2xl border border-cream-100 bg-white p-5 hover:border-forest-900/40";

/**
 * The first screen after signing in: how much is on the website, what changed
 * lately and what the owner still has to fill in.
 */
export function DashboardPage({ data }: DashboardPageProps) {
  const { counts, recent, missing } = data;
  const tiles = [
    {
      label: "Published attractions",
      value: counts.publishedAttractions,
      to: "/admin/attractions",
    },
    {
      label: "Gallery photos",
      value: counts.galleryImages,
      to: "/admin/gallery",
    },
    {
      label: "Published announcements",
      value: counts.publishedAnnouncements,
      to: "/admin/announcements",
    },
    {
      label: "New messages",
      value: counts.newMessages,
      to: "/admin/messages?status=new",
    },
  ];

  return (
    <section aria-labelledby="dashboard-title">
      <h1
        id="dashboard-title"
        className="font-serif text-3xl font-bold text-forest-900"
      >
        Dashboard
      </h1>
      <p className="mt-3 max-w-xl text-ink-600">
        A quick look at the website and what still needs your attention.
      </p>

      <ul className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {tiles.map((tile) => (
          <li key={tile.label}>
            <Link to={tile.to} className={`${TILE} h-full`}>
              <span className="font-serif text-4xl font-bold text-forest-900">
                {tile.value}
              </span>
              <span className="mt-1 text-sm font-semibold text-ink-600">
                {tile.label}
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <div className="mt-10 grid gap-10 lg:grid-cols-2">
        <section aria-labelledby="dashboard-recent">
          <h2
            id="dashboard-recent"
            className="font-serif text-xl font-bold text-forest-900"
          >
            Recent updates
          </h2>
          {recent.length === 0 ? (
            <p className="mt-3 text-ink-600">Nothing has changed yet.</p>
          ) : (
            <ul
              aria-label="Recent updates"
              className="mt-4 flex flex-col divide-y divide-cream-100 rounded-2xl border border-cream-100 bg-white"
            >
              {recent.map((item) => {
                const { to, title } = recentTarget(item);
                return (
                  <li key={`${item.source}:${item.id}`}>
                    <Link
                      to={to}
                      className="flex min-h-11 flex-col gap-0.5 px-5 py-3 hover:bg-ivory-50"
                    >
                      <span className="text-xs font-semibold tracking-wide text-earth-700 uppercase">
                        {RECENT_LABELS[item.source] ?? item.source}
                      </span>
                      <span className="font-semibold break-words text-ink-900">
                        {title}
                      </span>
                      <span className="text-sm text-ink-600">
                        {formatDate(item.updatedAt)}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section aria-labelledby="dashboard-missing">
          <h2
            id="dashboard-missing"
            className="font-serif text-xl font-bold text-forest-900"
          >
            Still missing
          </h2>
          {missing.length === 0 ? (
            <p className="mt-3 text-ink-600">
              Nothing is missing. The website has everything it needs.
            </p>
          ) : (
            <>
              <p className="mt-3 text-ink-600">
                The website leaves these out until you add them.
              </p>
              <ul
                aria-label="Still missing"
                className="mt-4 flex flex-col divide-y divide-cream-100 rounded-2xl border border-cream-100 bg-white"
              >
                {missing.map((item) => (
                  <li key={item}>
                    <Link
                      to={missingTarget(item)}
                      className="flex min-h-11 items-center px-5 py-3 font-semibold text-ink-900 hover:bg-ivory-50"
                    >
                      {item}
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      </div>
    </section>
  );
}
