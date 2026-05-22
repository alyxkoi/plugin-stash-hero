import { createFileRoute, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { DashboardShell } from "@/components/DashboardShell";
import { useAuth } from "@/hooks/useAuth";

// Layout wrapper for ALL /dashboard/* routes.
// /dashboard/login bypasses the auth check; everything else requires an authenticated admin.
export const Route = createFileRoute("/dashboard")({
  component: DashboardLayout,
});

function DashboardLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAdmin, loading } = useAuth();
  const isLogin = location.pathname === "/dashboard/login";

  useEffect(() => {
    if (isLogin || loading) return;
    if (!user || !isAdmin) {
      navigate({ to: "/dashboard/login" as any, replace: true });
    }
  }, [isLogin, loading, user, isAdmin, navigate]);

  if (isLogin) return <Outlet />;

  if (loading || !user || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg-base)" }}>
        <div className="font-mono text-xs text-white/40">Loading…</div>
      </div>
    );
  }

  return (
    <DashboardShell title="Dashboard">
      <Outlet />
    </DashboardShell>
  );
}
