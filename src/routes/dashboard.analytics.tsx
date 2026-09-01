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
  DeltaChip,
  RangeControl,
  SegmentedBar,
  StatusBadge,
} from "@/components/DashboardShell";
import { supabase } from "@/integrations/supabase/client";
import {
  chicagoComparisonBounds,
  DASHBOARD_RANGE_LABEL,
  startOfChicagoDay,
  type DashboardRange,
} from "@/lib/analytics-time";
import { deriveSaleStatus, formatInSaleTimeZone, SALE_TIME_ZONE } from "@/lib/sale-time";
import { normalizeUtmSource } from "@/lib/utm";
import {
  allocateLineRevenue,
  countsAsSale,
  netRevenue,
  SALE_STATUSES,
  saleOrders,
  sumNetRevenue,
} from "@/lib/revenue";
import { fetchOrderIdentity, splitNewReturning, type IdentityMap } from "@/lib/customer-identity";

export const Route = createFileRoute("/dashboard/analytics")({
  head: () => ({ meta: [{ title: "Analytics — Plugin Warehouse" }] }),
  component: Analytics,
});

const RANGE_OPTIONS = [
  { value: "today", label: "Today" },
  { value: "7d", label: "7D" },
  { value: "30d", label: "30D" },
  { value: "mtd", label: "MTD" },
] as const;

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

type TrafficSnapshot = {
  pageviews: number;
  uniqueSessions: number;
  completedOrders: number;
  trackingStartedAt: string | null;
  series: { label: string; sessions: number }[];
};

