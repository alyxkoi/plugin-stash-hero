import { ReactNode, createContext, isValidElement, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useRouterState, Outlet } from "@tanstack/react-router";
import {
  LayoutDashboard, Package, ShoppingBag, Tag, Users, BarChart3,
  Megaphone, Settings, LogOut, ExternalLink, ChevronDown
} from "lucide-react";
import logo from "@/assets/logo-dashboard.webp";
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

type DashboardChrome = { setPage: (title: string, action?: ReactNode) => void };
const DashboardChromeContext = createContext<DashboardChrome | null>(null);
const useBrowserLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

export function DashboardShell({ title, action, children }: Props) {
  const nestedChrome = useContext(DashboardChromeContext);
  const actionSig = useMemo(() => getActionSignature(action), [action]);
  useBrowserLayoutEffect(() => {
    nestedChrome?.setPage(title, action);
  }, [nestedChrome, title, actionSig]);

  if (nestedChrome) return <>{children}</>;

  return <DashboardChromeRoot initialTitle={title} initialAction={action}>{children}</DashboardChromeRoot>;
}

function DashboardChromeRoot({ initialTitle, initialAction, children }: { initialTitle: string; initialAction?: ReactNode; children: ReactNode }) {
  const [session, setSession] = useState<AdminSession | null>(null);
  const [menu, setMenu] = useState(false);
  const [page, setPageState] = useState<{ title: string; action?: ReactNode }>({ title: initialTitle, action: initialAction });
  const trackRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const [glowRect, setGlowRect] = useState<{ left: number; width: number }>({ left: -200, width: 0 });
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useBrowserLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
  }, [pathname]);

  const setPage = useCallback((nextTitle: string, nextAction?: ReactNode) => {
    setPageState({ title: nextTitle, action: nextAction });
  }, []);

  const chrome = useMemo(() => ({ setPage }), [setPage]);

  useEffect(() => { setSession(getAdminSession()); }, []);

  const logout = () => {
    clearAdminSession();
    navigate({ to: "/dashboard/login" as any });
  };

  const activeIdx = NAV.findIndex(n => n.exact ? pathname === n.to : pathname.startsWith(n.to));
  const routeTitle = activeIdx >= 0 ? NAV[activeIdx].label : page.title;
  const displayTitle = page.title === initialTitle ? routeTitle : page.title;
  const ITEM_H = 40;
  const GAP = 4;
  const glowTop = activeIdx >= 0 ? activeIdx * (ITEM_H + GAP) : -100;

  // Measure active item to position the mobile glow exactly under it (handles responsive sizes).
  useBrowserLayoutEffect(() => {
    const measure = () => {
      const track = trackRef.current;
      const el = activeIdx >= 0 ? itemRefs.current[activeIdx] : null;
      if (!track || !el) return;
      const tRect = track.getBoundingClientRect();
      const eRect = el.getBoundingClientRect();
      setGlowRect({ left: eRect.left - tRect.left + track.scrollLeft, width: eRect.width });
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (trackRef.current) ro.observe(trackRef.current);
    window.addEventListener("resize", measure);
    return () => { ro.disconnect(); window.removeEventListener("resize", measure); };
  }, [activeIdx, pathname]);



  return (
    <div className="dashboard-scope min-h-screen flex w-full" style={{ background: "var(--bg-base)" }}>
      {/* Sidebar */}
      <aside className="dashboard-sidebar hidden lg:block sticky top-0 left-0 h-screen w-[220px] z-40">
        <div className="glass-card h-full !rounded-none !rounded-r-2xl p-4 flex flex-col">
          <div className="chromatic-edge" />
          <div className="relative z-10 flex-1 flex flex-col">
            <Link to="/dashboard" className="flex items-center gap-2 mb-1">
              <img src={logo} alt="Plugin Warehouse" width={420} height={120} className="h-7 w-auto object-contain" />
            </Link>
            <div className="label-mini opacity-50 text-[9px] mb-6 pl-1">Dashboard</div>

            <nav className="relative flex flex-col gap-1 flex-1">
              <span className="nav-glow-blob" style={{ top: glowTop, height: ITEM_H }} />
              <span className="nav-glow" style={{ top: glowTop + 8, height: ITEM_H - 16 }} />
              {NAV.map((n) => {
                const active = n.exact ? pathname === n.to : pathname.startsWith(n.to);
                const Icon = n.icon;
                return (
                  <Link key={n.to} to={n.to as any} className={`group relative flex items-center gap-3 px-3 rounded-lg transition-colors duration-300 ${active ? "text-[var(--accent-red)]" : "text-white/70 hover:text-white"}`} style={{ height: ITEM_H }}>
                    <Icon size={18} />
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

      {/* Main column */}
      <div className="flex-1 flex flex-col min-w-0 md:ml-0">
        <header className="sticky top-0 z-20">
          <div className="dash-header-floating px-4 md:px-6 py-3 flex items-center gap-3">
            <h1 className="font-display text-xl md:text-2xl text-white truncate">{displayTitle}</h1>
            <div className="ml-auto relative shrink-0">
              <button onClick={() => setMenu(!menu)} className="flex items-center gap-2 px-2 py-1.5 rounded-lg border border-white/15 hover:border-white/30 transition h-9">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[var(--accent-red)] to-[var(--accent-blue)] flex items-center justify-center text-xs font-bold">
                  {session?.initials ?? "AD"}
                </div>
                <span className="hidden md:inline text-xs text-white/80">{session?.name ?? "Admin"}</span>
                <ChevronDown size={14} className="text-white/60" />
              </button>
              {menu && (
                <div className="absolute right-0 top-full mt-2 w-44 smoked-menu z-50">
                  <Link to="/dashboard/settings" onClick={() => setMenu(false)} className="smoked-item !text-xs !py-2">Settings</Link>
                  <button onClick={logout} className="smoked-item !text-xs !py-2 w-full text-left">Log out</button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main key={pathname} className="dash-page flex-1 p-4 md:p-8 pb-28 lg:pb-8 overflow-x-hidden">
          {page.action && (
            <div className="dash-page-toolbar mb-4 flex flex-wrap items-center justify-end gap-2">
              {page.action}
            </div>
          )}
          <DashboardChromeContext.Provider value={chrome}>{children}</DashboardChromeContext.Provider>
        </main>
      </div>

      <nav className="dashboard-bottom-nav lg:hidden" aria-label="Dashboard navigation">
        <div ref={trackRef} className="dashboard-bottom-track">
          <span className="bottom-nav-glow" style={{ left: glowRect.left, width: glowRect.width }} />
          {NAV.map((n, i) => {
            const active = n.exact ? pathname === n.to : pathname.startsWith(n.to);
            const Icon = n.icon;
            return (
              <Link
                key={n.to}
                to={n.to as any}
                ref={(el) => { itemRefs.current[i] = el; }}
                className={`bottom-nav-link ${active ? "is-active" : ""}`}
                aria-label={n.label}
              >
                <Icon size={20} />
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

function getActionSignature(action: ReactNode): string {
  if (!action) return "";
  if (typeof action === "string" || typeof action === "number") return String(action);
  if (Array.isArray(action)) return action.map(getActionSignature).join("|");
  if (!isValidElement(action)) return "node";
  const type = typeof action.type === "string" ? action.type : (action.type as any).displayName || (action.type as any).name || "component";
  const props = action.props as Record<string, unknown>;
  const primitiveProps = Object.entries(props)
    .filter(([key, value]) => key !== "children" && ["string", "number", "boolean"].includes(typeof value))
    .map(([key, value]) => `${key}:${String(value)}`)
    .join(",");
  return `${type}(${primitiveProps})[${getActionSignature(props.children as ReactNode)}]`;
}

// Reusable glass section card
export function DashCard({ children, className = "", title, action }: { children: ReactNode; className?: string; title?: ReactNode; action?: ReactNode }) {
  return (
    <div className={`glass-card p-5 md:p-6 ${className}`}>
      <div className="chromatic-edge" />
      <div className="relative z-10">
        {(title || action) && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-3 min-w-0">
            {title && <h2 className="font-display text-base md:text-lg tracking-wide">{title}</h2>}
            {action && <div className="max-w-full overflow-x-auto">{action}</div>}
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
