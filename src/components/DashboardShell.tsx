import { ReactNode, useEffect, useState } from "react";
import { Link, useNavigate, useRouterState, Outlet } from "@tanstack/react-router";
import {
  LayoutDashboard, Package, ShoppingBag, Tag, Users, BarChart3,
  Megaphone, Settings, LogOut, ExternalLink, ChevronDown, Menu, X
} from "lucide-react";
import logo from "@/assets/logo.png";
import { clearAdminSession, getAdminSession, type AdminSession } from "@/lib/dashboard-mock";

const NAV: { to: string; label: string; icon: typeof LayoutDashboard; exact?: boolean }[] = [
  { to: "/dashboard", label: "Overview", icon: LayoutDashboard, exact: true },
  { to: "/dashboard/products", label: "Products", icon: Package },
  { to: "/dashboard/orders", label: "Orders", icon: ShoppingBag },
  { to: "/dashboard/sales", label: "Sales", icon: Tag },
  { to: "/dashboard/customers", label: "Customers", icon: Users },
  { to: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/dashboard/marketing", label: "Marketing", icon: Megaphone },
  { to: "/dashboard/settings", label: "Settings", icon: Settings },
];

interface Props {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}

export function DashboardShell({ title, action, children }: Props) {
  const [session, setSession] = useState<AdminSession | null>(null);
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => { setSession(getAdminSession()); }, []);
  useEffect(() => { setOpen(false); }, [pathname]);

  const logout = () => {
    clearAdminSession();
    navigate({ to: "/dashboard/login" as any });
  };

  return (
    <div className="min-h-screen flex w-full" style={{ background: "var(--bg-base)" }}>
      {/* Sidebar */}
      <aside className={`fixed md:sticky top-0 left-0 h-screen w-[220px] z-40 transform transition-transform md:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="glass-card h-full !rounded-none md:!rounded-r-2xl p-4 flex flex-col">
          <div className="chromatic-edge" />
          <div className="relative z-10 flex-1 flex flex-col">
            <Link to="/dashboard" className="flex items-center gap-2 mb-1">
              <img src={logo} alt="Plugin Warehouse" className="h-7 w-auto object-contain" style={{ filter: "drop-shadow(0 2px 12px rgba(255,0,60,0.35))" }} />
            </Link>
            <div className="label-mini opacity-50 text-[9px] mb-6 pl-1">Dashboard</div>

            <nav className="flex flex-col gap-1 flex-1">
              {NAV.map((n) => {
                const active = n.exact ? pathname === n.to : pathname.startsWith(n.to);
                const Icon = n.icon;
                return (
                  <Link key={n.to} to={n.to as any} className={`group relative flex items-center gap-3 px-3 py-2 rounded-lg transition ${active ? "text-[var(--accent-red)]" : "text-white/70 hover:text-white"}`}>
                    {active && <span className="absolute left-0 top-1.5 bottom-1.5 w-[2px] bg-[var(--accent-red)] rounded-full" style={{ boxShadow: "0 0 12px var(--accent-red)" }} />}
                    <Icon size={18} style={active ? { filter: "drop-shadow(0 0 6px var(--accent-red))" } : undefined} />
                    <span className="text-sm">{n.label}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="border-t border-white/10 pt-3 mt-3 flex flex-col gap-1">
              <a href="/" target="_blank" rel="noreferrer" className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-white/60 hover:text-white transition">
                <ExternalLink size={14} /> View storefront
              </a>
              <button onClick={logout} className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-white/60 hover:text-white transition text-left">
                <LogOut size={14} /> Log out
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Backdrop for mobile */}
      {open && <div className="fixed inset-0 bg-black/60 z-30 md:hidden" onClick={() => setOpen(false)} />}

      {/* Main column */}
      <div className="flex-1 flex flex-col min-w-0 md:ml-0">
        {/* Top bar */}
        <header className="sticky top-0 z-20">
          <div className="glass-card !rounded-none border-b border-white/10 px-4 md:px-6 py-3 flex items-center gap-3">
            <button className="md:hidden text-white/80" onClick={() => setOpen(true)} aria-label="Open menu"><Menu size={22} /></button>
            <h1 className="font-display text-xl md:text-2xl text-white tracking-wide">{title}</h1>
            <div className="ml-auto flex items-center gap-3">
              {action}
              <div className="relative">
                <button onClick={() => setMenu(!menu)} className="flex items-center gap-2 px-2 py-1.5 rounded-lg border border-white/15 hover:border-white/30 transition">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[var(--accent-red)] to-[var(--accent-blue)] flex items-center justify-center text-xs font-bold">
                    {session?.initials ?? "AD"}
                  </div>
                  <span className="hidden md:inline text-xs text-white/80">{session?.name ?? "Admin"}</span>
                  <ChevronDown size={14} className="text-white/60" />
                </button>
                {menu && (
                  <div className="absolute right-0 mt-2 w-44 glass-card !rounded-xl p-2 border border-white/10 z-30">
                    <Link to="/dashboard/settings" onClick={() => setMenu(false)} className="block px-3 py-2 text-xs text-white/80 hover:text-white hover:bg-white/5 rounded">Settings</Link>
                    <button onClick={logout} className="w-full text-left px-3 py-2 text-xs text-white/80 hover:text-white hover:bg-white/5 rounded">Log out</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-8 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}

// Reusable glass section card
export function DashCard({ children, className = "", title, action }: { children: ReactNode; className?: string; title?: ReactNode; action?: ReactNode }) {
  return (
    <div className={`glass-card p-5 md:p-6 ${className}`}>
      <div className="chromatic-edge" />
      <div className="relative z-10">
        {(title || action) && (
          <div className="flex items-center justify-between mb-4 gap-3">
            {title && <h2 className="font-display text-base md:text-lg tracking-wide">{title}</h2>}
            {action}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

export function StatCard({ label, value, delta, deltaPositive }: { label: string; value: string; delta?: string; deltaPositive?: boolean }) {
  return (
    <DashCard>
      <div className="label-mini opacity-60 text-[10px] mb-2">{label}</div>
      <div className="font-mono text-2xl md:text-3xl text-white">{value}</div>
      {delta && (
        <div className={`text-[11px] font-mono mt-1 ${deltaPositive ? "text-emerald-400" : "text-[var(--accent-red)]"}`}>
          {deltaPositive ? "↑" : "↓"} {delta}
        </div>
      )}
    </DashCard>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    completed: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    active: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    published: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    scheduled: "bg-blue-500/15 text-blue-300 border-blue-500/30",
    draft: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    partial: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    refunded: "bg-[var(--accent-red)]/15 text-[var(--accent-red-glow)] border-[var(--accent-red)]/30",
    banned: "bg-[var(--accent-red)]/15 text-[var(--accent-red-glow)] border-[var(--accent-red)]/30",
    expired: "bg-white/10 text-white/50 border-white/15",
    disabled: "bg-white/10 text-white/50 border-white/15",
    archived: "bg-white/10 text-white/50 border-white/15",
    ended: "bg-white/10 text-white/50 border-white/15",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono uppercase tracking-wider border ${map[status] ?? "bg-white/10 text-white/70 border-white/15"}`}>
      {status}
    </span>
  );
}

export { Outlet };
