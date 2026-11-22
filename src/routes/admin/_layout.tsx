import { redirect, useRevalidator } from "react-router";

import { AdminSpinner } from "~/admin/components/AdminSpinner";
import { AdminUnavailablePage } from "~/admin/pages/AdminUnavailablePage";
import { AdminLayout } from "~/admin/layouts/AdminLayout";
import { getAdminStatus, getSessionEmail, signOut } from "~/services/auth";
import type { Route } from "./+types/_layout";

export function meta() {
  return [
    { title: "Admin | Mondelos Nature Park" },
    { name: "robots", content: "noindex" },
  ];
}

// Admin routes are client-only: no `loader`, so nothing here is prerendered or
// bundled into a public page. This guard is a convenience; row level security
// in the database is what actually protects the data.
export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  const status = await getAdminStatus();

  // The check could not be completed (offline, server error): show a retry
  // screen. No admin content, and no sign-out: the session may be fine.
  if (status === "unavailable") return { unavailable: true as const };

  if (status === "not-admin") {
    await signOut();
    return redirect("/admin/login?reason=not-admin");
  }

  const email = status === "admin" ? await getSessionEmail() : null;
  if (status === "anonymous" || email === null) {
    // Path only: the query string is untrusted and never carried forward.
    const { pathname } = new URL(request.url);
    return redirect(`/admin/login?next=${encodeURIComponent(pathname)}`);
  }
  return { email };
}

export function HydrateFallback() {
  return <AdminSpinner />;
}

export default function Admin({ loaderData }: Route.ComponentProps) {
  const revalidator = useRevalidator();
  if ("unavailable" in loaderData) {
    return (
      <AdminUnavailablePage
        retrying={revalidator.state === "loading"}
        onRetry={() => void revalidator.revalidate()}
      />
    );
  }
  return <AdminLayout email={loaderData.email} />;
}
