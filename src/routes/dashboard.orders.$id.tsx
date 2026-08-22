import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { DashboardShell, DashCard, StatusBadge } from "@/components/DashboardShell";
import { orders, customers, formatMoney, relativeTime } from "@/lib/dashboard-mock";

export const Route = createFileRoute("/dashboard/orders/$id")({
  head: () => ({ meta: [{ title: "Order — Plugin Warehouse" }] }),
  component: OrderDetail,
});

function OrderDetail() {
  const { id } = useParams({ from: "/dashboard/orders/$id" });
  const o = orders.find(x => x.id === id);
  if (!o) return <DashboardShell title="Order not found"><DashCard><Link to="/dashboard/orders" className="text-[var(--accent-red-glow)] text-sm">Back to orders</Link></DashCard></DashboardShell>;
  const cust = customers.find(c => c.id === o.customerId)!;
  return (
    <DashboardShell title={o.number}>
      <div className="max-w-4xl mx-auto space-y-6">
        <DashCard>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-3 mb-1"><h2 className="font-display text-2xl">{o.number}</h2><StatusBadge status={o.status} /></div>
              <div className="text-xs text-white/50 font-mono">{new Date(o.createdAt).toLocaleString()}</div>
            </div>
            <Link to="/dashboard/customers" search={{ filter: "all" }} className="text-right"><div className="text-xs text-white/40">Customer</div><div className="text-sm hover:text-[var(--accent-red-glow)]">{cust.name}</div><div className="text-[11px] font-mono text-white/50">{cust.email}</div></Link>
          </div>
        </DashCard>
        <DashCard title="Items">
          <table className="w-full text-sm">
            <tbody>
              {o.items.map((it, i) => (
                <tr key={i} className="border-t border-white/5"><td className="py-2"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded" style={{ background: it.coverGradient }} /><span>{it.name}</span></div></td><td className="py-2 text-right font-mono text-xs">{formatMoney(it.price)}</td><td className="py-2 text-right text-[10px] text-white/50 font-mono">Downloaded</td></tr>
              ))}
            </tbody>
          </table>
          <div className="border-t border-white/10 mt-4 pt-4 space-y-1 font-mono text-xs text-right">
            <div className="text-white/60">Subtotal: {formatMoney(o.subtotal)}</div>
            {o.discount > 0 && <div className="text-[var(--accent-red-glow)]">Discount ({o.discountCode}): -{formatMoney(o.discount)}</div>}
            <div className="text-base text-white">Total: {formatMoney(o.total)}</div>
            <div className="text-[10px] text-white/40 mt-2">Stripe: {o.stripeId}</div>
          </div>
        </DashCard>
        <DashCard title="Activity">
          <ol className="space-y-2 text-xs">
            <li className="flex gap-3"><span className="w-2 h-2 rounded-full bg-emerald-400 mt-1.5" /><div><div>Order placed</div><div className="text-[10px] text-white/40 font-mono">{relativeTime(o.createdAt)}</div></div></li>
            <li className="flex gap-3"><span className="w-2 h-2 rounded-full bg-emerald-400 mt-1.5" /><div><div>Payment confirmed</div><div className="text-[10px] text-white/40 font-mono">{relativeTime(o.createdAt)}</div></div></li>
            <li className="flex gap-3"><span className="w-2 h-2 rounded-full bg-emerald-400 mt-1.5" /><div><div>Files generated</div><div className="text-[10px] text-white/40 font-mono">{relativeTime(o.createdAt)}</div></div></li>
            <li className="flex gap-3"><span className="w-2 h-2 rounded-full bg-[var(--accent-blue-glow)] mt-1.5" /><div><div>{o.downloadCount} downloads tracked</div><div className="text-[10px] text-white/40 font-mono">last {relativeTime(o.createdAt)}</div></div></li>
          </ol>
        </DashCard>
      </div>
    </DashboardShell>
  );
}
