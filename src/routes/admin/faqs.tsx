import { AdminRouteError } from "~/admin/components/AdminRouteError";
import { FaqsPage } from "~/admin/pages/FaqsPage";
import { listRows } from "~/services/admin/crud";
import type { Route } from "./+types/faqs";

export function meta() {
  return [{ title: "FAQs | Mondelos admin" }];
}

// Client-only: the admin has no `loader`. The guard is the layout's
// clientMiddleware, which runs before this.
export async function clientLoader() {
  return { faqs: await listRows("faqs") };
}

export default function Faqs({ loaderData }: Route.ComponentProps) {
  return <FaqsPage faqs={loaderData.faqs} />;
}

/** Shown inside the admin layout, so the menu stays available. */
export function ErrorBoundary() {
  return <AdminRouteError title="FAQs" entity="question" />;
}
