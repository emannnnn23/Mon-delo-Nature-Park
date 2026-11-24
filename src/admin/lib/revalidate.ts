import type { ShouldRevalidateFunctionArgs } from "react-router";

/**
 * `shouldRevalidate` for list pages whose tabs and filters live in the query
 * string (`?tab=`, `?category=`): changing only those must not re-run the
 * route's loader, because the page shows what it already has. Everything else
 * (a different page, a form submission, an explicit `revalidate()`) keeps the
 * default behaviour.
 */
export function skipSearchOnlyRevalidation({
  currentUrl,
  nextUrl,
  formMethod,
  defaultShouldRevalidate,
}: ShouldRevalidateFunctionArgs): boolean {
  if (
    formMethod === undefined &&
    currentUrl.pathname === nextUrl.pathname &&
    currentUrl.search !== nextUrl.search
  ) {
    return false;
  }
  return defaultShouldRevalidate;
}
