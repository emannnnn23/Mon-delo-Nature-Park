import { redirect } from "react-router";

import { AdminSpinner } from "~/admin/components/AdminSpinner";
import { safeNext } from "~/admin/lib/safeNext";
import { LoginPage } from "~/admin/pages/LoginPage";
import { getAdminStatus, isAuthConfigured } from "~/services/auth";
import type { Route } from "./+types/login";

export function meta() {
  return [
    { title: "Sign in | Mondelos admin" },
    { name: "robots", content: "noindex" },
  ];
}

// Client-only (no `loader`). Someone who is already an admin skips the form.
export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  if (!isAuthConfigured()) return { configured: false };
  if ((await getAdminStatus()) === "admin") {
    const next = new URL(request.url).searchParams.get("next");
    return redirect(safeNext(next));
  }
  return { configured: true };
}

export function HydrateFallback() {
  return <AdminSpinner />;
}

export default function Login({ loaderData }: Route.ComponentProps) {
  return <LoginPage configured={loaderData.configured} />;
}
