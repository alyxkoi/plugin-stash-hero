import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { LogOut } from "lucide-react";
import { useAuth, signOut } from "@/hooks/useAuth";
import { claimMyOrders } from "@/lib/order-claim.functions";

export const Route = createFileRoute("/account")({
  head: () => ({ meta: [{ title: "Your Account — Plugin Warehouse" }] }),
  component: AccountGate,
});

const TABS = [
  { to: "/account", label: "Overview", exact: true },
  { to: "/account/plugins", label: "My Plugins", exact: false },
  { to: "/account/orders", label: "Orders", exact: false },
  { to: "/account/contact", label: "Contact", exact: false },
] as const;

function AccountGate() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login", replace: true });
  }, [loading, user, navigate]);

  // Link guest purchases made with this verified email to the account.
  useEffect(() => {
    if (loading || !user) return;
    claimMyOrders().catch(() => { /* non-blocking */ });
  }, [loading, user?.id]);

  if (loading || !user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="font-mono text-xs text-white/40">Loading…</div>
      </div>
    );
  }

  const onSignOut = async () => {
    await signOut();
    navigate({ to: "/" });
  };

  return (
    <div className="account-shell-v2 max-w-[1180px] mx-auto px-4 md:px-8 py-6 md:py-10">
      <div className="account-nav-row flex items-center justify-between gap-3 mb-8">
        <nav
          className="account-tabs"
          aria-label="Account sections"
        >
          <div className="account-tabs__inner">
            {TABS.map((t) => {
              const active = t.exact ? pathname === t.to : pathname.startsWith(t.to);
              return (
                <Link
                  key={t.to}
                  to={t.to}
                  className={`account-tab ${
                    active
                      ? "is-active"
                      : ""
                  }`}
                >
                  {t.label}
                </Link>
              );
            })}
          </div>
        </nav>
        <button
          onClick={onSignOut}
          className="account-signout"
        >
          <LogOut className="w-4 h-4 text-white/70" strokeWidth={1.7} />
          <span className="hidden sm:inline font-mono text-[11px] tracking-[0.14em] text-white/80">SIGN OUT</span>
        </button>
      </div>
      <Outlet />
    </div>
  );
}
