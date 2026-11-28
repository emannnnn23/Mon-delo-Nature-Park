import { AdminRouteError } from "~/admin/components/AdminRouteError";
import { TestimonialsPage } from "~/admin/pages/TestimonialsPage";
import { listRows } from "~/services/admin/crud";
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
  return <AdminRouteError title="Testimonials" entity="testimonial" />;
}
