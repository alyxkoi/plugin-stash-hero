import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { DashboardShell, DashCard, StatusBadge } from "@/components/DashboardShell";
import { OrderDrawer } from "@/components/AdminDrawers";
import { Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Row = {
  id: string; number: string; total: number; discount: number; discount_code: string | null;
  utm_source: string | null; status: string; created_at: string; user_id: string | null;
  order_items: { name: string }[];
};

function formatMoney(n: number) { return `$${Number(n).toFixed(2)}`; }
function relativeTime(iso: string) {
  const d = new Date(iso).getTime(); const s = (Date.now() - d) / 1000;
  if (s < 60) return "just now"; if (s < 3600) return `${Math.floor(s/60)}m ago`;
  if (s < 86400) return `${Math.floor(s/3600)}h ago`; return `${Math.floor(s/86400)}d ago`;
}

export const Route = createFileRoute("/dashboard/orders/")({
  head: () => ({ meta: [{ title: "Orders — Plugin Warehouse" }] }),
  component: OrdersPage,
});

function OrdersPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [openOrderId, setOpenOrderId] = useState<string | null>(null);
  const pageSize = 25;

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("orders")
        .select("id, number, total, discount, discount_code, utm_source, status, created_at, user_id, order_items(name)")
        .order("created_at", { ascending: false })
        .limit(500);
      setRows((data ?? []) as any);
    })();
  }, []);

  const filtered = useMemo(() => rows.filter(o => {
    if (q && !o.number.toLowerCase().includes(q.toLowerCase()) &&
        !o.order_items.some(i => i.name.toLowerCase().includes(q.toLowerCase()))) return false;
    if (status !== "all" && o.status !== status) return false;
    return true;
  }), [rows, q, status]);
  const paged = filtered.slice((page-1)*pageSize, page*pageSize);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));

  return (
    <DashboardShell title="Orders">
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[240px] max-w-[360px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search by order #, product" className="w-full bg-white/5 border border-white/15 rounded-lg pl-9 pr-3 py-2 text-sm outline-none focus:border-[var(--accent-red)]" />
        </div>
        <select value={status} onChange={e => setStatus(e.target.value)} className="bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-xs outline-none focus:border-[var(--accent-red)]">
          <option value="all" className="bg-[#1F0540]">All status</option>
          <option value="completed" className="bg-[#1F0540]">Completed</option>
          <option value="refunded" className="bg-[#1F0540]">Refunded</option>
          <option value="partial" className="bg-[#1F0540]">Partial refund</option>
          <option value="pending" className="bg-[#1F0540]">Pending</option>
        </select>
      </div>
      <DashCard>
        <div className="overflow-x-auto -mx-2">
          <table className="w-full text-sm">
            <thead className="text-[10px] uppercase tracking-wider text-white/40">
              <tr><th className="text-left px-2 py-2">Order</th><th className="text-left px-2 py-2">Items</th><th className="text-right px-2 py-2">Total</th><th className="text-left px-2 py-2">Discount</th><th className="text-left px-2 py-2">Source</th><th className="text-left px-2 py-2">Status</th><th className="text-right px-2 py-2">Date</th></tr>
            </thead>
            <tbody>
              {paged.map(o => (
                <tr key={o.id} onClick={() => setOpenOrderId(o.id)} className="border-t border-white/5 hover:bg-white/[0.03] cursor-pointer">
                  <td className="px-2 py-2 font-mono text-xs text-white">{o.number}</td>
                  <td className="px-2 py-2 text-xs text-white/70">{o.order_items[0]?.name ?? "—"}{o.order_items.length > 1 && <span className="text-white/40"> + {o.order_items.length - 1} more</span>}</td>
                  <td className="px-2 py-2 text-right font-mono text-xs">{formatMoney(o.total)}</td>
                  <td className="px-2 py-2 text-[10px] font-mono text-white/60">{o.discount_code ?? "—"}</td>
                  <td className="px-2 py-2">{o.utm_source && <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/5 border border-white/10">{o.utm_source}</span>}</td>
                  <td className="px-2 py-2"><StatusBadge status={o.status} /></td>
                  <td className="px-2 py-2 text-right text-[10px] font-mono text-white/50">{relativeTime(o.created_at)}</td>
                </tr>
              ))}
              {paged.length === 0 && (
                <tr><td colSpan={7} className="px-2 py-12 text-center text-white/40 text-sm">No orders yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/5 text-xs font-mono text-white/50">
          <span>{filtered.length} orders</span>
          <div className="flex items-center gap-2">
            <button disabled={page<=1} onClick={() => setPage(p=>p-1)} className="px-2 py-1 rounded hover:bg-white/5 disabled:opacity-30">Prev</button>
            <span>{page} / {totalPages}</span>
            <button disabled={page>=totalPages} onClick={() => setPage(p=>p+1)} className="px-2 py-1 rounded hover:bg-white/5 disabled:opacity-30">Next</button>
          </div>
        </div>
      </DashCard>
      <OrderDrawer open={!!openOrderId} orderId={openOrderId} onClose={() => setOpenOrderId(null)} />
    </DashboardShell>
  );
}
