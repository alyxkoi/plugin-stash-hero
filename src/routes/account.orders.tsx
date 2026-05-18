import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, ChevronDown, ExternalLink } from "lucide-react";
import { GlassCard } from "@/components/GlassCard";
import { orders, getLibProduct, formatDate, totalSpent, type Order } from "@/lib/account-data";

export const Route = createFileRoute("/account/orders")({
  head: () => ({ meta: [{ title: "Your Orders — Plugin Warehouse" }] }),
  component: OrdersPage,
});

function OrdersPage() {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    return orders.filter(o => {
      if (query) {
        const q = query.toLowerCase();
        const inId = o.id.toLowerCase().includes(q);
        const inItems = o.items.some(i => getLibProduct(i.slug)?.name.toLowerCase().includes(q));
        if (!inId && !inItems) return false;
      }
      return true;
    }).sort((a, b) => b.date.localeCompare(a.date));
  }, [query]);

  const byYear = useMemo(() => {
    const map = new Map<number, Order[]>();
    filtered.forEach(o => {
      const y = new Date(o.date).getFullYear();
      if (!map.has(y)) map.set(y, []);
      map.get(y)!.push(o);
    });
    return Array.from(map.entries()).sort((a, b) => b[0] - a[0]);
  }, [filtered]);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-[clamp(2.25rem,5vw,4rem)] leading-[0.95] tracking-tight">YOUR ORDERS</h1>
        <div className="mt-4 label-mini flex flex-wrap gap-3">
          <span>{orders.length} ORDERS</span><span className="text-white/25">·</span>
          <span>${totalSpent} TOTAL</span><span className="text-white/25">·</span>
          <span>LAST ORDER {formatDate(orders[0].date)}</span>
        </div>
      </header>

      <div className="relative">
        <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Find an order or plugin in your history" className="input-glass !pl-11 !rounded-full" />
      </div>

      {byYear.length === 0 ? (
        <GlassCard className="p-12 text-center">
          <div className="opacity-30 mb-6 mx-auto w-24 h-24 flex items-center justify-center text-6xl">▢</div>
          <h2 className="font-display text-3xl tracking-wide mb-2">NO ORDERS YET. TIME TO CHANGE THAT.</h2>
          <p className="text-white/70 mb-8">Your DAW won't load itself.</p>
          <Link to="/shop" className="btn-primary">BROWSE THE WAREHOUSE →</Link>
        </GlassCard>
      ) : (
        byYear.map(([year, orders]) => {
          const spent = orders.filter(o => o.status === "PAID").reduce((s, o) => s + o.total, 0);
          return (
            <section key={year}>
              <div className="flex items-end gap-4 mb-5">
                <h2 className="font-display text-3xl">{year}</h2>
                <div className="flex-1 h-px bg-gradient-to-r from-white/20 to-transparent mb-2" />
                <div className="label-mini">{orders.length} ORDERS · ${spent} SPENT</div>
              </div>
              <div className="space-y-4">
                {orders.map(o => <OrderCard key={o.id} order={o} />)}
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}


export function OrderCard({ order, defaultOpen = false }: { order: Order; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const date = new Date(order.date);
  const statusColor = order.status === "PAID" ? "bg-[var(--accent-red)]/85" : order.status === "REFUNDED" ? "bg-white/15" : "bg-amber-500/70";

  const itemsWithProduct = order.items.map(i => ({ ...i, product: getLibProduct(i.slug)! }));

  return (
    <div className="glass-card overflow-hidden">
      <div className="chromatic-edge" /><div className="glass-noise" />
      <div className="relative z-10">
        <button
          onClick={() => setOpen(o => !o)}
          aria-expanded={open}
          className="w-full text-left p-5 md:p-6 flex flex-col md:flex-row md:items-center gap-4 md:gap-6 hover:bg-white/[0.02] transition"
        >
          <div className="flex items-center md:items-stretch gap-4 md:gap-6 md:border-r md:border-white/10 md:pr-6 md:w-36 shrink-0">
            <div>
              <div className="font-black text-2xl md:text-3xl leading-none chrome-text">{date.toLocaleString("en-US", { month: "short", day: "numeric" }).toUpperCase()}</div>
              <div className="font-mono text-[11px] text-white/55 mt-1">{date.getFullYear()}</div>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-mono text-[11px] tracking-[0.14em] text-[var(--accent-red-glow)] mb-2">// ORDER #{order.id}</div>
            <div className="flex items-center mb-2">
              {itemsWithProduct.slice(0, 4).map((it, i) => (
                <div key={it.slug} className="w-9 h-9 rounded-lg border border-white/20 -ml-3 first:ml-0 shadow-md" style={{ background: it.product.coverGradient, zIndex: 10 - i }} />
              ))}
              {itemsWithProduct.length > 4 && (
                <div className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-mono border border-white/20 bg-white/[0.04]">+{itemsWithProduct.length - 4}</div>
              )}
            </div>
            <div className="font-mono text-[11px] text-white/55 tracking-wider">{order.items.length} PLUGIN{order.items.length !== 1 ? "S" : ""}</div>
          </div>
          <div className="flex md:flex-col md:items-end gap-3 justify-between md:justify-start">
            <div className="font-black text-2xl md:text-3xl">${order.total.toFixed(2)}</div>
            <div className={`px-2.5 py-1 rounded-full font-mono text-[10px] font-bold tracking-wider text-white ${statusColor}`}>{order.status}</div>
          </div>
          <ChevronDown className={`w-5 h-5 text-white/50 transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
        </button>

        {open && (
          <div className="border-t border-white/10 p-5 md:p-6 fade-in space-y-6">
            <Link to="/account/orders/$id" params={{ id: order.id }} className="absolute right-6 -mt-2 font-mono text-[11px] text-white/55 hover:text-white tracking-wider flex items-center gap-1">
              <ExternalLink className="w-3 h-3" /> OPEN
            </Link>

            <ul className="divide-y divide-white/8">
              {itemsWithProduct.map(it => (
                <li key={it.slug} className="py-4 flex flex-col md:flex-row md:items-center gap-4">
                  <div className="w-14 h-14 rounded-xl border border-white/15 shrink-0" style={{ background: it.product.coverGradient }} />
                  <div className="flex-1 min-w-0">
                    <div className="font-bold">{it.product.name}</div>
                    <div className="font-mono text-[10px] tracking-wider text-white/55 mt-1">
                      {(it.product.subType || it.product.category).toUpperCase()} · {it.product.formats.slice(0, 2).join(" · ")}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="font-mono font-bold">${it.pricePaid}</div>
                    <button aria-label={`Re-download ${it.product.name}`} className="w-10 h-10 rounded-full bg-[var(--accent-red)] text-white flex items-center justify-center hover:brightness-110">↓</button>
                  </div>
                </li>
              ))}
            </ul>

            <div className="glass-card glass-card--subtle p-4 md:p-5">
              <div className="chromatic-edge" /><div className="relative z-10 space-y-2">
                <Row label="Subtotal" value={`$${order.subtotal}`} />
                {order.discount && <Row label={`Discount (${order.discount.code})`} value={`-$${order.discount.amount}`} accent />}
                <div className="h-px bg-white/10 my-2" />
                <Row label="Total" value={`$${order.total}`} bold />
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-3">
              <button className="btn-ghost flex-1 !text-xs">DOWNLOAD INVOICE</button>
              <button className="btn-primary flex-1 !text-xs">RE-DOWNLOAD ALL →</button>
              <Link to="/contact-us" className="btn-ghost flex-1 !text-xs">NEED HELP? ↗</Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, bold, accent }: { label: string; value: string; bold?: boolean; accent?: boolean }) {
  return (
    <div className={`flex justify-between items-baseline ${bold ? "font-black text-xl" : "text-sm"} ${accent ? "text-[var(--accent-red-glow)]" : ""}`}>
      <span className={bold ? "" : "text-white/70"}>{label}</span>
      <span className="font-mono">{value}</span>
    </div>
  );
}
