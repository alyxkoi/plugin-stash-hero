import { Link, Outlet, useLocation } from "@tanstack/react-router";
import { Home, Library, Receipt, Heart, Settings, LogOut } from "lucide-react";
import { mockUser } from "@/lib/account-data";

const NAV: { to: string; label: string; icon: typeof Home; exact?: boolean }[] = [
  { to: "/account", label: "DASHBOARD", icon: Home, exact: true },
  { to: "/account/library", label: "YOUR STASH", icon: Library },
  { to: "/account/orders", label: "ORDERS", icon: Receipt },
  { to: "/account/saved", label: "SAVED", icon: Heart },
  { to: "/account/settings", label: "SETTINGS", icon: Settings },
];

export function AccountLayout() {
  const loc = useLocation();
  const isActive = (to: string, exact?: boolean) =>
    exact ? loc.pathname === to : loc.pathname === to || loc.pathname.startsWith(to + "/");

  const initial = (mockUser.displayName || mockUser.email)[0].toUpperCase();

  return (
    <div className="max-w-[1480px] mx-auto px-4 md:px-8 py-6 md:py-10">
      <div className="md:grid md:grid-cols-[260px_1fr] md:gap-8">
        {/* Desktop sidebar */}
        <aside className="hidden md:block">
          <div className="sticky top-28">
            <div className="glass-card glass-card--subtle p-5">
              <div className="chromatic-edge" />
              <div className="glass-noise" />
              <div className="relative z-10">
                <div className="font-mono text-[10px] tracking-[0.18em] text-white/50 mb-4 px-2">YOUR ACCOUNT</div>
                <nav className="flex flex-col gap-1.5">
                  {NAV.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.to, item.exact);
                    return (
                      <Link
                        key={item.to}
                        to={item.to}
                        aria-current={active ? "page" : undefined}
                        data-active={active}
                        className={`dash-pill group flex items-center gap-3 px-3 h-11 rounded-full border ${
                          active
                            ? "text-white"
                            : "bg-white/[0.02] border-white/10 text-white/75 hover:bg-white/[0.06] hover:border-white/25 hover:text-white"
                        }`}
                      >
                        <Icon className="w-4 h-4 shrink-0" strokeWidth={1.6} />
                        <span className="font-bold text-[13px] tracking-[0.08em]">{item.label}</span>
                      </Link>
                    );
                  })}
                </nav>
                <div className="mt-6 pt-5 border-t border-white/10">
                  <div className="flex items-center gap-3 px-2">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center font-black text-base chrome-text bg-white/[0.04] border border-white/20 shrink-0">
                      {initial}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-mono text-[10px] text-white/45 tracking-wider">SIGNED IN</div>
                      <div className="text-[12px] text-white/85 truncate">{mockUser.email}</div>
                    </div>
                  </div>
                  <button className="mt-3 ml-2 flex items-center gap-1.5 text-[11px] text-white/50 hover:text-white font-mono tracking-wider">
                    <LogOut className="w-3 h-3" /> SIGN OUT
                  </button>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Mobile tab strip */}
        <div className="md:hidden mb-5 -mx-4 px-4 overflow-x-auto no-scrollbar">
          <div className="flex gap-2 min-w-max">
            {NAV.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.to, item.exact);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  aria-current={active ? "page" : undefined}
                  data-active={active}
                  className={`dash-pill flex items-center gap-2 px-4 h-11 rounded-full border whitespace-nowrap ${
                    active
                      ? "text-white"
                      : "bg-white/[0.03] border-white/10 text-white/70"
                  }`}
                >
                  <Icon className="w-4 h-4" strokeWidth={1.6} />
                  <span className="font-bold text-[12px] tracking-[0.08em]">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>

        <main className="min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
