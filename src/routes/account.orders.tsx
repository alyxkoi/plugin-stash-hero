import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search, ChevronDown, Download, FileText, LogOut } from "lucide-react";
import { GlassCard } from "@/components/GlassCard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, signOut } from "@/hooks/useAuth";
import { toast } from "sonner";
import { downloadPlugin } from "@/lib/download";
import { sumNetRevenue } from "@/lib/revenue";
import { ProductArtwork } from "@/components/ProductArtwork";

const INSTALL_GUIDE_URL =
  "https://thepluginwarehousefiles.com/other%20files/the_plugin_warehouse_installation_guide.pdf";

type Item = { id: string; product_id: string | null; product_slug: string | null; name: string; price: number; cover_gradient: string | null; cover_url: string | null };
type Order = {
  id: string; number: string; subtotal: number; discount: number; total: number;
  discount_code: string | null; status: string; created_at: string; refunded_amount_cents: number | null;
  order_items: Item[];
};

export const Route = createFileRoute("/account/orders")({
  head: () => ({ meta: [{ title: "Your Orders — Plugin Warehouse" }] }),
  component: OrdersPage,
});

function OrdersPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [ready, setReady] = useState(false);
  const [updatedProductIds, setUpdatedProductIds] = useState<Set<string>>(new Set());

  const refreshUpdates = async () => {
    const { data } = await (supabase as any).rpc("get_my_product_file_updates");
    const s = new Set<string>();
    for (const r of (data ?? []) as Array<{ product_id: string; file_updated_at: string; acknowledged_at: string | null }>) {
      if (!r.acknowledged_at || new Date(r.file_updated_at) > new Date(r.acknowledged_at)) {
        s.add(r.product_id);
      }
    }
    setUpdatedProductIds(s);
  };

  useEffect(() => {
    if (loading) return;
    if (!user) { setReady(true); return; }
    (async () => {
      const { data } = await supabase
        .from("orders")
        .select("id, number, subtotal, discount, total, discount_code, status, refunded_amount_cents, created_at, order_items(id, product_id, product_slug, name, price, cover_gradient, cover_url)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setOrders((data ?? []) as any);
      await refreshUpdates();
      setReady(true);
    })();
  }, [user, loading]);

  const acknowledgeProducts = async (productIds: string[]) => {
    const toAck = productIds.filter((id) => updatedProductIds.has(id));
    if (toAck.length === 0) return;
    await (supabase as any).rpc("acknowledge_product_files", { _product_ids: toAck });
    setUpdatedProductIds((prev) => {
      const next = new Set(prev);
      toAck.forEach((id) => next.delete(id));
      return next;
    });
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter(o =>
      o.number.toLowerCase().includes(q) ||
      o.order_items.some(i => i.name.toLowerCase().includes(q)));
  }, [orders, query]);

  // Net of any refunds — same shared calculation as the admin dashboard.
  const totalSpent = sumNetRevenue(orders);

  const onSignOut = async () => {
    await signOut();
    navigate({ to: "/" });
  };

  if (!ready) return <div className="p-8 text-white/60">Loading your orders…</div>;


  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-5">
        <div>
          <h1 className="font-display text-[clamp(2.25rem,5vw,4rem)] leading-[0.95] tracking-tight">YOUR ORDERS</h1>
          <div className="mt-4 label-mini flex flex-wrap gap-3">
            <span>{orders.length} ORDERS</span><span className="text-white/25">·</span>
            <span>${totalSpent.toFixed(2)} TOTAL</span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <a
            href={INSTALL_GUIDE_URL}
            target="_blank"
            rel="noreferrer"
            className="glass-card px-4 h-11 rounded-full inline-flex items-center gap-2 border border-[var(--accent-red)]/50 hover:border-[var(--accent-red)] transition group"
          >
            <span className="chromatic-edge" />
            <span className="relative z-10 flex items-center gap-2">
              <FileText className="w-4 h-4 text-[var(--accent-red-glow)]" strokeWidth={1.7} />
              <span className="font-mono text-[11px] tracking-[0.14em] text-white/90 group-hover:text-white">DOWNLOAD INSTRUCTIONS</span>
            </span>
          </a>
          <button
            onClick={onSignOut}
            className="px-4 h-11 rounded-full inline-flex items-center gap-2 border border-white/12 bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/25 transition"
          >
            <LogOut className="w-4 h-4 text-white/70" strokeWidth={1.7} />
            <span className="font-mono text-[11px] tracking-[0.14em] text-white/80">SIGN OUT</span>
          </button>
        </div>
      </header>

      <div className="relative">
        <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Find an order or plugin" className="input-glass !pl-11 !rounded-full" />
      </div>

      {filtered.length === 0 ? (
        <GlassCard className="p-12 text-center">
          <div className="opacity-30 mb-6 mx-auto w-24 h-24 flex items-center justify-center text-6xl">▢</div>
          <h2 className="font-display text-3xl tracking-wide mb-2">NO ORDERS YET. TIME TO CHANGE THAT.</h2>
          <p className="text-white/70 mb-8">Your DAW won't load itself.</p>
          <Link to="/shop" className="btn-primary">BROWSE THE WAREHOUSE →</Link>
        </GlassCard>
      ) : (
        <div className="space-y-4">
          {filtered.map(o => (
            <OrderCard
              key={o.id}
              order={o}
              updatedProductIds={updatedProductIds}
              onOpen={() => acknowledgeProducts(o.order_items.map(i => i.product_id).filter((x): x is string => !!x))}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function OrderCard({ order, updatedProductIds, onOpen }: { order: Order; updatedProductIds: Set<string>; onOpen: () => void }) {
  const [open, setOpen] = useState(false);
  const date = new Date(order.created_at);
  const items = order.order_items ?? [];
  const statusColor = order.status === "completed" ? "bg-[#7DF5AD] text-[#0D0C13]"
    : order.status === "refunded" ? "bg-white/15" : "bg-amber-500/70";
  const orderHasUpdate = items.some(i => i.product_id && updatedProductIds.has(i.product_id));

  const toggle = () => {
    setOpen((prev) => {
      const next = !prev;
      if (next && orderHasUpdate) onOpen();
      return next;
    });
  };

  async function download(productId: string | null, name: string) {
    await downloadPlugin({ productId });
  }

  return (
    <div className="glass-card overflow-hidden">
      <div className="chromatic-edge" /><div className="glass-noise" />
      <div className="relative z-10">
        <button onClick={toggle} className="account-order-summary w-full text-left p-5 md:p-6 flex items-center gap-4 md:gap-6 hover:bg-white/[0.02] transition">
          <div className="flex-1 min-w-0">
            <div className="label-mini mb-2 flex items-center gap-2">
              <span className="whitespace-nowrap">Order {order.number}</span>
              {orderHasUpdate && (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#FF003C]/15 border border-[#FF003C]/50 text-[#FF6A88] font-mono text-[9px] tracking-[0.16em] font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FF003C] shadow-[0_0_6px_#FF003C]" />
                  UPDATED
                </span>
              )}
            </div>
            <div className="flex items-center mb-2">
              {items.slice(0, 4).map((it, i) => (
                <ProductArtwork key={it.id} src={it.cover_url} name={it.name} gradient={it.cover_gradient ?? undefined} className="w-12 aspect-[4/3] !rounded-lg border border-white/20 -ml-3 first:ml-0 shadow-md" >
                  {it.product_id && updatedProductIds.has(it.product_id) && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#FF003C] border border-black shadow-[0_0_6px_#FF003C]" />
                  )}
                </ProductArtwork>
              ))}
              {items.length > 4 && <div className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-mono border border-white/20 bg-white/[0.04]">+{items.length - 4}</div>}
            </div>
            <div className="font-bold truncate mt-2">{items[0]?.name ?? "Plugin order"}{items.length > 1 ? ` + ${items.length - 1} more` : ""}</div>
            <div className="font-mono text-[10px] text-white/45 tracking-wider mt-1">{items.length} PLUGIN{items.length !== 1 ? "S" : ""}</div>
          </div>
          <div className="account-order-date shrink-0">
            <div className="font-bold text-base leading-none">{date.toLocaleString("en-US", { month: "short", day: "numeric" })}</div>
            <div className="font-mono text-[10px] text-white/45 mt-1">{date.getFullYear()}</div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="font-mono font-bold text-base md:text-lg">${Number(order.total).toFixed(2)}</div>
            <div className={`px-2.5 py-1 rounded-md font-mono text-[10px] font-bold tracking-wider ${statusColor}`}>{order.status.toUpperCase()}</div>
          </div>
          <ChevronDown className={`w-5 h-5 text-white/50 transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
        </button>

        {open && (
          <div className="border-t border-white/10 p-5 md:p-6 space-y-6">
            <ul className="divide-y divide-white/8">
              {items.map(it => {
                const hasUpdate = !!(it.product_id && updatedProductIds.has(it.product_id));
                return (
                <li key={it.id} className="py-4 flex items-center gap-4">
                  <ProductArtwork src={it.cover_url} name={it.name} gradient={it.cover_gradient ?? undefined} className="w-16 aspect-[4/3] !rounded-xl shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-bold truncate flex items-center gap-2">
                      <span className="truncate">{it.name}</span>
                      {hasUpdate && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-[#FF003C]/15 border border-[#FF003C]/50 text-[#FF6A88] font-mono text-[9px] tracking-[0.16em] font-bold shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#FF003C] shadow-[0_0_6px_#FF003C]" />
                          UPDATED
                        </span>
                      )}
                    </div>
                    <div className="font-mono text-[10px] text-white/55 mt-1">${Number(it.price).toFixed(2)}</div>
                  </div>
                  <button onClick={() => download(it.product_id, it.name)} className="btn-primary !text-xs !py-2 !px-4 inline-flex items-center gap-1.5">
                    <Download className="w-3.5 h-3.5" /> Download
                  </button>
                </li>
                );
              })}
              {/* Universal installation guide — appears on every order for every customer */}
              <li className="py-4 flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl border border-[var(--accent-red)]/40 shrink-0 flex items-center justify-center bg-[var(--accent-red)]/10">
                  <FileText className="w-6 h-6 text-[var(--accent-red-glow)]" strokeWidth={1.6} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold truncate">Installation Guide (PDF)</div>
                  <div className="font-mono text-[10px] text-white/55 mt-1 tracking-wider">INCLUDED WITH EVERY ORDER</div>
                </div>
                <a
                  href={INSTALL_GUIDE_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-ghost !text-xs !py-2 !px-4 inline-flex items-center gap-1.5 border-[var(--accent-red)]/50 hover:border-[var(--accent-red)]"
                >
                  <Download className="w-3.5 h-3.5" /> Guide
                </a>
              </li>
            </ul>
            <div className="glass-card glass-card--subtle p-4">
              <div className="chromatic-edge" /><div className="relative z-10 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-white/70">Subtotal</span><span className="font-mono">${Number(order.subtotal).toFixed(2)}</span></div>
                {Number(order.discount) > 0 && <div className="flex justify-between"><span className="text-white/70">Discount{order.discount_code ? ` (${order.discount_code})` : ""}</span><span className="font-mono text-emerald-400">-${Number(order.discount).toFixed(2)}</span></div>}
                <div className="h-px bg-white/10 my-2" />
                <div className="flex justify-between font-black text-lg"><span>Total</span><span className="font-mono">${Number(order.total).toFixed(2)}</span></div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
