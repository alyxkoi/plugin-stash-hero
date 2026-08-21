import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useReducedMotion } from "framer-motion";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
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
  StatusBadge,
} from "@/components/DashboardShell";
import { OrderDrawer } from "@/components/AdminDrawers";
import { supabase } from "@/integrations/supabase/client";
import { keptRatio, netRevenue, saleOrders, sumNetRevenue } from "@/lib/revenue";
import { deriveSaleStatus } from "@/lib/sale-time";

export const Route = createFileRoute("/dashboard/")({
  head: () => ({ meta: [{ title: "Overview — Plugin Warehouse" }] }),
  component: Overview,
});

type OverviewRange = "today" | "7d" | "30d" | "mtd";

const RANGE_OPTIONS = [
  { value: "today", label: "Today" },
  { value: "7d", label: "7D" },
  { value: "30d", label: "30D" },
  { value: "mtd", label: "MTD" },
] as const;

type OrderRow = {
  id: string;
  number: string;
  total: number;
  status: string;
  refunded_amount_cents: number | null;
  refunded_at: string | null;
  download_count: number;
  created_at: string;
  customer_id: string | null;
  guest_email: string | null;
  customer_name: string | null;
  sale_id: string | null;
  order_items: {
    name: string;
    price: number;
    product_id: string | null;
    cover_gradient: string | null;
    cover_url: string | null;
  }[];
};

type CustomerLite = {
  id: string;
  name: string | null;
  email: string;
  created_at: string;
};

type CurrentSale = {
  id: string;
  name: string;
  discount_pct: number;
  start_at: string;
  end_at: string;
  status: string;
};