function Analytics() {
  const [range, setRange] = useState<DashboardRange>("mtd");
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [traffic, setTraffic] = useState<TrafficSnapshot | null>(null);
  const [trafficLoading, setTrafficLoading] = useState(true);
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
  const bounds = useMemo(() => chicagoComparisonBounds(range), [range]);
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
  useEffect(() => setTrafficLoading(true), [range]);
  useEffect(() => {
    let cancelled = false;
    const liveBounds = chicagoComparisonBounds(range, new Date(now));
    const sessionBuckets = makeBuckets(liveBounds.currentStart, liveBounds.currentEnd, false);
    const bucketStarts = sessionBuckets.map((bucket) => bucket.start.toISOString());
    const bucketEnds = sessionBuckets.map((bucket) =>
      new Date(
        Math.min(bucket.end.getTime() + 1, liveBounds.currentEnd.getTime()),
      ).toISOString(),
    );

    Promise.all([
      supabase.rpc("storefront_traffic_metrics", {
        _start_at: liveBounds.currentStart.toISOString(),
        _end_at: liveBounds.currentEnd.toISOString(),
        _bucket_starts: bucketStarts,
        _bucket_ends: bucketEnds,
      }),
      supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .in("status", [...SALE_STATUSES])
        .gte("created_at", liveBounds.currentStart.toISOString())
        .lt("created_at", liveBounds.currentEnd.toISOString()),
    ])
      .then(([trafficResult, orderResult]) => {
        if (cancelled) return;
        if (trafficResult.error) throw trafficResult.error;
        if (orderResult.error) throw orderResult.error;
        const row = Array.isArray(trafficResult.data)
          ? trafficResult.data[0]
          : trafficResult.data;
        const counts = (row?.session_buckets ?? []).map(Number);
        setTraffic({
          pageviews: Number(row?.pageviews ?? 0),
          uniqueSessions: Number(row?.unique_sessions ?? 0),
          completedOrders: Number(orderResult.count ?? 0),
          trackingStartedAt: row?.tracking_started_at ?? null,
          series: sessionBuckets.map((bucket, index) => ({
            label: bucket.label,
            sessions: counts[index] ?? 0,
          })),
        });
        setTrafficLoading(false);
      })
      .catch(() => {
        if (!cancelled) setTrafficLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [range, now]);
  const revenue = sumNetRevenue(inRange);
  const previousRevenue = sumNetRevenue(previousRange);
  const aov = inRange.length ? revenue / inRange.length : 0;
  const previousAov = previousRange.length ? previousRevenue / previousRange.length : 0;
  const conversion = traffic?.uniqueSessions
    ? (traffic.completedOrders / traffic.uniqueSessions) * 100
    : 0;
  const trackingStartDay = traffic?.trackingStartedAt
    ? startOfChicagoDay(new Date(traffic.trackingStartedAt))
    : null;
  const conversionAvailable = Boolean(
    trackingStartDay && bounds.currentStart.getTime() >= trackingStartDay.getTime(),
  );
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
  const revenueDelta = percentDelta(revenue, previousRevenue);
  const ordersDelta = percentDelta(inRange.length, previousRange.length);
  const aovDelta = percentDelta(aov, previousAov);

  return (
    <DashboardShell
      title="Analytics"
      action={<RangeControl value={range} onChange={setRange} options={RANGE_OPTIONS} />}
    >
      <div className="space-y-6">
        <ChargedPanel domain="money" material="grain" form="arc" silhouette="inset" title="Revenue">
          <div className="dash-analytics-metrics dash-revenue-metrics">
            <AnalyticsMetric label="Revenue" value={money(revenue)} delta={revenueDelta} />
            <AnalyticsMetric label="Average order" value={money(aov)} delta={aovDelta} />
            <AnalyticsMetric
              label="Orders"
              value={inRange.length.toLocaleString()}
              delta={ordersDelta}
            />
          </div>
          <div
            className="dash-hero-chart px-4 pb-4 md:px-6"
            role="img"
            aria-label={`Revenue is ${money(revenue)} for ${DASHBOARD_RANGE_LABEL[range]}, ${revenueDelta.label} versus the prior equivalent period.`}
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

        <DashCard
          title="Storefront traffic"
          action={<span className="dash-traffic-refresh">Updates every 30 sec</span>}
          className="dash-session-panel dash-solid-panel"
        >
          <div className="dash-session-summary">
            <div className="dash-session-stat">
              <span>Unique sessions</span>
              <strong>
                {trafficLoading && !traffic
                  ? "—"
                  : (traffic?.uniqueSessions ?? 0).toLocaleString()}
              </strong>
              <small>{(traffic?.pageviews ?? 0).toLocaleString()} recorded pageviews</small>
            </div>
            <div className="dash-session-stat dash-session-conversion">
              <span>Conversion rate</span>
              {conversionAvailable ? (
                <>
                  <strong>{conversion.toFixed(1)}%</strong>
                  <small>Completed orders ÷ unique sessions</small>
                </>
              ) : (
                <p className="dash-tracking-note">
                  {traffic?.trackingStartedAt
                    ? `Tracking began ${formatTrackingDate(traffic.trackingStartedAt)}. Conversion appears once the full selected window is tracked.`
                    : "Waiting for the first tracked storefront visit."}
                </p>
              )}
            </div>
          </div>
          <div
            className="dash-session-chart"
            role="img"
            aria-label={`Unique storefront sessions for ${DASHBOARD_RANGE_LABEL[range]}.`}
          >
            {trafficLoading && !traffic ? (
              <div className="skeleton-block h-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={traffic?.series ?? []}
                  margin={{ top: 8, right: 4, left: -18, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="analytics-session-fill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#4B3FE8" stopOpacity={0.42} />
                      <stop offset="100%" stopColor="#4B3FE8" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(255,255,255,0.12)" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    minTickGap={22}
                    tick={{ fill: "rgba(255,255,255,.72)", fontSize: 10 }}
                  />
                  <YAxis
                    allowDecimals={false}
                    tickLine={false}
                    axisLine={false}
                    width={56}
                    tick={{ fill: "rgba(255,255,255,.72)", fontSize: 10 }}
                  />
                  <Tooltip
                    content={<SessionsTooltip />}
                    cursor={{ stroke: "rgba(255,255,255,.22)" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="sessions"
                    stroke="#7D6CFF"
                    strokeWidth={2}
                    fill="url(#analytics-session-fill)"
                    dot={false}
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </DashCard>

        <div className="dash-analytics-detail-grid grid grid-cols-1 xl:grid-cols-12 gap-6">
          <DashCard
            title="Top products"
            className="dash-analytics-top-products dash-rank-card xl:col-span-7"
          >
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
            <div className="dash-traffic-split-layout">
              <section className="dash-traffic-sources" aria-label="Attributed traffic sources">
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
                          {Math.round((source.revenue / Math.max(1, revenue)) * 100)}% of revenue
                          in this range
                        </small>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="dash-traffic-returning" aria-labelledby="new-returning-title">
                <h3 id="new-returning-title">New vs returning</h3>
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
              </section>
            </div>
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
        <DeltaChip
          value={delta.label}
          direction={
            delta.positive == null ? "neutral" : delta.positive ? "positive" : "negative"
          }
        />
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

function SessionsTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value?: number }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="dash-revenue-tooltip dash-sessions-tooltip">
      <span>{label}</span>
      <strong>{Number(payload[0]?.value ?? 0).toLocaleString()} sessions</strong>
    </div>
  );
}

function buildPairedSeries(
  orders: OrderRow[],
  bounds: ReturnType<typeof chicagoComparisonBounds>,
  range: DashboardRange,
) {
  const monthly = false;
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

function formatTrackingDate(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: SALE_TIME_ZONE,
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(iso));
}
