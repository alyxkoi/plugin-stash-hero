import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useReducedMotion } from "framer-motion";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChargedPanel,
  DashCard,
  DashboardShell,
  DomainChip,
  RangeControl,
  SegmentedBar,
  StatusBadge,
} from "@/components/DashboardShell";
import { type AnalyticsRange, RANGE_LABEL } from "@/lib/dashboard-mock";
import { supabase } from "@/integrations/supabase/client";
import { deriveSaleStatus, formatInSaleTimeZone } from "@/lib/sale-time";
import { normalizeUtmSource } from "@/lib/utm";
import {
  allocateLineRevenue,
  countsAsSale,
  netRevenue,
  saleOrders,
  sumNetRevenue,
} from "@/lib/revenue";
import { fetchOrderIdentity, splitNewReturning, type IdentityMap } from "@/lib/customer-identity";

export const Route = createFileRoute("/dashboard/analytics")({
  head: () => ({ meta: [{ title: "Analytics — Plugin Warehouse" }] }),
  component: Analytics,
});

const RANGES = ["wtd", "mtd", "last-month", "30d", "12mo", "all"] as const;
const RANGE_OPTIONS = RANGES.map((value) => ({
  value,
  label: value === "last-month" ? "Last mo" : value.toUpperCase(),
  title: RANGE_LABEL[value],
}));

type OrderRow = {
  id: string;
  total: number;
  status: string;
  refunded_amount_cents: number | null;
  created_at: string;
  customer_id: string | null;
  utm_source: string | null;
  pw_cid: string | null;
  sale_id: string | null;
  order_items: {
    name: string;
    price: number;
    product_id: string | null;
    cover_gradient: string | null;
    cover_url: string | null;
  }[];
};

type SaleEventRow = {
  id: string;
  name: string;
  slug: string;
  discount_pct: number;
  start_at: string;
  end_at: string;
  status: string;
};

