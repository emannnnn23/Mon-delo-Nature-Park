import { useRouteError } from "react-router";

import { FaqsPage } from "~/admin/pages/FaqsPage";
import { listRows } from "~/services/admin/crud";
import { toFriendlyError } from "~/services/admin/errors";
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
  const error = useRouteError();
  const { friendly } = toFriendlyError(error, { entity: "question" });
  return (
    <section aria-labelledby="faqs-error-title">
      <h1
        id="faqs-error-title"
        className="font-serif text-3xl font-bold text-forest-900"
      >
        FAQs
      </h1>
      <p role="alert" className="mt-3 max-w-xl font-semibold text-red-700">
        {friendly}
      </p>
    </section>
  );
}
