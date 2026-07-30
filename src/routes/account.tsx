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
    <div className="max-w-[1100px] mx-auto px-4 md:px-8 py-6 md:py-10">
      <div className="flex items-center justify-between gap-3 mb-6">
        <nav
          className="glass-card !p-1 rounded-full inline-flex items-center gap-1 overflow-x-auto no-scrollbar"
          aria-label="Account sections"
        >
          <div className="chromatic-edge" />
          <div className="relative z-10 flex items-center gap-1">
            {TABS.map((t) => {
              const active = t.exact ? pathname === t.to : pathname.startsWith(t.to);
              return (
                <Link
                  key={t.to}
                  to={t.to}
                  className={`px-4 md:px-5 h-9 rounded-full inline-flex items-center font-mono text-[11px] tracking-[0.16em] uppercase whitespace-nowrap transition ${
                    active
                      ? "bg-[#FF003C] text-white shadow-[0_0_18px_-4px_#FF003C]"
                      : "text-[#C9BEDD] hover:text-white hover:bg-white/[0.06]"
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
          className="shrink-0 px-3 md:px-4 h-9 rounded-full inline-flex items-center gap-2 border border-white/12 bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/25 transition"
        >
          <LogOut className="w-4 h-4 text-white/70" strokeWidth={1.7} />
          <span className="hidden sm:inline font-mono text-[11px] tracking-[0.14em] text-white/80">SIGN OUT</span>
        </button>
      </div>
      <Outlet />
    </div>
  );
}
