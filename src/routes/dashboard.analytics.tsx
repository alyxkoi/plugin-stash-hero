import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { DashboardShell, DashCard, StatCard } from "@/components/DashboardShell";
import { revenueSeries, sourceBreakdown, topCustomers, products, orders, saleEvents, formatMoney, totalRevenue } from "@/lib/dashboard-mock";
import { ResponsiveContainer, AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip, BarChart, Bar, PieChart, Pie, Cell } from "recharts";

export const Route = createFileRoute("/dashboard/analytics")({
  head: () => ({ meta: [{ title: "Analytics — Plugin Warehouse" }] }),
  component: Analytics,
});

function Analytics() {
  const [range, setRange] = useState("30d");
  const series = revenueSeries(range === "7d" ? "daily" : range === "30d" ? "daily" : range === "90d" ? "weekly" : "monthly");
  const aov = totalRevenue() / Math.max(1, orders.length);
  const refundRate = (orders.filter(o => o.status !== "completed").length / orders.length * 100).toFixed(1);
  const topProducts = [...products].filter(p => p.status === "published").sort((a,b) => b.revenue - a.revenue).slice(0, 10);
  const sources = sourceBreakdown();
  const tops = topCustomers();

  return (
    <DashboardShell title="Analytics" action={
      <div className="flex gap-1 p-0.5 rounded-lg border border-white/10">
        {["7d","30d","90d","12mo","all"].map(r => (
          <button key={r} onClick={() => setRange(r)} className={`px-2.5 py-1 rounded-md text-[10px] uppercase font-mono ${range===r ? "bg-[var(--accent-red)] text-white" : "text-white/60 hover:text-white"}`}>{r}</button>
        ))}
      </div>
    }>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatCard label="Total revenue" value={formatMoney(totalRevenue())} delta="11% vs prior" deltaPositive />
        <StatCard label="Avg order value" value={formatMoney(Math.round(aov))} delta="3% vs prior" deltaPositive />
        <StatCard label="Refund rate" value={`${refundRate}%`} />
      </div>
      <DashCard title="Revenue" className="mb-6">
        <div className="h-72">
          <ResponsiveContainer><AreaChart data={series}>
            <defs><linearGradient id="r2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#FF003C" stopOpacity={0.45} /><stop offset="100%" stopColor="#FF003C" stopOpacity={0} /></linearGradient></defs>
            <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis dataKey="label" stroke="rgba(255,255,255,0.4)" fontSize={10} tickLine={false} axisLine={false} />
            <YAxis stroke="rgba(255,255,255,0.4)" fontSize={10} tickFormatter={v => `$${v/1000}k`} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={{ background: "#1F0540", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, fontSize: 12 }} formatter={(v: number) => formatMoney(v)} />
            <Area type="monotone" dataKey="value" stroke="#FF003C" strokeWidth={2} fill="url(#r2)" />
          </AreaChart></ResponsiveContainer>
        </div>
      </DashCard>
      <DashCard title="Top products" className="mb-6">
        <div className="h-64 mb-4">
          <ResponsiveContainer><BarChart data={topProducts.map(p => ({ name: p.name.split(" ").slice(0,2).join(" "), value: p.revenue }))} layout="vertical" margin={{ left: 80 }}>
            <CartesianGrid stroke="rgba(255,255,255,0.05)" horizontal={false} />
            <XAxis type="number" stroke="rgba(255,255,255,0.4)" fontSize={10} tickFormatter={v => `$${v/1000}k`} />
            <YAxis dataKey="name" type="category" stroke="rgba(255,255,255,0.4)" fontSize={10} />
            <Tooltip contentStyle={{ background: "#1F0540", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, fontSize: 12 }} formatter={(v: number) => formatMoney(v)} />
            <Bar dataKey="value" fill="#FF003C" radius={[0,6,6,0]} />
          </BarChart></ResponsiveContainer>
        </div>
      </DashCard>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <DashCard title="Customer growth">
          <div className="h-56">
            <ResponsiveContainer><PieChart>
              <Pie data={[{ name: "New", value: 38 },{ name: "Returning", value: 47 }]} dataKey="value" innerRadius={50} outerRadius={80} paddingAngle={3}>
                <Cell fill="#FF003C" /><Cell fill="#0E0BD1" />
              </Pie>
              <Tooltip contentStyle={{ background: "#1F0540", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, fontSize: 12 }} />
            </PieChart></ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-4 text-xs"><span className="flex items-center gap-1"><span className="w-2 h-2 bg-[var(--accent-red)]" /> New</span><span className="flex items-center gap-1"><span className="w-2 h-2 bg-[var(--accent-blue)]" /> Returning</span></div>
        </DashCard>
        <DashCard title="Top customers">
          <ul className="space-y-2">
            {tops.map((c,i) => (
              <li key={c.id} className="flex items-center gap-3 text-sm"><span className="font-mono text-white/40 w-5 text-xs">{i+1}</span><div className="w-7 h-7 rounded-full bg-gradient-to-br from-[var(--accent-red)] to-[var(--accent-blue)] flex items-center justify-center text-[10px] font-bold">{c.initials}</div><span className="flex-1 truncate text-xs">{c.name}</span><span className="font-mono text-xs">{formatMoney(c.totalSpent)}</span></li>
            ))}
          </ul>
        </DashCard>
      </div>
      <DashCard title="Where customers come from" className="mb-6">
        <div className="h-64">
          <ResponsiveContainer><BarChart data={sources} layout="vertical" margin={{ left: 60 }}>
            <CartesianGrid stroke="rgba(255,255,255,0.05)" horizontal={false} />
            <XAxis type="number" stroke="rgba(255,255,255,0.4)" fontSize={10} />
            <YAxis dataKey="source" type="category" stroke="rgba(255,255,255,0.4)" fontSize={10} />
            <Tooltip contentStyle={{ background: "#1F0540", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, fontSize: 12 }} formatter={(v: number) => formatMoney(v)} />
            <Bar dataKey="revenue" fill="#0E0BD1" radius={[0,6,6,0]} />
          </BarChart></ResponsiveContainer>
        </div>
        <p className="text-[10px] text-white/40 mt-2 font-mono">{/* TODO: UTM capture must be wired at storefront entry for this data to populate. */}</p>
      </DashCard>
      <DashCard title="Sale events">
        <table className="w-full text-sm">
          <thead className="text-[10px] uppercase tracking-wider text-white/40"><tr><th className="text-left py-2">Event</th><th className="text-left py-2 px-3">Dates</th><th className="text-right py-2">Discount</th><th className="text-right py-2">Revenue</th><th className="text-right py-2">Orders</th></tr></thead>
          <tbody>
            {saleEvents.map(s => (
              <tr key={s.id} className="border-t border-white/5"><td className="py-2">{s.name}</td><td className="py-2 px-3 text-[10px] font-mono text-white/50">{new Date(s.startAt).toLocaleDateString()} – {new Date(s.endAt).toLocaleDateString()}</td><td className="py-2 text-right font-mono text-xs">{s.discountPct}%</td><td className="py-2 text-right font-mono text-xs">{s.revenue ? formatMoney(s.revenue) : "—"}</td><td className="py-2 text-right font-mono text-xs">—</td></tr>
            ))}
          </tbody>
        </table>
      </DashCard>
    </DashboardShell>
  );
}
