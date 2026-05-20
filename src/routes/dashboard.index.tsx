import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { DashboardShell, DashCard, StatCard, StatusBadge } from "@/components/DashboardShell";
import {
  totalRevenue, revenueThisMonth, ordersThisMonth, activeCustomers,
  revenueSeries, bestSellersThisMonth, orders, customers,
  formatMoney, relativeTime,
} from "@/lib/dashboard-mock";
import { Plus, Tag, Ticket } from "lucide-react";
import { LineChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, Area, AreaChart, CartesianGrid } from "recharts";

export const Route = createFileRoute("/dashboard/")({
  head: () => ({ meta: [{ title: "Overview — Plugin Warehouse" }] }),
  component: Overview,
});

function Overview() {
  const [grouping, setGrouping] = useState<"daily" | "weekly" | "monthly">("daily");
  const series = revenueSeries(grouping);
  const recent = [...orders].sort((a,b) => +new Date(b.createdAt) - +new Date(a.createdAt)).slice(0, 10);
  const best = bestSellersThisMonth();

  return (
    <DashboardShell title="Overview">
      {/* Metric strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total revenue" value={formatMoney(totalRevenue())} delta="12% vs last month" deltaPositive />
        <StatCard label="Revenue this month" value={formatMoney(revenueThisMonth())} delta="8% vs last month" deltaPositive />
        <StatCard label="Orders this month" value={ordersThisMonth().toString()} delta="3% vs last month" deltaPositive />
        <StatCard label="Active customers" value={activeCustomers().toString()} delta="4% vs last month" />
      </div>

      {/* Revenue chart */}
      <DashCard
        title="Revenue over time"
        className="mb-6"
        action={
          <div className="flex gap-1 p-0.5 rounded-lg border border-white/10">
            {(["daily","weekly","monthly"] as const).map(g => (
              <button key={g} onClick={() => setGrouping(g)} className={`px-3 py-1 rounded-md text-[10px] uppercase tracking-wider font-mono transition ${grouping===g ? "bg-[var(--accent-red)] text-white" : "text-white/60 hover:text-white"}`}>{g}</button>
            ))}
          </div>
        }
      >
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series}>
              <defs>
                <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#FF003C" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="#FF003C" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="label" stroke="rgba(255,255,255,0.4)" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis stroke="rgba(255,255,255,0.4)" fontSize={10} tickFormatter={(v) => `$${v/1000}k`} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background: "#1F0540", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, fontSize: 12 }} formatter={(v: number) => formatMoney(v)} />
              <Area type="monotone" dataKey="value" stroke="#FF003C" strokeWidth={2} fill="url(#rev)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </DashCard>

      {/* Two columns */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-6">
        <div className="lg:col-span-3">
          <DashCard title="Recent orders" action={<Link to="/dashboard/orders" className="text-xs text-white/60 hover:text-white">View all →</Link>}>
            <div className="overflow-x-auto -mx-2">
              <table className="w-full text-sm">
                <thead className="text-[10px] uppercase tracking-wider text-white/40">
                  <tr><th className="text-left px-2 py-2">Order</th><th className="text-left px-2 py-2">Customer</th><th className="text-left px-2 py-2">Items</th><th className="text-right px-2 py-2">Total</th><th className="text-left px-2 py-2">Status</th><th className="text-right px-2 py-2">Time</th></tr>
                </thead>
                <tbody>
                  {recent.map(o => {
                    const cust = customers.find(c => c.id === o.customerId)!;
                    return (
                      <tr key={o.id} className="border-t border-white/5 hover:bg-white/[0.03] cursor-pointer">
                        <td className="px-2 py-3 font-mono text-xs"><Link to={"/dashboard/orders/$id" as any} params={{ id: o.id }} className="hover:text-[var(--accent-red-glow)]">{o.number}</Link></td>
                        <td className="px-2 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[var(--accent-red)] to-[var(--accent-blue)] flex items-center justify-center text-[9px] font-bold">{cust.initials}</div>
                            <span className="text-xs">{cust.name}</span>
                          </div>
                        </td>
                        <td className="px-2 py-3 text-xs text-white/60">{o.items.length}</td>
                        <td className="px-2 py-3 text-right font-mono text-xs">{formatMoney(o.total)}</td>
                        <td className="px-2 py-3"><StatusBadge status={o.status} /></td>
                        <td className="px-2 py-3 text-right font-mono text-[10px] text-white/50">{relativeTime(o.createdAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </DashCard>
        </div>
        <div className="lg:col-span-2">
          <DashCard title="Best sellers this month" action={<Link to="/dashboard/analytics" className="text-xs text-white/60 hover:text-white">View all →</Link>}>
            <ul className="space-y-3">
              {best.map((b, i) => (
                <li key={b.product.id} className="flex items-center gap-3">
                  <span className="font-mono text-sm text-white/40 w-5">{i+1}</span>
                  <div className="w-10 h-10 rounded-md flex-shrink-0" style={{ background: b.product.coverGradient }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-white truncate">{b.product.name}</div>
                    <div className="text-[10px] text-white/50 font-mono">{formatMoney(b.revenue)}</div>
                  </div>
                  <span className="font-mono text-sm">{b.units}</span>
                </li>
              ))}
            </ul>
          </DashCard>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <QuickTile icon={<Plus size={18} />} title="Add product" to="/dashboard/products/new" />
        <QuickTile icon={<Tag size={18} />} title="Create sale event" to="/dashboard/sales/new" />
        <QuickTile icon={<Ticket size={18} />} title="Generate discount code" to="/dashboard/marketing" />
      </div>
    </DashboardShell>
  );
}

function QuickTile({ icon, title, to }: { icon: React.ReactNode; title: string; to: string }) {
  return (
    <Link to={to as any} className="glass-card p-5 flex items-center gap-3 hover:translate-y-[-2px] transition group">
      <div className="chromatic-edge" />
      <div className="relative z-10 flex items-center gap-3 w-full">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[var(--accent-red)]/30 to-[var(--accent-blue)]/30 flex items-center justify-center text-[var(--accent-red-glow)]">{icon}</div>
        <span className="text-sm">{title}</span>
        <span className="ml-auto text-white/40 group-hover:text-white transition">→</span>
      </div>
    </Link>
  );
}
