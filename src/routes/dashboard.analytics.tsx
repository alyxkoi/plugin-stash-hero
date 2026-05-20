import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { DashboardShell, DashCard, StatCard } from "@/components/DashboardShell";
import {
  formatMoney, saleEvents,
  type AnalyticsRange, RANGE_LABEL,
  revenueInRange, aovInRange, refundRateInRange,
  revenueSeriesRange, topProductsInRange,
  sourceBreakdownInRange, customerSplitInRange,
} from "@/lib/dashboard-mock";
import { ResponsiveContainer, AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip, BarChart, Bar, PieChart, Pie, Cell } from "recharts";

export const Route = createFileRoute("/dashboard/analytics")({
  head: () => ({ meta: [{ title: "Analytics — Plugin Warehouse" }] }),
  component: Analytics,
});

const RANGES: AnalyticsRange[] = ["wtd", "mtd", "last-month", "30d", "12mo", "all"];
const SHORT: Record<AnalyticsRange, string> = {
  "wtd": "WTD", "mtd": "MTD", "last-month": "LAST MO", "30d": "30D", "12mo": "12MO", "all": "ALL",
};

function RangePills({ value, onChange }: { value: AnalyticsRange; onChange: (r: AnalyticsRange) => void }) {
  return (
    <div className="flex gap-1 p-0.5 rounded-lg border border-white/10">
      {RANGES.map(r => (
        <button
          key={r}
          onClick={() => onChange(r)}
          title={RANGE_LABEL[r]}
          className={`px-2.5 py-1 rounded-md text-[10px] font-mono tracking-wider transition-colors ${value === r ? "bg-[var(--accent-red)] text-white" : "text-white/60 hover:text-white"}`}
        >
          {SHORT[r]}
        </button>
      ))}
    </div>
  );
}

