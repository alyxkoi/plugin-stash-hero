import { createFileRoute, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { getAdminSession } from "@/lib/dashboard-mock";

// Layout wrapper for ALL /dashboard/* routes.
// /dashboard/login bypasses the auth check; everything else requires a mock admin session.
export const Route = createFileRoute("/dashboard")({
  component: DashboardLayout,
});

function DashboardLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const isLogin = location.pathname === "/dashboard/login";

  useEffect(() => {
    if (isLogin) return;
    if (typeof window === "undefined") return;
    if (!getAdminSession()) {
      navigate({ to: "/dashboard/login" as any, replace: true });
    }
  }, [isLogin, navigate]);

  return <Outlet />;
}
