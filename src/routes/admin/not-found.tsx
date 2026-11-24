import { AdminNotFoundPage } from "~/admin/pages/AdminNotFoundPage";

export function meta() {
  return [{ title: "Not found | Mondelos admin" }];
}

export default function AdminNotFound() {
  return <AdminNotFoundPage />;
}