function Analytics() {
  const [range, setRange] = useState<AnalyticsRange>("30d");

  // Recompute everything keyed by range — `key={range}` triggers fade
  const series = useMemo(() => revenueSeriesRange(range), [range]);
  const top = useMemo(() => topProductsInRange(range, 5), [range]);
  const sources = useMemo(() => sourceBreakdownInRange(range), [range]);
  const split = useMemo(() => customerSplitInRange(range), [range]);

  const rev = revenueInRange(range);
  const aov = aovInRange(range);
  const refundRate = refundRateInRange(range);
  const topMax = Math.max(1, ...top.map(t => t.units));

  return (
    <DashboardShell title="Analytics" action={<RangePills value={range} onChange={setRange} />}>
      {/* Top KPIs reflect range */}
      <div key={`kpi-${range}`} className="dash-page grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatCard label={`Revenue · ${RANGE_LABEL[range]}`} value={formatMoney(rev)} delta="vs prior period" deltaPositive />
        <StatCard label="Avg order value" value={formatMoney(aov)} delta="vs prior period" deltaPositive />
        <StatCard label="Refund rate" value={`${refundRate}%`} />
      </div>

      {/* Revenue chart */}
      <DashCard title="Revenue" action={<RangePills value={range} onChange={setRange} />} className="mb-6">
        <div key={`rev-${range}`} className="dash-page h-72">
          <ResponsiveContainer>
            <AreaChart data={series}>
              <defs>
                <linearGradient id="r2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#FF003C" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="#FF003C" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="label" stroke="rgba(255,255,255,0.4)" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis stroke="rgba(255,255,255,0.4)" fontSize={10} tickFormatter={v => `$${v / 1000}k`} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background: "#1F0540", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, fontSize: 12 }} formatter={(v: number) => formatMoney(v)} />
              <Area type="monotone" dataKey="value" stroke="#FF003C" strokeWidth={2} fill="url(#r2)" isAnimationActive animationDuration={800} animationEasing="ease-out" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </DashCard>

      {/* Top 5 products — white bar with sold + revenue */}
      <DashCard title="Top 5 products" action={<RangePills value={range} onChange={setRange} />} className="mb-6">
        <div key={`top-${range}`} className="dash-page space-y-3">
          {top.length === 0 && <div className="text-xs text-white/40 font-mono py-6 text-center">No sales in this range.</div>}
          {top.map((t, i) => (
            <div key={t.product.id} className="flex items-center gap-4">
              <span className="font-mono text-sm text-white/40 w-5">{i + 1}</span>
              <div className="w-10 h-10 rounded-md flex-shrink-0" style={{ background: t.product.coverGradient }} />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-3 mb-1.5">
                  <div className="text-sm text-white truncate">{t.product.name}</div>
                  <div className="flex gap-4 font-mono text-[11px] text-white/70 shrink-0">
                    <span><span className="text-white/40">SOLD</span> {t.units}</span>
                    <span className="text-white"><span className="text-white/40">REV</span> {formatMoney(t.revenue)}</span>
                  </div>
                </div>
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div className="bar-fill" style={{ width: `${(t.units / topMax) * 100}%` }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </DashCard>

      {/* Customer split + Top sources */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <DashCard title="New vs returning" action={<RangePills value={range} onChange={setRange} />}>
          <div key={`split-${range}`} className="dash-page h-56">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={split} dataKey="value" innerRadius={50} outerRadius={80} paddingAngle={3} isAnimationActive animationDuration={700}>
                  <Cell fill="#FF003C" />
                  <Cell fill="#0E0BD1" />
                </Pie>
                <Tooltip contentStyle={{ background: "#1F0540", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-4 text-xs">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-[var(--accent-red)]" /> New ({split[0]?.value ?? 0})</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-[var(--accent-blue)]" /> Returning ({split[1]?.value ?? 0})</span>
          </div>
        </DashCard>

        <DashCard title="Where customers come from" action={<RangePills value={range} onChange={setRange} />}>
          <div key={`src-${range}`} className="dash-page h-64">
            {sources.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-white/40 font-mono">No tracked sources in this range.</div>
            ) : (
              <ResponsiveContainer>
                <BarChart data={sources} layout="vertical" margin={{ left: 60 }}>
                  <CartesianGrid stroke="rgba(255,255,255,0.05)" horizontal={false} />
                  <XAxis type="number" stroke="rgba(255,255,255,0.4)" fontSize={10} />
                  <YAxis dataKey="source" type="category" stroke="rgba(255,255,255,0.4)" fontSize={10} />
                  <Tooltip contentStyle={{ background: "#1F0540", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, fontSize: 12 }} formatter={(v: number) => formatMoney(v)} />
                  <Bar dataKey="revenue" fill="#0E0BD1" radius={[0, 6, 6, 0]} isAnimationActive animationDuration={700} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
          <p className="text-[10px] text-white/40 mt-2 font-mono">UTM source captured at checkout. Mailchimp campaign clicks attribute via utm_source=mailchimp.</p>
        </DashCard>
      </div>

      {/* Sale events table */}
      <DashCard title="Sale events">
        <table className="w-full text-sm">
          <thead className="text-[10px] uppercase tracking-wider text-white/40">
            <tr>
              <th className="text-left py-2">Event</th>
              <th className="text-left py-2 px-3">Dates</th>
              <th className="text-right py-2">Discount</th>
              <th className="text-right py-2">Revenue</th>
            </tr>
          </thead>
          <tbody>
            {saleEvents.map(s => (
              <tr key={s.id} className="border-t border-white/5">
                <td className="py-2">{s.name}</td>
                <td className="py-2 px-3 text-[10px] font-mono text-white/50">{new Date(s.startAt).toLocaleDateString()} – {new Date(s.endAt).toLocaleDateString()}</td>
                <td className="py-2 text-right font-mono text-xs">{s.discountPct}%</td>
                <td className="py-2 text-right font-mono text-xs">{s.revenue ? formatMoney(s.revenue) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </DashCard>
    </DashboardShell>
  );
}
