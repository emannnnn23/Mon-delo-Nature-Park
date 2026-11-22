import { DashboardPage } from "~/admin/pages/DashboardPage";

export function meta() {
  return [{ title: "Dashboard | Mondelos admin" }];
}

export default function Dashboard() {
  return <DashboardPage />;
}
