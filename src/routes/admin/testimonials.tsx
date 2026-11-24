import { useRouteError } from "react-router";

import { TestimonialsPage } from "~/admin/pages/TestimonialsPage";
import { listRows } from "~/services/admin/crud";
import { toFriendlyError } from "~/services/admin/errors";
import type { Route } from "./+types/testimonials";

export function meta() {
  return [{ title: "Testimonials | Mondelos admin" }];
}

// Client-only: the admin has no `loader`. The guard is the layout's
// clientMiddleware, which runs before this.
export async function clientLoader() {
  return { testimonials: await listRows("testimonials") };
}

export default function Testimonials({ loaderData }: Route.ComponentProps) {
  return <TestimonialsPage testimonials={loaderData.testimonials} />;
}

/** Shown inside the admin layout, so the menu stays available. */
export function ErrorBoundary() {
  const error = useRouteError();
  const { friendly } = toFriendlyError(error, { entity: "testimonial" });
  return (
    <section aria-labelledby="testimonials-error-title">
      <h1
        id="testimonials-error-title"
        className="font-serif text-3xl font-bold text-forest-900"
      >
        Testimonials
      </h1>
      <p role="alert" className="mt-3 max-w-xl font-semibold text-red-700">
        {friendly}
      </p>
    </section>
  );
}
