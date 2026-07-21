import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { DashboardShell, DashCard, StatCard } from "@/components/DashboardShell";
import { type AnalyticsRange, RANGE_LABEL } from "@/lib/dashboard-mock";
import { ResponsiveContainer, AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { deriveSaleStatus, formatInSaleTimeZone } from "@/lib/sale-time";
import { Link2 } from "lucide-react";



export const Route = createFileRoute("/dashboard/analytics")({
  head: () => ({ meta: [{ title: "Analytics — Plugin Warehouse" }] }),
  component: Analytics,
});

const RANGES: AnalyticsRange[] = ["wtd", "mtd", "last-month", "30d", "12mo", "all"];
const SHORT: Record<AnalyticsRange, string> = {
  "wtd": "WTD", "mtd": "MTD", "last-month": "LAST MO", "30d": "30D", "12mo": "12MO", "all": "ALL",
};

function fmtMoney(n: number) {
  return `$${Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

const TOOLTIP_STYLE = {
  background: "rgba(20,6,44,0.92)",
  border: "1px solid rgba(255,31,92,0.45)",
  borderRadius: 10,
  fontSize: 12,
  boxShadow: "0 8px 24px rgba(0,0,0,0.5), 0 0 20px rgba(255,0,60,0.25)",
  backdropFilter: "blur(10px)",
  color: "#fff",
} as const;
const TOOLTIP_LABEL_STYLE = { color: "rgba(255,255,255,0.7)", fontSize: 11 } as const;
const TOOLTIP_ITEM_STYLE = { color: "#fff" } as const;
const BAR_CURSOR = { fill: "rgba(255,31,92,0.14)" } as const;
const AXIS_TICK = { fill: "rgba(255,255,255,0.65)" } as const;


function rangeBounds(r: AnalyticsRange): { start: Date; end: Date } {
  const end = new Date();
  const start = new Date();
  const now = new Date();
  if (r === "wtd") { start.setDate(now.getDate() - now.getDay()); start.setHours(0, 0, 0, 0); }
  else if (r === "mtd") { start.setFullYear(now.getFullYear(), now.getMonth(), 1); start.setHours(0, 0, 0, 0); }
  else if (r === "last-month") {
    start.setFullYear(now.getFullYear(), now.getMonth() - 1, 1); start.setHours(0, 0, 0, 0);
    end.setFullYear(now.getFullYear(), now.getMonth(), 0); end.setHours(23, 59, 59, 999);
  }
  else if (r === "30d") start.setDate(now.getDate() - 30);
  else if (r === "12mo") start.setFullYear(now.getFullYear() - 1);
  else start.setTime(0);
  return { start, end };
}

type OrderRow = {
  id: string;
  total: number;
  status: string;
  created_at: string;
  customer_id: string | null;
  utm_source: string | null;
  sale_id: string | null;
  order_items: { name: string; price: number; product_id: string | null; cover_gradient: string | null }[];
};

type SaleEventRow = {
  id: string;
  name: string;
  slug: string;
  discount_pct: number;
  theme_color: string | null;
  start_at: string;
  end_at: string;
  status: string;
};


function RangePills({ value, onChange }: { value: AnalyticsRange; onChange: (r: AnalyticsRange) => void }) {
  return (
    <div className="flex gap-1 p-0.5 rounded-lg border border-white/10">
      {RANGES.map(r => (
        <button key={r} onClick={() => onChange(r)} title={RANGE_LABEL[r]}
          className={`px-2.5 py-1 rounded-md text-[10px] font-mono tracking-wider transition-colors ${value === r ? "bg-[var(--accent-red)] text-white" : "text-white/60 hover:text-white"}`}>
          {SHORT[r]}
        </button>
      ))}
    </div>
  );
}

function Analytics() {
  const [range, setRange] = useState<AnalyticsRange>("30d");
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [sales, setSales] = useState<SaleEventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    (async () => {
      const [{ data: ordersData }, { data: salesData }] = await Promise.all([
        supabase
          .from("orders")
          .select("id, total, status, created_at, customer_id, utm_source, sale_id, order_items(name, price, product_id, cover_gradient)")
          .order("created_at", { ascending: false })
          .limit(5000),
        supabase
          .from("sale_events")
          .select("id, name, slug, discount_pct, theme_color, start_at, end_at, status")
          .neq("status", "draft")
          .order("start_at", { ascending: false }),
      ]);
      setOrders((ordersData ?? []) as any);
      setSales((salesData ?? []) as any);
      setLoading(false);
    })();

  }, []);

  const { start, end } = useMemo(() => rangeBounds(range), [range]);

  const completed = useMemo(() => orders.filter(o => o.status === "completed"), [orders]);
  const inRange = useMemo(() => completed.filter(o => {
    const t = new Date(o.created_at).getTime();
    return t >= start.getTime() && t <= end.getTime();
  }), [completed, start, end]);

  const rev = inRange.reduce((s, o) => s + Number(o.total || 0), 0);
  const aov = inRange.length ? rev / inRange.length : 0;
  const refundedAll = orders.filter(o => o.status === "refunded" && new Date(o.created_at) >= start && new Date(o.created_at) <= end).length;
  const totalInRangeAny = inRange.length + refundedAll;
  const refundRate = totalInRangeAny ? Math.round((refundedAll / totalInRangeAny) * 100) : 0;

  const series = useMemo(() => buildSeries(inRange, range), [inRange, range]);

  const top = useMemo(() => {
    const map = new Map<string, { id: string; name: string; cover: string | null; units: number; revenue: number }>();
    for (const o of inRange) {
      for (const it of o.order_items ?? []) {
        const key = it.product_id || it.name;
        const cur = map.get(key) ?? { id: key, name: it.name, cover: it.cover_gradient, units: 0, revenue: 0 };
        cur.units += 1;
        cur.revenue += Number(it.price || 0);
        map.set(key, cur);
      }
    }
    return [...map.values()].sort((a, b) => b.units - a.units).slice(0, 5);
  }, [inRange]);
  const topMax = Math.max(1, ...top.map(t => t.units));

  const sources = useMemo(() => {
    const map = new Map<string, number>();
    for (const o of inRange) {
      const s = (o.utm_source || "direct").toLowerCase();
      map.set(s, (map.get(s) ?? 0) + Number(o.total || 0));
    }
    return [...map.entries()].map(([source, revenue]) => ({ source, revenue })).sort((a, b) => b.revenue - a.revenue).slice(0, 8);
  }, [inRange]);

  // Per-sale performance: real money captured (post-discount order totals) grouped by sale_id.
  const salePerf = useMemo(() => {
    const totals = new Map<string, { orders: number; revenue: number }>();
    for (const o of orders) {
      if (o.status !== "completed" || !o.sale_id) continue;
      const cur = totals.get(o.sale_id) ?? { orders: 0, revenue: 0 };
      cur.orders += 1;
      cur.revenue += Number(o.total || 0);
      totals.set(o.sale_id, cur);
    }
    return sales
      .map((s) => {
        const t = totals.get(s.id) ?? { orders: 0, revenue: 0 };
        return {
          ...s,
          orders: t.orders,
          revenue: t.revenue,
          liveStatus: deriveSaleStatus(s.start_at, s.end_at, s.status, now),
        };
      })
      .sort((a, b) => new Date(b.start_at).getTime() - new Date(a.start_at).getTime());
  }, [orders, sales, now]);


  const split = useMemo(() => {
    // Group orders by customer within range. First-order in range = "new", later = "returning".
    const perCust = new Map<string, number>();
    const sorted = [...inRange].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    let neu = 0, ret = 0;
    for (const o of sorted) {
      const key = o.customer_id || o.id;
      const seen = perCust.get(key) ?? 0;
      if (seen === 0) neu++; else ret++;
      perCust.set(key, seen + 1);
    }
    return [{ name: "New", value: neu }, { name: "Returning", value: ret }];
  }, [inRange]);

  return (
    <DashboardShell
      title="Analytics"
      action={
        <div className="flex items-center gap-2 min-w-0">
          <Link
            to="/dashboard/campaign-links"
            className="sm:hidden inline-flex items-center justify-center w-9 h-9 rounded-full bg-[var(--accent-red)] text-white shadow-[0_0_18px_rgba(255,0,60,0.35)] shrink-0"
            aria-label="Campaign Links"
          >
            <Link2 size={16} />
          </Link>
          <Link
            to="/dashboard/campaign-links"
            className="hidden sm:inline-flex btn-primary !py-1.5 !px-3 !min-h-0 text-[10px] shrink-0"
          >
            Campaign Links →
          </Link>
          <RangePills value={range} onChange={setRange} />
        </div>
      }
    >
      {/* Shared SVG defs for chart gradients + soft-glow filter used below. */}
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden>
        <defs>
          <linearGradient id="pw-red-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FF6188" />
            <stop offset="55%" stopColor="#FF003C" />
            <stop offset="100%" stopColor="#8A0022" />
          </linearGradient>
          <linearGradient id="pw-blue-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#5B58FF" />
            <stop offset="60%" stopColor="#0E0BD1" />
            <stop offset="100%" stopColor="#050380" />
          </linearGradient>
          <filter id="pw-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
      </svg>

      <div key={`kpi-${range}`} className="dash-page grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatCard label={`Revenue · ${RANGE_LABEL[range]}`} value={fmtMoney(rev)} />
        <StatCard label="Avg order value" value={fmtMoney(aov)} />
        <StatCard label="Refund rate" value={`${refundRate}%`} />
      </div>


      <DashCard title="Revenue" action={<RangePills value={range} onChange={setRange} />} className="mb-6">
        <div key={`rev-${range}`} className="dash-page h-72">
          {series.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-white/40 font-mono">{loading ? "Loading…" : "No revenue in this range."}</div>
          ) : (
            <ResponsiveContainer>
              <AreaChart data={series}>
                <defs>
                  <linearGradient id="r2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#FF003C" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="#FF003C" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis dataKey="label" stroke="rgba(255,255,255,0.55)" fontSize={10} tickLine={false} axisLine={false} tick={{ fill: "rgba(255,255,255,0.65)" }} />
                <YAxis stroke="rgba(255,255,255,0.55)" fontSize={10} tickFormatter={v => `$${v}`} tickLine={false} axisLine={false} tick={{ fill: "rgba(255,255,255,0.65)" }} />
                <Tooltip
                  cursor={{ stroke: "rgba(255,31,92,0.55)", strokeWidth: 1, strokeDasharray: "3 3" }}
                  contentStyle={{ background: "rgba(20,6,44,0.92)", border: "1px solid rgba(255,31,92,0.45)", borderRadius: 10, fontSize: 12, boxShadow: "0 8px 24px rgba(0,0,0,0.5), 0 0 20px rgba(255,0,60,0.25)", backdropFilter: "blur(10px)", color: "#fff" }}
                  labelStyle={{ color: "rgba(255,255,255,0.7)", fontSize: 11 }}
                  itemStyle={{ color: "#fff" }}
                  formatter={(v: number) => fmtMoney(v)}
                />
                <Area type="monotone" dataKey="value" stroke="#FF003C" strokeWidth={2} fill="url(#r2)" isAnimationActive animationDuration={800} animationEasing="ease-out" />

              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </DashCard>

      <DashCard title="Top 5 products" action={<RangePills value={range} onChange={setRange} />} className="mb-6">
        <div key={`top-${range}`} className="dash-page space-y-3">
          {top.length === 0 && <div className="text-xs text-white/40 font-mono py-6 text-center">No sales in this range.</div>}
          {top.map((t, i) => (
            <div key={t.id} className="flex items-center gap-4">
              <span className="font-mono text-sm text-white/40 w-5">{i + 1}</span>
              <div className="w-10 h-10 rounded-md flex-shrink-0" style={{ background: t.cover || "linear-gradient(135deg,#FF003C,#4066FF)" }} />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-3 mb-1.5">
                  <div className="text-sm text-white truncate">{t.name}</div>
                  <div className="flex gap-4 font-mono text-[11px] text-white/70 shrink-0">
                    <span><span className="text-white/40">SOLD</span> {t.units}</span>
                    <span className="text-white"><span className="text-white/40">REV</span> {fmtMoney(t.revenue)}</span>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <DashCard title="New vs returning" action={<RangePills value={range} onChange={setRange} />}>
          <div key={`split-${range}`} className="dash-page h-56">
            {split[0].value + split[1].value === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-white/40 font-mono">No orders in this range.</div>
            ) : (
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={split}
                    dataKey="value"
                    innerRadius={52}
                    outerRadius={84}
                    paddingAngle={3}
                    stroke="rgba(20,6,44,0.9)"
                    strokeWidth={2}
                    isAnimationActive
                    animationDuration={700}
                    style={{ filter: "url(#pw-glow)" }}
                  >
                    <Cell fill="url(#pw-red-grad)" />
                    <Cell fill="url(#pw-blue-grad)" />
                  </Pie>
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    labelStyle={TOOLTIP_LABEL_STYLE}
                    itemStyle={TOOLTIP_ITEM_STYLE}
                  />
                </PieChart>
              </ResponsiveContainer>

            )}
          </div>
          <div className="flex justify-center gap-4 text-xs">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-[var(--accent-red)]" /> New ({split[0].value})</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-[var(--accent-blue)]" /> Returning ({split[1].value})</span>
          </div>
        </DashCard>

        <DashCard title="Where customers come from" action={<RangePills value={range} onChange={setRange} />}>
          <div key={`src-${range}`} className="dash-page h-64">
            {sources.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-white/40 font-mono">No tracked sources in this range.</div>
            ) : (
              <ResponsiveContainer>
                <BarChart data={sources} layout="vertical" margin={{ left: 60 }}>
                  <CartesianGrid stroke="rgba(255,255,255,0.06)" horizontal={false} />
                  <XAxis type="number" stroke="rgba(255,255,255,0.55)" fontSize={10} tick={AXIS_TICK} axisLine={false} tickLine={false} />
                  <YAxis dataKey="source" type="category" stroke="rgba(255,255,255,0.55)" fontSize={10} tick={AXIS_TICK} axisLine={false} tickLine={false} />
                  <Tooltip
                    cursor={BAR_CURSOR}
                    contentStyle={TOOLTIP_STYLE}
                    labelStyle={TOOLTIP_LABEL_STYLE}
                    itemStyle={TOOLTIP_ITEM_STYLE}
                    formatter={(v: number) => fmtMoney(v)}
                  />
                  <Bar
                    dataKey="revenue"
                    fill="url(#pw-blue-grad)"
                    radius={[0, 6, 6, 0]}
                    activeBar={{ fill: "url(#pw-red-grad)", stroke: "#FF003C", strokeWidth: 1 }}
                    isAnimationActive
                    animationDuration={700}
                    style={{ filter: "url(#pw-glow)" }}
                  />

                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <p className="text-[10px] text-white/40 mt-2 font-mono">UTM source captured at checkout. Untagged orders count as "direct".</p>
        </DashCard>
      </div>

      <DashCard title="Sale performance">
        {salePerf.length === 0 ? (
          <div className="py-8 text-center text-xs text-white/40 font-mono">
            {loading ? "Loading…" : "No sale events yet."}
          </div>
        ) : (
          <div
            className="grid grid-cols-1 md:grid-cols-2 gap-3 overflow-y-auto pr-1"
            style={{ maxHeight: "calc(6 * 5.5rem + 1rem)" }}
          >
            {salePerf.map((s) => {
              const isActive = s.liveStatus === "active";
              const accent = s.theme_color || "#FF003C";
              return (
                <div
                  key={s.id}
                  className="relative rounded-lg border p-3 transition-colors"
                  style={{
                    borderColor: isActive ? accent + "88" : "rgba(255,255,255,0.08)",
                    background: isActive
                      ? `linear-gradient(135deg, ${accent}18, rgba(25,7,55,0.6))`
                      : "rgba(255,255,255,0.02)",
                    boxShadow: isActive ? `0 0 24px ${accent}22` : "none",
                  }}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="min-w-0">
                      <div className="text-sm text-white truncate font-medium">{s.name}</div>
                      <div className="text-[10px] font-mono text-white/45 mt-0.5">
                        {formatInSaleTimeZone(s.start_at, { year: undefined })} — {formatInSaleTimeZone(s.end_at, { year: undefined })}
                      </div>
                    </div>
                    <span
                      className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0"
                      style={{
                        background: isActive ? "#FF003C" : "rgba(255,255,255,0.08)",
                        color: isActive ? "#fff" : "rgba(255,255,255,0.55)",
                      }}
                    >
                      {isActive ? "Active" : s.liveStatus === "scheduled" ? "Scheduled" : "Ended"}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-4 pt-1.5 border-t border-white/5">
                    <div>
                      <div className="text-[9px] font-mono uppercase tracking-wider text-white/40">Purchases</div>
                      <div className="font-mono text-sm text-white">{s.orders}</div>
                    </div>
                    <div>
                      <div className="text-[9px] font-mono uppercase tracking-wider text-white/40">Revenue</div>
                      <div className="font-mono text-sm" style={{ color: isActive ? accent : "#fff" }}>{fmtMoney(s.revenue)}</div>
                    </div>
                    <div className="ml-auto text-right">
                      <div className="text-[9px] font-mono uppercase tracking-wider text-white/40">Discount</div>
                      <div className="font-mono text-sm text-white/70">{s.discount_pct}%</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </DashCard>

    </DashboardShell>
  );
}

function buildSeries(orders: OrderRow[], range: AnalyticsRange) {
  const grouping: "daily" | "weekly" | "monthly" =
    range === "wtd" || range === "mtd" || range === "30d" || range === "last-month" ? "daily"
    : range === "12mo" ? "monthly" : "weekly";
  if (orders.length === 0) return [];
  const buckets = new Map<string, { key: string; label: string; ts: number; value: number }>();
  const keyOf = (d: Date) => {
    if (grouping === "daily") {
      const k = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      return { key: k, label: d.toLocaleDateString("en", { month: "short", day: "numeric" }), ts: new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() };
    }
    if (grouping === "weekly") {
      const start = new Date(d); start.setDate(d.getDate() - d.getDay()); start.setHours(0, 0, 0, 0);
      return { key: `w-${start.getTime()}`, label: start.toLocaleDateString("en", { month: "short", day: "numeric" }), ts: start.getTime() };
    }
    return { key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleDateString("en", { month: "short", year: "2-digit" }), ts: new Date(d.getFullYear(), d.getMonth(), 1).getTime() };
  };
  for (const o of orders) {
    const d = new Date(o.created_at);
    const { key, label, ts } = keyOf(d);
    const cur = buckets.get(key) ?? { key, label, ts, value: 0 };
    cur.value += Number(o.total || 0);
    buckets.set(key, cur);
  }
  return [...buckets.values()].sort((a, b) => a.ts - b.ts);
}