function Analytics() {
  const [range, setRange] = useState<AnalyticsRange>("mtd");
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [sales, setSales] = useState<SaleEventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [identity, setIdentity] = useState<IdentityMap>(() => new Map());
  const [now, setNow] = useState(() => Date.now());
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    fetchOrderIdentity().then(setIdentity);
  }, []);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [ordersRes, salesRes] = await Promise.all([
        supabase
          .from("orders")
          .select(
            "id, total, status, refunded_amount_cents, created_at, customer_id, utm_source, pw_cid, sale_id, order_items(name, price, product_id, cover_gradient, cover_url)",
          )
          .order("created_at", { ascending: false })
          .limit(5000),
        supabase
          .from("sale_events")
          .select("id, name, slug, discount_pct, start_at, end_at, status")
          .neq("status", "draft")
          .order("start_at", { ascending: false }),
      ]);
      if (cancelled) return;
      setOrders((ordersRes.data ?? []) as OrderRow[]);
      setSales((salesRes.data ?? []) as SaleEventRow[]);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const completed = useMemo(() => saleOrders(orders), [orders]);
  const bounds = useMemo(() => analyticsBounds(range, completed), [range, completed]);
  const inRange = useMemo(
    () =>
      completed.filter((order) => within(order.created_at, bounds.currentStart, bounds.currentEnd)),
    [completed, bounds],
  );
  const previousRange = useMemo(
    () =>
      completed.filter((order) =>
        within(order.created_at, bounds.previousStart, bounds.previousEnd),
      ),
    [completed, bounds],
  );
  const currentAttempts = useMemo(
    () =>
      orders.filter((order) => within(order.created_at, bounds.currentStart, bounds.currentEnd)),
    [orders, bounds],
  );
  const previousAttempts = useMemo(
    () =>
      orders.filter((order) => within(order.created_at, bounds.previousStart, bounds.previousEnd)),
    [orders, bounds],
  );
  const revenue = sumNetRevenue(inRange);
  const previousRevenue = sumNetRevenue(previousRange);
  const aov = inRange.length ? revenue / inRange.length : 0;
  const previousAov = previousRange.length ? previousRevenue / previousRange.length : 0;
  const conversion = currentAttempts.length ? (inRange.length / currentAttempts.length) * 100 : 0;
  const previousConversion = previousAttempts.length
    ? (previousRange.length / previousAttempts.length) * 100
    : 0;
  const chartSeries = useMemo(
    () => buildPairedSeries(completed, bounds, range),
    [completed, bounds, range],
  );

  const top = useMemo(() => {
    const map = new Map<
      string,
      {
        id: string;
        name: string;
        cover: string | null;
        coverUrl: string | null;
        units: number;
        revenue: number;
      }
    >();
    for (const order of inRange) {
      const items = order.order_items ?? [];
      const allocatedRevenue = allocateLineRevenue(order, items);
      for (const [itemIndex, item] of items.entries()) {
        const key = item.product_id || item.name;
        const current = map.get(key) ?? {
          id: key,
          name: item.name,
          cover: item.cover_gradient,
          coverUrl: item.cover_url,
          units: 0,
          revenue: 0,
        };
        current.units += 1;
        current.revenue += allocatedRevenue[itemIndex] ?? 0;
        if (!current.coverUrl && item.cover_url) current.coverUrl = item.cover_url;
        map.set(key, current);
      }
    }
    return [...map.values()].sort((a, b) => b.revenue - a.revenue || b.units - a.units).slice(0, 7);
  }, [inRange]);
  const topMax = Math.max(1, ...top.map((item) => item.revenue || item.units));

  const sources = useMemo(() => {
    const map = new Map<string, { count: number; revenue: number }>();
    for (const order of inRange) {
      const source = normalizeUtmSource(order.utm_source) || (order.pw_cid ? "campaign" : "direct");
      const current = map.get(source) ?? { count: 0, revenue: 0 };
      current.count += 1;
      current.revenue += netRevenue(order);
      map.set(source, current);
    }
    return [...map.entries()]
      .map(([source, data]) => ({ source, ...data }))
      .sort((a, b) => b.revenue - a.revenue || b.count - a.count)
      .slice(0, 5);
  }, [inRange]);
  const sourceMax = Math.max(1, ...sources.map((source) => source.revenue || source.count));

  const split = useMemo(() => {
    const allInRange = orders.filter((order) =>
      within(order.created_at, bounds.currentStart, bounds.currentEnd),
    );
    return splitNewReturning(allInRange, identity);
  }, [orders, identity, bounds]);
  const splitTotal = split.neu + split.returning;
  const returningPct = splitTotal ? (split.returning / splitTotal) * 100 : 0;
  const newPct = splitTotal ? (split.neu / splitTotal) * 100 : 0;

  const salePerformance = useMemo(() => {
    const totals = new Map<string, { orders: number; revenue: number }>();
    for (const order of orders) {
      if (!countsAsSale(order) || !order.sale_id) continue;
      const current = totals.get(order.sale_id) ?? { orders: 0, revenue: 0 };
      current.orders += 1;
      current.revenue += netRevenue(order);
      totals.set(order.sale_id, current);
    }
    return sales
      .map((sale) => {
        const total = totals.get(sale.id) ?? { orders: 0, revenue: 0 };
        const durationDays = Math.max(
          1,
          (new Date(sale.end_at).getTime() - new Date(sale.start_at).getTime()) / 86400_000,
        );
        return {
          ...sale,
          ...total,
          revenuePerDay: total.revenue / durationDays,
          liveStatus: deriveSaleStatus(sale.start_at, sale.end_at, sale.status, now),
        };
      })
      .sort((a, b) => {
        if (a.liveStatus === "active" && b.liveStatus !== "active") return -1;
        if (b.liveStatus === "active" && a.liveStatus !== "active") return 1;
        return new Date(b.start_at).getTime() - new Date(a.start_at).getTime();
      });
  }, [orders, sales, now]);
  const saleDayMax = Math.max(1, ...salePerformance.map((sale) => sale.revenuePerDay));

  const revenueDelta = percentDelta(revenue, previousRevenue);
  const ordersDelta = percentDelta(inRange.length, previousRange.length);
  const aovDelta = percentDelta(aov, previousAov);
  const conversionDelta = percentDelta(conversion, previousConversion);

  return (
    <DashboardShell
      title="Analytics"
      action={<RangeControl value={range} onChange={setRange} options={RANGE_OPTIONS} />}
    >
      <div className="space-y-6">
        <ChargedPanel domain="money" material="grain" form="arc" silhouette="inset" title="Revenue">
          <div className="dash-analytics-metrics">
            <AnalyticsMetric label="Revenue" value={money(revenue)} delta={revenueDelta} />
            <AnalyticsMetric label="Average order" value={money(aov)} delta={aovDelta} />
            <AnalyticsMetric
              label="Orders"
              value={inRange.length.toLocaleString()}
              delta={ordersDelta}
            />
            <AnalyticsMetric
              label="Conversion"
              value={`${conversion.toFixed(1)}%`}
              delta={conversionDelta}
              helper="Share of order attempts that completed in this range"
            />
          </div>
          <div
            className="dash-hero-chart px-4 pb-4 md:px-6"
            role="img"
            aria-label={`Revenue is ${money(revenue)} for ${RANGE_LABEL[range]}, ${revenueDelta.label} versus the prior equivalent period.`}
          >
            {loading ? (
              <div className="skeleton-block h-full" />
            ) : chartSeries.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-white/70">
                No revenue in this range.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartSeries} margin={{ top: 8, right: 4, left: -18, bottom: 0 }}>
                  <defs>
                    <linearGradient id="analytics-revenue-fill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#FA1265" stopOpacity={0.32} />
                      <stop offset="100%" stopColor="#FA1265" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(255,255,255,0.18)" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    minTickGap={22}
                    tick={{ fill: "rgba(255,255,255,.72)", fontSize: 10 }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    width={56}
                    tickFormatter={(value) => `$${value}`}
                    tick={{ fill: "rgba(255,255,255,.72)", fontSize: 10 }}
                  />
                  <Tooltip
                    content={<RevenueTooltip />}
                    cursor={{ stroke: "rgba(255,255,255,.22)" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="previous"
                    stroke="rgba(255,255,255,.38)"
                    strokeWidth={1.5}
                    strokeDasharray="5 5"
                    dot={false}
                    isAnimationActive={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="current"
                    stroke="#FA1265"
                    strokeWidth={2}
                    fill="url(#analytics-revenue-fill)"
                    dot={false}
                    isAnimationActive={!reduceMotion}
                    animationDuration={500}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </ChargedPanel>

        <div className="dash-analytics-detail-grid grid grid-cols-1 xl:grid-cols-12 gap-6">
          <DashCard title="Top products" className="dash-analytics-top-products xl:col-span-7">
            {top.length === 0 ? (
              <div className="dash-empty">
                <p>No products sold in this range.</p>
              </div>
            ) : (
              <ol className="dash-rank-list">
                {top.slice(0, 5).map((item, index) => (
                  <li key={item.id} className="dash-rank-row">
                    <span className="dash-rank-number" aria-hidden="true">
                      {index + 1}
                    </span>
                    <span
                      className="dash-rank-thumb"
                      style={{
                        backgroundImage: item.coverUrl
                          ? `url(${item.coverUrl})`
                          : item.cover || "linear-gradient(135deg,#2D1450,#3DE0F5)",
                      }}
                    />
                    <span className="dash-rank-main">
                      <span className="dash-rank-name">{item.name}</span>
                      <SegmentedBar
                        value={item.revenue || item.units}
                        max={topMax}
                        label={`${item.name}: ${money(item.revenue)} revenue`}
                        segments={16}
                        tone={index === 0 ? "money" : "indigo"}
                        className="dash-rank-bar"
                      />
                    </span>
                    <span className="dash-rank-metric">
                      <small>Units</small>
                      {item.units}
                    </span>
                    <span className="dash-rank-metric">
                      <small>Revenue</small>
                      {money(item.revenue)}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </DashCard>

          <DashCard
            title="Traffic sources"
            className="dash-analytics-traffic xl:col-span-7 dash-solid-panel dash-traffic-panel"
          >
            {sources.length === 0 ? (
              <div className="dash-empty">
                <p>No attributed traffic in this range.</p>
              </div>
            ) : (
              <ul className="dash-source-list">
                {sources.map((source, index) => (
                  <li key={source.source} className={index === 0 ? "is-leader" : ""}>
                    <div className="dash-source-line">
                      <span className="dash-source-name">{source.source}</span>
                      <span>{source.count.toLocaleString()} orders</span>
                      <strong>{money(source.revenue)}</strong>
                    </div>
                    <SegmentedBar
                      value={source.revenue || source.count}
                      max={sourceMax}
                      label={`${source.source}: ${money(source.revenue)} attributed revenue`}
                      segments={22}
                      tone={index === 0 ? "money" : "indigo"}
                      className="dash-source-bar"
                    />
                    <small>
                      {Math.round((source.revenue / Math.max(1, revenue)) * 100)}% of revenue in
                      this range
                    </small>
                  </li>
                ))}
              </ul>
            )}
          </DashCard>

          <DashCard
            title="New vs returning"
            className="dash-analytics-split dash-glass-panel xl:col-span-5"
          >
            {splitTotal === 0 ? (
              <div className="dash-empty">
                <p>No customer activity in this range.</p>
              </div>
            ) : (
              <div className="dash-split-wrap">
                <div
                  className="dash-split-donut"
                  role="img"
                  aria-label={`${Math.round(newPct)} percent new and ${Math.round(returningPct)} percent returning`}
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: "New", value: split.neu },
                          { name: "Returning", value: split.returning },
                        ]}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius="70%"
                        outerRadius="94%"
                        paddingAngle={2}
                        stroke="none"
                        isAnimationActive={!reduceMotion}
                        animationDuration={450}
                      >
                        <Cell fill="var(--c-money)" />
                        <Cell fill="var(--c-people)" />
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="dash-split-center" aria-hidden="true">
                    <strong>{Math.round(returningPct)}%</strong>
                    <span>Repeat purchase</span>
                  </div>
                </div>
                <div className="dash-split-insights">
                  <div>
                    <span>Returning</span>
                    <strong>{Math.round(returningPct)}%</strong>
                    <small>{split.returning.toLocaleString()} customers</small>
                  </div>
                  <div>
                    <span>New</span>
                    <strong>{Math.round(newPct)}%</strong>
                    <small>{split.neu.toLocaleString()} customers</small>
                  </div>
                </div>
              </div>
            )}
          </DashCard>

          <DashCard
            title="Sale performance"
            className="dash-analytics-sale xl:col-span-5 dash-sale-performance-panel"
          >
            {salePerformance.length === 0 ? (
              <div className="dash-empty">
                <p>No sale events yet. Run a sale to compare revenue pace here.</p>
              </div>
            ) : (
              <ul className="dash-sale-performance-list">
                {salePerformance.slice(0, 6).map((sale) => (
                  <li key={sale.id} className={sale.liveStatus === "active" ? "is-active" : ""}>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="truncate font-semibold text-white">{sale.name}</span>
                        <StatusBadge status={sale.liveStatus} />
                      </div>
                      <div className="font-mono text-[10px] text-[var(--text-tertiary)]">
                        {formatInSaleTimeZone(sale.start_at, { year: undefined })} —{" "}
                        {formatInSaleTimeZone(sale.end_at, { year: undefined })}
                      </div>
                    </div>
                    <SegmentedBar
                      value={sale.revenuePerDay}
                      max={saleDayMax}
                      label={`${sale.name}: ${money(sale.revenuePerDay)} revenue per day`}
                      segments={14}
                      tone={sale.liveStatus === "active" ? "mint" : "indigo"}
                      className="dash-sale-mini-bar"
                    />
                    <div className="dash-sale-number">
                      <small>Orders</small>
                      {sale.orders}
                    </div>
                    <div className="dash-sale-number">
                      <small>Revenue</small>
                      {money(sale.revenue)}
                    </div>
                    <div className="dash-sale-number">
                      <small>Per day</small>
                      {money(sale.revenuePerDay)}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </DashCard>
        </div>
      </div>
    </DashboardShell>
  );
}

function AnalyticsMetric({
  label,
  value,
  delta,
  helper,
}: {
  label: string;
  value: string;
  delta?: ReturnType<typeof percentDelta>;
  helper?: string;
}) {
  return (
    <div className="dash-analytics-metric" title={helper}>
      <span>{label}</span>
      <strong>{value}</strong>
      {delta && (
        <small
          data-direction={
            delta.positive == null ? "neutral" : delta.positive ? "positive" : "negative"
          }
        >
          {delta.arrow}
          {delta.label}
        </small>
      )}
    </div>
  );
}

function RevenueTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ dataKey?: string; value?: number }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const current = payload.find((entry) => entry.dataKey === "current")?.value ?? 0;
  const previous = payload.find((entry) => entry.dataKey === "previous")?.value ?? 0;
  return (
    <div className="dash-revenue-tooltip">
      <span>{label}</span>
      <strong>{money(current)}</strong>
      <small>Previous {money(previous)}</small>
    </div>
  );
}

function analyticsBounds(range: AnalyticsRange, orders: OrderRow[]) {
  const currentEnd = new Date();
  const currentStart = new Date(currentEnd);
  if (range === "wtd") {
    currentStart.setDate(currentStart.getDate() - currentStart.getDay());
    currentStart.setHours(0, 0, 0, 0);
  } else if (range === "mtd") {
    currentStart.setDate(1);
    currentStart.setHours(0, 0, 0, 0);
  } else if (range === "last-month") {
    currentStart.setFullYear(currentStart.getFullYear(), currentStart.getMonth() - 1, 1);
    currentStart.setHours(0, 0, 0, 0);
    currentEnd.setFullYear(currentEnd.getFullYear(), currentEnd.getMonth(), 0);
    currentEnd.setHours(23, 59, 59, 999);
  } else if (range === "30d") {
    currentStart.setDate(currentStart.getDate() - 29);
    currentStart.setHours(0, 0, 0, 0);
  } else if (range === "12mo") {
    currentStart.setFullYear(currentStart.getFullYear() - 1);
  } else {
    const earliest = orders.reduce(
      (time, order) => Math.min(time, new Date(order.created_at).getTime()),
      Date.now(),
    );
    currentStart.setTime(earliest);
    currentStart.setHours(0, 0, 0, 0);
  }
  const duration = Math.max(1, currentEnd.getTime() - currentStart.getTime());
  const previousEnd = new Date(currentStart.getTime() - 1);
  const previousStart = new Date(previousEnd.getTime() - duration);
  return { currentStart, currentEnd, previousStart, previousEnd };
}

function buildPairedSeries(
  orders: OrderRow[],
  bounds: ReturnType<typeof analyticsBounds>,
  range: AnalyticsRange,
) {
  const monthly = range === "12mo" || range === "all";
  const currentBuckets = makeBuckets(bounds.currentStart, bounds.currentEnd, monthly);
  const previousBuckets = makeBuckets(bounds.previousStart, bounds.previousEnd, monthly);
  return currentBuckets.map((bucket, index) => {
    const previous = previousBuckets[index];
    return {
      label: bucket.label,
      current: sumNetRevenue(
        orders.filter((order) => within(order.created_at, bucket.start, bucket.end)),
      ),
      previous: previous
        ? sumNetRevenue(
            orders.filter((order) => within(order.created_at, previous.start, previous.end)),
          )
        : 0,
    };
  });
}

function makeBuckets(start: Date, end: Date, monthly: boolean) {
  const buckets: { start: Date; end: Date; label: string }[] = [];
  let cursor = new Date(start);
  cursor.setHours(0, 0, 0, 0);
  if (monthly) cursor.setDate(1);
  while (cursor <= end && buckets.length < 60) {
    const next = new Date(cursor);
    if (monthly) next.setMonth(next.getMonth() + 1);
    else next.setDate(next.getDate() + 1);
    buckets.push({
      start: new Date(cursor),
      end: new Date(Math.min(next.getTime() - 1, end.getTime())),
      label: cursor.toLocaleDateString(
        "en",
        monthly ? { month: "short", year: "2-digit" } : { month: "short", day: "numeric" },
      ),
    });
    cursor = next;
  }
  return buckets;
}

function within(iso: string, start: Date, end: Date) {
  const time = new Date(iso).getTime();
  return time >= start.getTime() && time <= end.getTime();
}

function percentDelta(current: number, previous: number) {
  if (current === 0 && previous === 0) return { label: "0%", positive: null, arrow: "→ " };
  if (previous === 0) return { label: "100%", positive: true, arrow: "↑ " };
  const value = Math.round(Math.abs((current - previous) / previous) * 100);
  return {
    label: `${value}%`,
    positive: current === previous ? null : current > previous,
    arrow: current === previous ? "→ " : current > previous ? "↑ " : "↓ ",
  };
}

function money(value: number) {
  return `$${Number(value || 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}