function Overview() {
  const [range, setRange] = useState<OverviewRange>("30d");
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [customers, setCustomers] = useState<CustomerLite[]>([]);
  const [sales, setSales] = useState<CurrentSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [openOrderId, setOpenOrderId] = useState<string | null>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [ordersRes, customersRes, salesRes] = await Promise.all([
        supabase
          .from("orders")
          .select(
            "id, number, total, status, refunded_amount_cents, refunded_at, download_count, created_at, customer_id, guest_email, customer_name, sale_id, order_items(name, price, product_id, cover_gradient, cover_url)",
          )
          .order("created_at", { ascending: false })
          .limit(1000),
        supabase.from("customers").select("id, name, email, created_at"),
        supabase
          .from("sale_events")
          .select("id, name, discount_pct, start_at, end_at, status")
          .order("start_at", { ascending: false }),
      ]);

      if (cancelled) return;
      setOrders((ordersRes.data ?? []) as OrderRow[]);
      setCustomers((customersRes.data ?? []) as CustomerLite[]);
      setSales((salesRes.data ?? []) as CurrentSale[]);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const bounds = useMemo(() => comparisonBounds(range), [range]);
  const completed = useMemo(() => saleOrders(orders), [orders]);
  const currentOrders = useMemo(
    () =>
      completed.filter((order) => within(order.created_at, bounds.currentStart, bounds.currentEnd)),
    [completed, bounds],
  );
  const previousOrders = useMemo(
    () =>
      completed.filter((order) =>
        within(order.created_at, bounds.previousStart, bounds.previousEnd),
      ),
    [completed, bounds],
  );
  const currentRevenue = sumNetRevenue(currentOrders);
  const previousRevenue = sumNetRevenue(previousOrders);
  const currentAov = currentOrders.length ? currentRevenue / currentOrders.length : 0;
  const previousAov = previousOrders.length ? previousRevenue / previousOrders.length : 0;
  const currentCustomers = customers.filter((customer) =>
    within(customer.created_at, bounds.currentStart, bounds.currentEnd),
  ).length;
  const previousCustomers = customers.filter((customer) =>
    within(customer.created_at, bounds.previousStart, bounds.previousEnd),
  ).length;
  const revenueDelta = percentDelta(currentRevenue, previousRevenue);
  const ordersDelta = percentDelta(currentOrders.length, previousOrders.length);
  const customersDelta = percentDelta(currentCustomers, previousCustomers);
  const aovDelta = percentDelta(currentAov, previousAov);

  const series = useMemo(
    () => buildComparisonSeries(completed, bounds, range),
    [completed, bounds, range],
  );
  const recent = orders.slice(0, 7);
  const customerLookup = useMemo(
    () => new Map(customers.map((customer) => [customer.id, customer])),
    [customers],
  );

  const best = useMemo(() => {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const monthOrders = completed.filter((order) => new Date(order.created_at) >= monthStart);
    const map = new Map<
      string,
      {
        name: string;
        cover: string | null;
        coverUrl: string | null;
        units: number;
        revenue: number;
      }
    >();

    for (const order of monthOrders) {
      const ratio = keptRatio(order);
      for (const item of order.order_items ?? []) {
        const key = item.product_id || item.name;
        const current = map.get(key) ?? {
          name: item.name,
          cover: item.cover_gradient,
          coverUrl: item.cover_url,
          units: 0,
          revenue: 0,
        };
        current.units += 1;
        current.revenue += Number(item.price || 0) * ratio;
        if (!current.coverUrl && item.cover_url) current.coverUrl = item.cover_url;
        map.set(key, current);
      }
    }
    return [...map.values()].sort((a, b) => b.units - a.units).slice(0, 5);
  }, [completed]);
  const bestMax = Math.max(1, ...best.map((item) => item.units));

  const now = Date.now();
  const currentSale =
    sales.find(
      (sale) => deriveSaleStatus(sale.start_at, sale.end_at, sale.status, now) === "active",
    ) ?? null;
  const campaignOrders = currentSale
    ? completed.filter((order) => order.sale_id === currentSale.id)
    : [];
  const campaignRevenue = sumNetRevenue(campaignOrders);
  const campaignCustomers = new Set(
    campaignOrders.map(
      (order) =>
        order.customer_id || order.guest_email?.trim().toLowerCase() || order.customer_name || order.id,
    ),
  ).size;
  const campaignAov = campaignOrders.length ? campaignRevenue / campaignOrders.length : 0;

  return (
    <DashboardShell
      title="Overview"
      action={<RangeControl value={range} onChange={setRange} options={RANGE_OPTIONS} />}
    >
      <div className="space-y-6">
        <ChargedPanel domain="money" title="Revenue">
          <div className="dash-hero-layout">
            <div className="dash-hero-topline">
              <div className="dash-hero-value">{formatMoney(currentRevenue)}</div>
              <div className="dash-hero-comparison">
                {revenueDelta.arrow} {revenueDelta.label} vs previous period
              </div>
            </div>
            <div
              className="dash-hero-chart"
              role="img"
              aria-label={`Revenue trend for the selected range: ${formatMoney(currentRevenue)}, ${revenueDelta.label} versus the previous period.`}
            >
              {loading ? (
                <div className="skeleton-block h-full" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={series} margin={{ top: 8, right: 6, left: -18, bottom: 0 }}>
                    <defs>
                      <linearGradient id="overview-revenue-fill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.28} />
                        <stop offset="100%" stopColor="#FFFFFF" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="rgba(255,255,255,0.18)" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tickLine={false}
                      axisLine={false}
                      minTickGap={24}
                      tick={{ fill: "rgba(255,255,255,0.72)", fontSize: 10 }}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      width={54}
                      tickFormatter={(value) => `$${value}`}
                      tick={{ fill: "rgba(255,255,255,0.72)", fontSize: 10 }}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "#2D1450",
                        border: "1px solid rgba(255,255,255,.18)",
                        borderRadius: 10,
                        boxShadow: "none",
                        fontFamily: "var(--f-data)",
                      }}
                      formatter={(value: number, key: string) => [
                        moneyExact(value),
                        key === "current" ? "Current" : "Previous",
                      ]}
                    />
                    <Line
                      type="monotone"
                      dataKey="previous"
                      stroke="rgba(255,255,255,0.38)"
                      strokeWidth={1.5}
                      strokeDasharray="5 5"
                      dot={false}
                      isAnimationActive={false}
                    />
                    <Area
                      type="monotone"
                      dataKey="current"
                      stroke="#FFFFFF"
                      strokeWidth={2}
                      fill="url(#overview-revenue-fill)"
                      dot={false}
                      isAnimationActive={!reduceMotion}
                      animationDuration={500}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
          <div className="dash-charged-stat-grid">
            <ChargedStat label="Revenue" value={formatMoney(currentRevenue)} delta={revenueDelta} />
            <ChargedStat
              label="Orders"
              value={currentOrders.length.toLocaleString()}
              delta={ordersDelta}
            />
            <ChargedStat
              label="New customers"
              value={currentCustomers.toLocaleString()}
              delta={customersDelta}
            />
            <ChargedStat label="Average order" value={moneyExact(currentAov)} delta={aovDelta} />
          </div>
        </ChargedPanel>

        <DashCard
          title="Current sales campaign"
          action={
            <Link to="/dashboard/sales" className="text-xs text-[var(--text-tertiary)] hover:text-white">
              Manage sales →
            </Link>
          }
        >
          {currentSale ? (
            <div className="dash-campaign-pulse">
              <div className="dash-campaign-pulse-title">
                <span>
                  <i aria-hidden="true" /> Live campaign
                </span>
                <h3>{currentSale.name}</h3>
                <p>
                  {currentSale.discount_pct}% off · {campaignCountdown(currentSale.end_at, now)} remaining
                </p>
              </div>
              <div className="dash-campaign-pulse-metrics">
                <CampaignMetric label="Customers connected" value={campaignCustomers.toLocaleString()} />
                <CampaignMetric label="Campaign sales" value={campaignOrders.length.toLocaleString()} />
                <CampaignMetric label="Campaign revenue" value={moneyExact(campaignRevenue)} highlight />
                <CampaignMetric label="Average order" value={moneyExact(campaignAov)} />
              </div>
            </div>
          ) : (
            <div className="dash-empty">
              <p>No sales campaign is running right now.</p>
              <Link to="/dashboard/sales/new" className="btn-primary px-4">
                Create a sales campaign
              </Link>
            </div>
          )}
        </DashCard>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          <DashCard
            title="Recent orders"
            className="xl:col-span-7"
            action={
              <Link
                to="/dashboard/orders"
                className="text-xs text-[var(--text-tertiary)] hover:text-white"
              >
                View all →
              </Link>
            }
          >
            <div className="dash-desktop-table -m-5 overflow-x-auto">
              <table>
                <thead>
                  <tr>
                    <th className="text-left px-4">Order</th>
                    <th className="text-left px-4">Customer</th>
                    <th className="text-left px-4">Items</th>
                    <th className="text-right px-4">Total</th>
                    <th className="text-left px-4">Status</th>
                    <th className="text-right px-4">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((order) => {
                    const customer = order.customer_id
                      ? customerLookup.get(order.customer_id)
                      : null;
                    const displayName = order.customer_name || customer?.name || null;
                    const email = customer?.email || order.guest_email || "";
                    return (
                      <tr
                        key={order.id}
                        onClick={() => setOpenOrderId(order.id)}
                        className="cursor-pointer"
                      >
                        <td className="px-4 font-mono text-xs text-[var(--c-volume)]">
                          {order.number}
                        </td>
                        <td className="px-4">
                          <div className="text-sm text-white">
                            {displayName || email || "Guest"}
                          </div>
                          {displayName && email && (
                            <div className="font-mono text-[10px] text-[var(--text-tertiary)]">
                              {email}
                            </div>
                          )}
                        </td>
                        <td className="px-4 text-xs">{order.order_items?.length ?? 0}</td>
                        <td
                          className={`px-4 text-right font-mono text-xs ${Number(order.total) === 0 ? "text-[var(--text-disabled)]" : "text-white"}`}
                        >
                          {moneyExact(netRevenue(order))}
                        </td>
                        <td className="px-4">
                          <StatusBadge status={order.status} />
                        </td>
                        <td className="px-4 text-right font-mono text-[10px] text-[var(--text-tertiary)]">
                          {relativeTime(order.created_at)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <ul className="dash-mobile-list -mx-4 -my-4">
              {recent.map((order) => (
                <li key={order.id} className="border-b border-[var(--border)] last:border-b-0">
                  <button
                    type="button"
                    onClick={() => setOpenOrderId(order.id)}
                    className="w-full min-h-[72px] grid grid-cols-[minmax(0,1fr)_auto] gap-3 items-center px-4 py-3 text-left"
                  >
                    <span className="min-w-0">
                      <span className="block font-mono text-xs text-[var(--c-volume)]">
                        {order.number}
                      </span>
                      <span className="block truncate text-sm text-white">
                        {order.customer_name || order.guest_email || "Guest"}
                      </span>
                      <span className="block text-[10px] font-mono text-[var(--text-tertiary)]">
                        {relativeTime(order.created_at)}
                      </span>
                    </span>
                    <span className="text-right">
                      <span className="block font-mono text-sm text-white">
                        {moneyExact(netRevenue(order))}
                      </span>
                      <StatusBadge status={order.status} />
                    </span>
                  </button>
                </li>
              ))}
            </ul>

            {!loading && recent.length === 0 && (
              <div className="dash-empty">
                <p>No orders yet. Completed purchases will appear here.</p>
              </div>
            )}
          </DashCard>

          <DashCard
            title="Best sellers this month"
            className="xl:col-span-5"
            action={
              <Link
                to="/dashboard/analytics"
                className="text-xs text-[var(--text-tertiary)] hover:text-white"
              >
                View all →
              </Link>
            }
          >
            {best.length === 0 ? (
              <div className="dash-empty">
                <p>{loading ? "Loading best sellers…" : "No products sold this month yet."}</p>
              </div>
            ) : (
              <ol className="dash-rank-list">
                {best.map((item, index) => (
                  <li key={`${item.name}-${index}`} className="dash-rank-row">
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
                      <span className="dash-rank-bar">
                        <span style={{ width: `${Math.max(4, (item.units / bestMax) * 100)}%` }} />
                      </span>
                      {item.revenue === 0 && (
                        <DomainChip domain="neutral" className="mt-1">
                          Zero revenue
                        </DomainChip>
                      )}
                    </span>
                    <span className="dash-rank-metric">
                      <small>Units</small>
                      {item.units}
                    </span>
                    <span className="dash-rank-metric">
                      <small>Revenue</small>
                      {moneyExact(item.revenue)}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </DashCard>
        </div>
      </div>

      <OrderDrawer
        open={!!openOrderId}
        orderId={openOrderId}
        onClose={() => setOpenOrderId(null)}
      />
    </DashboardShell>
  );
}

function ChargedStat({
  label,
  value,
  delta,
}: {
  label: string;
  value: string;
  delta: { label: string; positive: boolean | null; arrow: string };
}) {
  return (
    <div className="dash-charged-stat">
      <div className="dash-charged-stat-label">{label}</div>
      <div className="dash-charged-stat-value">
        {value}{" "}
        <small className="text-[11px] opacity-75">
          {delta.arrow}
          {delta.label}
        </small>
      </div>
    </div>
  );
}

function CampaignMetric({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div data-highlight={highlight}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function campaignCountdown(endAt: string, now: number) {
  const remaining = Math.max(0, new Date(endAt).getTime() - now);
  const days = Math.floor(remaining / 86400_000);
  const hours = Math.floor((remaining % 86400_000) / 3600_000);
  if (days > 0) return `${days}d ${hours}h`;
  const minutes = Math.floor((remaining % 3600_000) / 60_000);
  return `${hours}h ${minutes}m`;
}

function comparisonBounds(range: OverviewRange) {
  const currentEnd = new Date();
  const currentStart = new Date(currentEnd);
  if (range === "today") {
    currentStart.setHours(0, 0, 0, 0);
  } else if (range === "7d") {
    currentStart.setDate(currentStart.getDate() - 6);
    currentStart.setHours(0, 0, 0, 0);
  } else if (range === "30d") {
    currentStart.setDate(currentStart.getDate() - 29);
    currentStart.setHours(0, 0, 0, 0);
  } else {
    currentStart.setDate(1);
    currentStart.setHours(0, 0, 0, 0);
  }
  const duration = currentEnd.getTime() - currentStart.getTime();
  const previousEnd = new Date(currentStart.getTime() - 1);
  const previousStart = new Date(previousEnd.getTime() - duration);
  return { currentStart, currentEnd, previousStart, previousEnd };
}

function buildComparisonSeries(
  orders: OrderRow[],
  bounds: ReturnType<typeof comparisonBounds>,
  range: OverviewRange,
) {
  const hourly = range === "today";
  const step = hourly ? 3600_000 : 86400_000;
  const points = hourly
    ? 24
    : Math.max(1, Math.ceil((bounds.currentEnd.getTime() - bounds.currentStart.getTime()) / step));
  return Array.from({ length: points }, (_, index) => {
    const currentStart = new Date(bounds.currentStart.getTime() + index * step);
    const currentEnd = new Date(currentStart.getTime() + step);
    const previousStart = new Date(bounds.previousStart.getTime() + index * step);
    const previousEnd = new Date(previousStart.getTime() + step);
    return {
      label: hourly
        ? currentStart.toLocaleTimeString("en", { hour: "numeric" })
        : currentStart.toLocaleDateString("en", { month: "short", day: "numeric" }),
      current: sumNetRevenue(
        orders.filter((order) => within(order.created_at, currentStart, currentEnd)),
      ),
      previous: sumNetRevenue(
        orders.filter((order) => within(order.created_at, previousStart, previousEnd)),
      ),
    };
  });
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

function formatMoney(value: number) {
  return `$${Number(value || 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function moneyExact(value: number) {
  return `$${Number(value || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function relativeTime(iso: string) {
  const seconds = (Date.now() - new Date(iso).getTime()) / 1000;
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 86400 * 30) return `${Math.floor(seconds / 86400)}d ago`;
  return new Date(iso).toLocaleDateString("en", { month: "short", day: "numeric" });
}
