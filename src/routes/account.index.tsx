import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Folder, ReceiptText, Store, Heart, ChevronRight } from "lucide-react";
import { GlassCard } from "@/components/GlassCard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getGreeting, formatDate } from "@/lib/account-data";

export const Route = createFileRoute("/account/")({
  head: () => ({ meta: [{ title: "Dashboard — Plugin Warehouse" }] }),
  component: Dashboard,
});

type OrderRow = {
  id: string; number: string; total: number; status: string; created_at: string;
  order_items: { id: string; product_id: string | null; product_slug: string | null; name: string; price: number; cover_gradient: string | null; cover_url: string | null }[];
};

function Dashboard() {
  const greeting = getGreeting();
  const { user, loading } = useAuth();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [savedCount, setSavedCount] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (loading || !user) return;
    (async () => {
      const [ordersRes, savedRes] = await Promise.all([
        supabase
          .from("orders")
          .select("id, number, total, status, created_at, order_items(id, product_id, product_slug, name, price, cover_gradient, cover_url)")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
        supabase.from("saved_items").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      ]);
      setOrders((ordersRes.data ?? []) as OrderRow[]);
      setSavedCount(savedRes.count ?? 0);
      setReady(true);
    })();
  }, [user, loading]);

  const completed = useMemo(() => orders.filter(o => o.status === "completed"), [orders]);
  const totalSpent = useMemo(() => completed.reduce((n, o) => n + Number(o.total), 0), [completed]);
  const ownedProducts = useMemo(() => {
    const map = new Map<string, { id: string; slug: string | null; name: string; cover_gradient: string | null; cover_url: string | null; last: string }>();
    for (const o of completed) {
      for (const it of o.order_items ?? []) {
        if (!it.product_id) continue;
        const existing = map.get(it.product_id);
        if (!existing || existing.last < o.created_at) {
          map.set(it.product_id, { id: it.product_id, slug: it.product_slug, name: it.name, cover_gradient: it.cover_gradient, cover_url: it.cover_url, last: o.created_at });
        }
      }
    }
    return [...map.values()].sort((a, b) => (b.last > a.last ? 1 : -1));
  }, [completed]);

  const lastOrder = completed[0];

  return (
    <div className="space-y-12">
      <header>
        <h1 className="font-display text-[clamp(2.5rem,6vw,5rem)] leading-[0.95] tracking-tight shimmer-once">
          {greeting}
        </h1>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
        <QuickTile icon={Folder} label="YOUR STASH" stat={`${ownedProducts.length} PLUGIN${ownedProducts.length === 1 ? "" : "S"} LOADED`} to="/account/library" />
        <QuickTile icon={ReceiptText} label="YOUR ORDERS" stat={`${completed.length} ORDER${completed.length === 1 ? "" : "S"} · $${totalSpent.toFixed(2)} SPENT`} to="/account/orders" />
        <QuickTile icon={Store} label="BROWSE THE WAREHOUSE" stat="FIND YOUR NEXT PLUGIN" to="/shop" />
        <QuickTile icon={Heart} label="SAVED FOR LATER" stat={`${savedCount} SAVED`} to="/account/saved" />
      </div>

      <section>
        <h2 className="section-header">LATELY</h2>
        <div className="grid lg:grid-cols-[1.6fr_1fr] gap-6">
          <RecentlyLoaded items={ownedProducts.slice(0, 5)} ready={ready} />
          <LastOrder order={lastOrder} />
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

function RecentlyLoaded({ items, ready }: { items: { id: string; slug: string | null; name: string; cover_gradient: string | null; cover_url: string | null; last: string }[]; ready: boolean }) {
  return (
    <GlassCard variant="subtle" className="p-5">
      <div className="label-mini mb-4">Recently added to your stash</div>
      {!ready ? (
        <div className="py-8 text-center font-mono text-xs text-white/40">Loading…</div>
      ) : items.length === 0 ? (
        <div className="py-8 text-center">
          <div className="text-white/60 text-sm mb-4">Nothing in your stash yet.</div>
          <Link to="/shop" className="btn-ghost !text-xs">BROWSE THE SHOP →</Link>
        </div>
      ) : (
        <ul className="divide-y divide-white/8">
          {items.map(p => (
            <li key={p.id} className="flex items-center gap-4 py-3 -mx-2 px-2 rounded-lg">
              <div className="w-14 h-14 rounded-xl shrink-0 border border-white/15 overflow-hidden relative" style={{ background: p.cover_gradient ?? "#333" }}>
                {p.cover_url && <img src={p.cover_url} alt="" className="absolute inset-0 w-full h-full object-cover" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-display text-[17px] truncate tracking-wide">{p.name}</div>
                <div className="label-mini mt-0.5">Added {formatDate(p.last)}</div>
              </div>
              {p.slug ? (
                <Link to="/shop/p/$slug" params={{ slug: p.slug }} className="btn-ghost !text-xs !px-3">VIEW →</Link>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </GlassCard>
  );
}

function LastOrder({ order }: { order?: OrderRow }) {
  if (!order) {
    return (
      <GlassCard variant="blue" className="p-6 flex flex-col">
        <div className="label-mini">Last order</div>
        <div className="font-mono text-[11px] tracking-wider text-white/55 mb-5">—</div>
        <p className="text-white/60 text-sm mb-6">No orders yet. Your most recent purchase will appear here.</p>
        <Link to="/shop" className="btn-ghost !text-xs !px-3 mt-auto">BROWSE THE SHOP →</Link>
      </GlassCard>
    );
  }
  const itemNames = (order.order_items ?? []).map(i => i.name);
  const shown = itemNames.slice(0, 3);
  const extra = itemNames.length - shown.length;
  return (
    <GlassCard variant="blue" className="p-6 flex flex-col">
      <div className="label-mini">Last order · {formatDate(order.created_at)}</div>
      <div className="font-mono text-[11px] tracking-wider text-white/55 mb-5">{order.number}</div>
      <ul className="space-y-1.5 mb-6">
        {shown.map(n => <li key={n} className="text-white/85 text-sm truncate">— {n}</li>)}
        {extra > 0 && <li className="text-white/50 text-sm font-mono">+{extra} more</li>}
      </ul>
      <div className="font-mono text-4xl mb-5 mt-auto"><span className="text-red">$</span>{Number(order.total).toFixed(2)}</div>
      <div className="flex gap-2">
        <Link to="/account/orders" className="btn-ghost !text-xs flex-1 !px-3">VIEW ORDERS →</Link>
        <Link to="/account/library" className="btn-primary !text-xs flex-1 !px-3">YOUR STASH →</Link>
      </div>
    </GlassCard>
  );
}
