import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { DashboardShell, DashCard, StatusBadge } from "@/components/DashboardShell";
import { orders, customers, formatMoney, relativeTime } from "@/lib/dashboard-mock";
import { Search, Download } from "lucide-react";

export const Route = createFileRoute("/dashboard/orders/")({
  head: () => ({ meta: [{ title: "Orders — Plugin Warehouse" }] }),
  component: OrdersPage,
});

function OrdersPage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const filtered = useMemo(() => orders.filter(o => {
    const cust = customers.find(c => c.id === o.customerId);
    if (q && !o.number.toLowerCase().includes(q.toLowerCase()) && !cust?.email.toLowerCase().includes(q.toLowerCase()) && !cust?.name.toLowerCase().includes(q.toLowerCase())) return false;
    if (status !== "all" && o.status !== status) return false;
    return true;
  }), [q, status]);
  const pageSize = 25;
  const paged = filtered.slice((page-1)*pageSize, page*pageSize);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));

  return (
    <DashboardShell title="Orders" action={<button className="btn-ghost !text-xs !py-2 !px-4 inline-flex items-center gap-1.5"><Download size={13} /> Export CSV</button>}>
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[240px] max-w-[360px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search by order #, name, email" className="w-full bg-white/5 border border-white/15 rounded-lg pl-9 pr-3 py-2 text-sm outline-none focus:border-[var(--accent-red)]" />
        </div>
        <select value={status} onChange={e => setStatus(e.target.value)} className="bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-xs outline-none focus:border-[var(--accent-red)]">
          <option value="all" className="bg-[#1F0540]">All status</option>
          <option value="completed" className="bg-[#1F0540]">Completed</option>
          <option value="refunded" className="bg-[#1F0540]">Refunded</option>
          <option value="partial" className="bg-[#1F0540]">Partial refund</option>
        </select>
      </div>
      <DashCard>
        <div className="overflow-x-auto -mx-2">
          <table className="w-full text-sm">
            <thead className="text-[10px] uppercase tracking-wider text-white/40">
              <tr><th className="text-left px-2 py-2">Order</th><th className="text-left px-2 py-2">Customer</th><th className="text-left px-2 py-2">Items</th><th className="text-right px-2 py-2">Total</th><th className="text-left px-2 py-2">Discount</th><th className="text-left px-2 py-2">Source</th><th className="text-left px-2 py-2">Status</th><th className="text-right px-2 py-2">Date</th><th></th></tr>
            </thead>
            <tbody>
              {paged.map(o => {
                const cust = customers.find(c => c.id === o.customerId)!;
                return (
                  <tr key={o.id} className="border-t border-white/5 hover:bg-white/[0.03]">
                    <td className="px-2 py-2 font-mono text-xs"><Link to={"/dashboard/orders/$id" as any} params={{ id: o.id } as any} className="hover:text-[var(--accent-red-glow)]">{o.number}</Link></td>
                    <td className="px-2 py-2"><div className="flex items-center gap-2"><div className="w-6 h-6 rounded-full bg-gradient-to-br from-[var(--accent-red)] to-[var(--accent-blue)] flex items-center justify-center text-[9px] font-bold">{cust.initials}</div><span className="text-xs">{cust.name}</span></div></td>
                    <td className="px-2 py-2 text-xs text-white/70">{o.items[0].name}{o.items.length > 1 && <span className="text-white/40"> + {o.items.length - 1} more</span>}</td>
                    <td className="px-2 py-2 text-right font-mono text-xs">{formatMoney(o.total)}</td>
                    <td className="px-2 py-2 text-[10px] font-mono text-white/60">{o.discountCode ?? "—"}</td>
                    <td className="px-2 py-2">{o.utmSource && <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/5 border border-white/10">{o.utmSource}</span>}</td>
                    <td className="px-2 py-2"><StatusBadge status={o.status} /></td>
                    <td className="px-2 py-2 text-right text-[10px] font-mono text-white/50">{relativeTime(o.createdAt)}</td>
                    <td className="px-2 py-2 text-right"><Link to={"/dashboard/orders/$id" as any} params={{ id: o.id } as any} className="text-xs text-white/60 hover:text-white">View</Link></td>
                  </tr>
                );
              })}
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
    </DashboardShell>
  );
}
