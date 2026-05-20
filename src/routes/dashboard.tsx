import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getAdminSession } from "@/lib/dashboard-mock";

// Layout wrapper for ALL /dashboard/* routes.
// /dashboard/login bypasses the auth check; everything else requires a mock admin session.
export const Route = createFileRoute("/dashboard")({
  component: DashboardLayout,
});

function DashboardLayout() {
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const path = window.location.pathname;
    if (path === "/dashboard/login") {
      setChecked(true);
      return;
    }
    const sess = getAdminSession();
    if (!sess) {
      // Silently bounce non-admins back to storefront — no panel exposure.
      // TODO: backend — replace with Supabase session check + users.is_admin = true.
      window.location.replace("/dashboard/login");
      return;
    }
    setChecked(true);
  }, []);

  if (!checked) {
    return <div className="min-h-screen flex items-center justify-center text-white/40 text-xs font-mono">…</div>;
  }
  return <Outlet />;
}
