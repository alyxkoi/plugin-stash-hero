import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { Folder, ReceiptText, Store, Heart, ChevronRight } from "lucide-react";
import { GlassCard } from "@/components/GlassCard";
import { mockUser, library, orders, savedItems, getLibProduct, getGreeting, formatDate, totalSpent } from "@/lib/account-data";
import { SALE, products } from "@/lib/mock-data";

export const Route = createFileRoute("/account/")({
  head: () => ({ meta: [{ title: "Dashboard — Plugin Warehouse" }] }),
  component: Dashboard,
});

function Dashboard() {
  const greeting = getGreeting();

  return (
    <div className="space-y-12">
      {/* Welcome header */}
      <header>
        <h1 className="font-display text-[clamp(2.5rem,6vw,5rem)] leading-[0.95] tracking-tight shimmer-once">
          {greeting}
        </h1>
      </header>

      {/* Quick actions */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
        <QuickTile icon={Folder} label="YOUR STASH" stat={`${library.length} PLUGINS LOADED`} to="/account/library" />
        <QuickTile icon={ReceiptText} label="YOUR ORDERS" stat={`${orders.length} ORDERS · $${totalSpent} SPENT`} to="/account/orders" />
        <QuickTile icon={Store} label="BROWSE THE WAREHOUSE" stat={`${products.length} PLUGINS WAITING`} to="/shop" />
        <QuickTile icon={Heart} label="SAVED FOR LATER" stat={`${savedItems.length} SAVED · ${savedItems.filter(s => s.onSale).length} ON SALE`} to="/account/saved" />
      </div>

      {/* Lately */}
      <section>
        <h2 className="section-header">LATELY</h2>
        <div className="grid lg:grid-cols-[1.6fr_1fr] gap-6">
          <RecentlyLoaded />
          <LastOrder />
        </div>
      </section>
    </div>
  );
}

function QuickTile({ icon: Icon, label, stat, to }: { icon: typeof Folder; label: string; stat: string; to: string }) {
  const ref = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches; if (reduce) return;
    const move = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      el.style.transform = `perspective(1400px) rotateX(${(y - 0.5) * 2}deg) rotateY(${(x - 0.5) * -2}deg) translateY(-3px)`;
      el.style.setProperty("--glare-peak", `${x * 100}%`);
    };
    const leave = () => { el.style.transform = ""; el.style.removeProperty("--glare-peak"); };
    el.addEventListener("mousemove", move); el.addEventListener("mouseleave", leave);
    return () => { el.removeEventListener("mousemove", move); el.removeEventListener("mouseleave", leave); };
  }, []);
  void SALE;
  return (
    <Link ref={ref} to={to} aria-label={label} className="glass-card block p-5 group">
      <div className="chromatic-edge" />
      <div className="relative z-10 flex flex-col h-full min-h-[140px]">
        <Icon className="w-7 h-7 text-white/80 mb-4" strokeWidth={1.4} />
        <div className="font-display text-base md:text-lg leading-tight tracking-wide">{label}</div>
        <div className="label-mini mt-2">{stat}</div>
        <ChevronRight className="w-4 h-4 text-white/40 mt-auto self-end group-hover:text-white group-hover:translate-x-1 transition-all" />
      </div>
    </Link>
  );
}

function RecentlyLoaded() {
  const recent = [...library].filter(l => l.lastDownloaded).sort((a, b) => (b.lastDownloaded! > a.lastDownloaded! ? 1 : -1)).slice(0, 5);
  return (
    <GlassCard variant="subtle" className="p-5">
      <div className="label-mini mb-4">Recently loaded</div>
      <ul className="divide-y divide-white/8">
        {recent.map(item => {
          const p = getLibProduct(item.slug)!;
          return (
            <li key={item.slug} className="flex items-center gap-4 py-3 group hover:bg-white/[0.03] -mx-2 px-2 rounded-lg transition">
              <div className="w-14 h-14 rounded-xl shrink-0 border border-white/15 overflow-hidden" style={{ background: p.coverGradient }} />
              <div className="min-w-0 flex-1">
                <div className="font-display text-[17px] truncate tracking-wide">{p.name}</div>
                <div className="label-mini mt-0.5">Downloaded {formatDate(item.lastDownloaded!)}</div>
              </div>
              <button aria-label={`Re-download ${p.name}`} className="w-11 h-11 rounded-full border border-white/15 flex items-center justify-center text-white/70 hover:text-white hover:border-white/40 transition">
                ↓
              </button>
            </li>
          );
        })}
      </ul>
    </GlassCard>
  );
}

function LastOrder() {
  const order = orders[0];
  const itemNames = order.items.map(i => getLibProduct(i.slug)?.name).filter(Boolean) as string[];
  const shown = itemNames.slice(0, 3);
  const extra = itemNames.length - shown.length;
  void mockUser;
  return (
    <GlassCard variant="blue" className="p-6 flex flex-col">
      <div className="label-mini">Last order · {formatDate(order.date)}</div>
      <div className="font-mono text-[11px] tracking-wider text-white/55 mb-5">#{order.id}</div>
      <ul className="space-y-1.5 mb-6">
        {shown.map(n => <li key={n} className="text-white/85 text-sm truncate">— {n}</li>)}
        {extra > 0 && <li className="text-white/50 text-sm font-mono">+{extra} more</li>}
      </ul>
      <div className="font-mono text-4xl mb-5 mt-auto"><span className="text-red">$</span>{order.total}</div>
      <div className="flex gap-2">
        <Link to="/account/orders/$id" params={{ id: order.id }} className="btn-ghost !text-xs flex-1 !px-3">VIEW ORDER →</Link>
        <button className="btn-primary !text-xs flex-1 !px-3">RE-DOWNLOAD ALL</button>
      </div>
    </GlassCard>
  );
}
