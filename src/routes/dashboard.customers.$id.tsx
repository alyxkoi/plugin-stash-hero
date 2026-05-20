import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { DashboardShell, DashCard, StatusBadge } from "@/components/DashboardShell";
import { customers, orders, products, formatMoney, relativeTime } from "@/lib/dashboard-mock";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/customers/$id")({
  head: () => ({ meta: [{ title: "Customer — Plugin Warehouse" }] }),
  component: CustomerDetail,
});

function CustomerDetail() {
  const { id } = useParams({ from: "/dashboard/customers/$id" });
  const c = customers.find(x => x.id === id);
  const [notes, setNotes] = useState(c?.notes ?? "");
  if (!c) return <DashboardShell title="Not found"><DashCard><Link to="/dashboard/customers" className="text-[var(--accent-red-glow)] text-sm">Back</Link></DashCard></DashboardShell>;
  const myOrders = orders.filter(o => o.customerId === c.id);
  const owned = Array.from(new Set(myOrders.flatMap(o => o.items.map(i => i.productId)))).map(pid => products.find(p => p.id === pid)).filter(Boolean);

  return (
    <DashboardShell title={c.name}>
      <div className="max-w-5xl mx-auto space-y-6">
        <DashCard>
          <div className="flex flex-wrap items-center gap-5">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[var(--accent-red)] to-[var(--accent-blue)] flex items-center justify-center text-2xl font-bold">{c.initials}</div>
            <div className="flex-1 min-w-[200px]">
              <h2 className="font-display text-2xl">{c.name}</h2>
              <div className="text-xs font-mono text-white/60">{c.email}</div>
              <div className="text-[10px] text-white/40 mt-1">Joined {relativeTime(c.joinedAt)} · <StatusBadge status={c.status} /></div>
              <div className="flex gap-4 mt-3 text-xs">
                <span><span className="text-white/40">Spent: </span><span className="font-mono">{formatMoney(c.totalSpent)}</span></span>
                <span><span className="text-white/40">Orders: </span><span className="font-mono">{c.ordersCount}</span></span>
                <span><span className="text-white/40">Last: </span><span className="font-mono">{relativeTime(c.lastPurchaseAt)}</span></span>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button className="btn-ghost !text-xs !py-2 !px-4">Send email</button>
              <button className="btn-ghost !text-xs !py-2 !px-4">Issue refund</button>
              <button className="btn-ghost !text-xs !py-2 !px-4 !border-[var(--accent-red)]/40 !text-[var(--accent-red-glow)]">Ban</button>
            </div>
          </div>
        </DashCard>
        <DashCard title="Orders">
          <table className="w-full text-sm">
            <thead className="text-[10px] uppercase tracking-wider text-white/40"><tr><th className="text-left py-2">Order</th><th className="text-left py-2">Items</th><th className="text-right py-2">Total</th><th className="text-left py-2">Status</th><th className="text-right py-2">Date</th></tr></thead>
            <tbody>
              {myOrders.map(o => (
                <tr key={o.id} className="border-t border-white/5"><td className="py-2 font-mono text-xs"><Link to={"/dashboard/orders/$id" as any} params={{ id: o.id } as any} className="hover:text-[var(--accent-red-glow)]">{o.number}</Link></td><td className="py-2 text-xs">{o.items.length}</td><td className="py-2 text-right font-mono text-xs">{formatMoney(o.total)}</td><td className="py-2"><StatusBadge status={o.status} /></td><td className="py-2 text-right text-[10px] font-mono text-white/50">{relativeTime(o.createdAt)}</td></tr>
              ))}
            </tbody>
          </table>
        </DashCard>
        <DashCard title="Plugins owned">
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            {owned.map(p => <div key={p!.id} className="text-center"><div className="w-full aspect-square rounded-lg mb-1" style={{ background: p!.coverGradient }} /><div className="text-[10px] truncate">{p!.name}</div></div>)}
          </div>
        </DashCard>
        <DashCard title="Internal notes">
          <textarea value={notes} onChange={e => setNotes(e.target.value)} onBlur={() => toast.success("Note saved")} rows={4} className="w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--accent-red)] resize-none" placeholder="Add internal notes about this customer..." />
          <div className="text-[10px] text-white/40 mt-2 font-mono">Auto-saves on blur</div>
        </DashCard>
      </div>
    </DashboardShell>
  );
}
