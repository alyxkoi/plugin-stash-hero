import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Folder, ReceiptText, Store, Heart, ChevronRight, Headphones } from "lucide-react";
import { GlassCard } from "@/components/GlassCard";
import { ProductCard } from "@/components/ProductCard";
import { mockUser, library, orders, savedItems, getLibProduct, getGreeting, formatDate, totalSpent } from "@/lib/account-data";
import { bestsellerProducts, SALE, products } from "@/lib/mock-data";

export const Route = createFileRoute("/account/")({
  head: () => ({ meta: [{ title: "Dashboard — Plugin Warehouse" }] }),
  component: Dashboard,
});

interface Alert { id: string; dot: "magenta"; label: string; cta: string; to: string }

function Dashboard() {
  const updatesCount = library.filter(l => l.updateAvailable).length;
  const greeting = getGreeting();
  const firstName = mockUser.displayName.split(" ")[0] || mockUser.email.split("@")[0];

  const alerts: Alert[] = [];
  if (updatesCount > 0) alerts.push({ id: "upd", dot: "magenta", label: `${updatesCount} PLUGINS HAVE UPDATES READY`, cta: "GO UPDATE", to: "/account/library" });
  if (SALE.active) alerts.push({ id: "sale", dot: "magenta", label: `SUMMER STEALS — ${SALE.discount}% OFF STORE-WIDE — ENDS ${SALE.endsLabel.toUpperCase()}`, cta: "SHOP THE SALE", to: `/sale/${SALE.slug}` });

  return (
    <div className="space-y-12">
      {/* Welcome header */}
      <header>
        <div className="font-mono text-xs tracking-[0.18em] text-[var(--accent-red-glow)] mb-3">
          // WELCOME BACK, {firstName.toUpperCase()}
        </div>
        <h1 className="font-black text-[clamp(2.5rem,6vw,5rem)] leading-[0.95] tracking-tight chrome-text shimmer-once">
          {greeting}
        </h1>
        <div className="mt-4 font-mono text-[11px] tracking-[0.16em] text-white/55 flex flex-wrap items-center gap-3">
          <span>{library.length} PLUGINS LOADED</span>
          <span className="text-white/25">·</span>
          <span>MEMBER SINCE {mockUser.memberSince.toUpperCase()}</span>
          <span className="text-white/25">·</span>
          <span>{library.reduce((s, l) => s + l.downloadCount, 0)} DOWNLOADS</span>
        </div>
      </header>

      {alerts.length > 0 && <StatusStrip alerts={alerts} />}

      {/* Quick actions */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
        <QuickTile icon={Folder} label="YOUR STASH" stat={`${library.length} PLUGINS LOADED`} to="/account/library" />
        <QuickTile icon={ReceiptText} label="YOUR ORDERS" stat={`${orders.length} ORDERS · $${totalSpent} SPENT`} to="/account/orders" />
        <QuickTile icon={Store} label="BROWSE THE WAREHOUSE" stat={`${products.length} PLUGINS WAITING`} to="/shop" />
        <QuickTile icon={Heart} label="SAVED FOR LATER" stat={`${savedItems.length} SAVED · ${savedItems.filter(s => s.onSale).length} ON SALE`} to="/account/saved" />
      </div>

      {/* Lately */}
      <section>
        <SectionHeader>LATELY</SectionHeader>
        <div className="grid lg:grid-cols-[1.6fr_1fr] gap-6">
          <RecentlyLoaded />
          <LastOrder />
        </div>
      </section>

      {/* Recommended */}
      <section>
        <SectionHeader sub="Based on what's in your stash.">STUFF YOU MIGHT LOAD</SectionHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {bestsellerProducts.slice(0, 4).map(p => <ProductCard key={p.slug} product={p} />)}
        </div>
        <div className="text-right mt-5">
          <Link to="/shop" className="font-mono text-xs tracking-wider text-white/65 hover:text-white">SEE MORE →</Link>
        </div>
      </section>

      {/* Need a hand */}
      <GlassCard className="p-10 text-center">
        <Headphones className="w-10 h-10 mx-auto mb-4 text-white/70" strokeWidth={1.4} />
        <h3 className="font-black text-3xl tracking-tight mb-2">NEED A HAND?</h3>
        <p className="text-white/65 mb-6">Plugin not loading? Stuck on install? Real human, real fast.</p>
        <Link to="/contact-us" className="btn-ghost">HIT US UP →</Link>
      </GlassCard>
    </div>
  );
}

function SectionHeader({ children, sub }: { children: React.ReactNode; sub?: string }) {
  return (
    <div className="mb-6">
      <div className="section-header !mb-2">{children}</div>
      {sub && <p className="font-mono text-xs text-white/55 tracking-wider -mt-2">{sub}</p>}
    </div>
  );
}

function StatusStrip({ alerts }: { alerts: Alert[] }) {
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused || alerts.length < 2) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const t = setInterval(() => setIdx(i => (i + 1) % alerts.length), 6000);
    return () => clearInterval(t);
  }, [paused, alerts.length]);

  const a = alerts[idx];

  return (
    <div onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div className="glass-card p-5 md:p-6" style={{ background: "linear-gradient(90deg, rgba(255,0,60,0.18), rgba(255,0,60,0.06))" }} role="status" aria-live="polite">
        <div className="chromatic-edge" />
        <div className="glass-noise" />
        <div className="relative z-10 flex items-center gap-4 flex-wrap">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-[var(--accent-red)] pulse-dot shadow-[0_0_12px_var(--accent-red)]" />
          <span className="font-mono text-[12px] md:text-[13px] tracking-[0.14em] font-bold flex-1">{a.label}</span>
          <Link to={a.to} className="btn-ghost !py-2 !px-4 !text-xs">{a.cta} →</Link>
        </div>
      </div>
      {alerts.length > 1 && (
        <div className="flex justify-center gap-2 mt-3">
          {alerts.map((_, i) => (
            <button key={i} onClick={() => setIdx(i)} className={`h-1.5 rounded-full transition-all ${i === idx ? "w-6 bg-white/80" : "w-1.5 bg-white/25"}`} aria-label={`Alert ${i + 1}`} />
          ))}
        </div>
      )}
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
      el.style.transform = `perspective(1200px) rotateX(${(y - 0.5) * 5}deg) rotateY(${(x - 0.5) * -5}deg) translateY(-4px)`;
      el.style.setProperty("--glare-peak", `${x * 100}%`);
    };
    const leave = () => { el.style.transform = ""; el.style.removeProperty("--glare-peak"); };
    el.addEventListener("mousemove", move); el.addEventListener("mouseleave", leave);
    return () => { el.removeEventListener("mousemove", move); el.removeEventListener("mouseleave", leave); };
  }, []);
  return (
    <Link ref={ref} to={to} aria-label={label} className="glass-card block p-5 group">
      <div className="chromatic-edge" /><div className="glass-noise" />
      <div className="relative z-10 flex flex-col h-full min-h-[140px]">
        <Icon className="w-7 h-7 text-white/80 mb-4" strokeWidth={1.4} />
        <div className="font-black text-base md:text-lg leading-tight tracking-tight">{label}</div>
        <div className="font-mono text-[10px] md:text-[11px] tracking-[0.12em] text-white/55 mt-2">{stat}</div>
        <ChevronRight className="w-4 h-4 text-white/40 mt-auto self-end group-hover:text-white group-hover:translate-x-1 transition-all" />
      </div>
    </Link>
  );
}

