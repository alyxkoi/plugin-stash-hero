import { createFileRoute, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { DashboardShell, DashboardSkeleton } from "@/components/DashboardShell";
import { useAuth } from "@/hooks/useAuth";

// Layout wrapper for ALL /dashboard/* routes.
// /dashboard/login bypasses the auth check; everything else requires an authenticated admin.
export const Route = createFileRoute("/dashboard")({
  component: DashboardLayout,
});

function DashboardLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAdmin, adminReady, loading } = useAuth();
  const isLogin = location.pathname === "/dashboard/login";

  useEffect(() => {
    if (isLogin || loading || !adminReady) return;
    if (!user || !isAdmin) {
      navigate({ to: "/dashboard/login" as any, replace: true });
    }
  }, [isLogin, loading, adminReady, user, isAdmin, navigate]);

  if (isLogin) return <Outlet />;

  return (
    <DashboardShell title="Dashboard">
      {loading || !adminReady || !user || !isAdmin ? <DashboardSkeleton /> : <Outlet />}
    </DashboardShell>
  );
}
