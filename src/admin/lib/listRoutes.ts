/**
 * The admin routes that are list pages, and so show the loading skeleton
 * (first load, navigation, retry). The one place that decides it: forms and
 * detail pages (`attractions/:id`, settings) and the dashboard are not here,
 * so they are never blanked by a skeleton.
 */
const ADMIN_LIST_ROUTES: RegExp[] = [
  /^\/admin\/pages\/[^/]+$/,
  /^\/admin\/attractions$/,
  /^\/admin\/gallery$/,
  /^\/admin\/testimonials$/,
  /^\/admin\/announcements$/,
  /^\/admin\/faqs$/,
  /^\/admin\/messages$/,
  /^\/admin\/media$/,
];

export function isAdminListPath(pathname: string): boolean {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  return ADMIN_LIST_ROUTES.some((route) => route.test(path));
}