function RecentlyLoaded() {
  const recent = [...library].filter(l => l.lastDownloaded).sort((a, b) => (b.lastDownloaded! > a.lastDownloaded! ? 1 : -1)).slice(0, 5);
  return (
    <GlassCard variant="subtle" className="p-5">
      <div className="font-mono text-[11px] tracking-[0.16em] text-[var(--accent-red-glow)] mb-4">// RECENTLY LOADED</div>
      <ul className="divide-y divide-white/8">
        {recent.map(item => {
          const p = getLibProduct(item.slug)!;
          return (
            <li key={item.slug} className="flex items-center gap-4 py-3 group hover:bg-white/[0.03] -mx-2 px-2 rounded-lg transition">
              <div className="w-14 h-14 rounded-xl shrink-0 border border-white/15 overflow-hidden" style={{ background: p.coverGradient }} />
              <div className="min-w-0 flex-1">
                <div className="font-bold text-[15px] truncate">{p.name}</div>
                <div className="font-mono text-[10px] tracking-wider text-white/50 mt-0.5">DOWNLOADED {formatDate(item.lastDownloaded!).toUpperCase()}</div>
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
  return (
    <GlassCard variant="blue" className="p-6 flex flex-col">
      <div className="font-mono text-[11px] tracking-[0.16em] text-[var(--accent-red-glow)] mb-1">// ORDER FROM {formatDate(order.date).toUpperCase()}</div>
      <div className="font-mono text-[11px] tracking-wider text-white/55 mb-5">#{order.id}</div>
      <ul className="space-y-1.5 mb-6">
        {shown.map(n => <li key={n} className="text-white/85 text-sm truncate">— {n}</li>)}
        {extra > 0 && <li className="text-white/50 text-sm font-mono">+{extra} more</li>}
      </ul>
      <div className="font-black text-4xl mb-5 mt-auto">${order.total}</div>
      <div className="flex gap-2">
        <Link to="/account/orders/$id" params={{ id: order.id }} className="btn-ghost !text-xs flex-1 !px-3">VIEW ORDER →</Link>
        <button className="btn-primary !text-xs flex-1 !px-3">RE-DOWNLOAD ALL</button>
      </div>
    </GlassCard>
  );
}
