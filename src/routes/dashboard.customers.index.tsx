import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import {
  ChargedPanel,
  DashCard,
  DashboardShell,
  DomainChip,
  StatCard,
} from "@/components/DashboardShell";
import { CustomerDrawer, type CustomerDrawerData } from "@/components/AdminDrawers";
import { supabase } from "@/integrations/supabase/client";
import { fetchOrderIdentity, type IdentityMap } from "@/lib/customer-identity";
import { netRevenue } from "@/lib/revenue";

export const Route = createFileRoute("/dashboard/customers/")({
  head: () => ({ meta: [{ title: "Customers — Plugin Warehouse" }] }),
  component: CustomersPage,
});

const PAGE_SIZE = 30;

type Row = {
  key: string;
  customer_id: string | null;
  user_id: string | null;
  email: string;
  name: string | null;
  has_account: boolean;
  first_order_at: string;
  last_order_at: string;
  orders_count: number;
  completed_count: number;
  total_spent: number;
  total_count: number;
};

type DrawerOrder = {
  id: string;
  number: string;
  total: number;
  status: string;
  created_at: string;
};
type MetricOrder = {
  id: string;
  total: number;
  status: string;
  refunded_amount_cents: number | null;
  created_at: string;
};

function CustomersPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [topCustomers, setTopCustomers] = useState<Row[]>([]);
  const [metricOrders, setMetricOrders] = useState<MetricOrder[]>([]);
  const [signupDates, setSignupDates] = useState<string[]>([]);
  const [identity, setIdentity] = useState<IdentityMap>(() => new Map());
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [filter, setFilter] = useState<"all" | "new" | "returning">("all");
  const [sort, setSort] = useState<"recent" | "top" | "most">("recent");
  const [page, setPage] = useState(1);
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [drawerOrders, setDrawerOrders] = useState<DrawerOrder[]>([]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQ(q.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [q]);

  useEffect(() => {
    setPage(1);
  }, [debouncedQ, filter, sort]);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error: loadError } = await supabase.rpc("admin_customer_list", {
      _q: debouncedQ,
      _filter: filter,
      _sort: sort,
      _limit: PAGE_SIZE,
      _offset: (page - 1) * PAGE_SIZE,
    });
    if (loadError) {
      console.error("[customers] list failed", loadError);
      setError(
        `Couldn't load customers${loadError.code ? ` (${loadError.code})` : ""}: ${loadError.message}`,
      );
    } else {
      const list = (data ?? []) as Row[];
      setRows(list);
      setTotal(list.length ? Number(list[0].total_count) : 0);
      setError(null);
    }
    setLoading(false);
  }, [debouncedQ, filter, sort, page]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [topRes, ordersRes, identityMap, signupsRes] = await Promise.all([
        supabase.rpc("admin_customer_list", {
          _q: "",
          _filter: "all",
          _sort: "top",
          _limit: 5,
          _offset: 0,
        }),
        supabase
          .from("orders")
          .select("id, total, status, refunded_amount_cents, created_at")
          .order("created_at", { ascending: false })
          .limit(5000),
        fetchOrderIdentity(),
        supabase.from("customers").select("created_at").limit(5000),
      ]);
      if (cancelled) return;
      if (!topRes.error) setTopCustomers((topRes.data ?? []) as Row[]);
      setMetricOrders((ordersRes.data ?? []) as MetricOrder[]);
      setIdentity(identityMap);
      setSignupDates((signupsRes.data ?? []).map((customer) => customer.created_at));
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const selected = openKey ? (rows.find((row) => row.key === openKey) ?? null) : null;

  useEffect(() => {
    if (!selected) {
      setDrawerOrders([]);
      return;
    }
    let cancelled = false;
    (async () => {
      let query = supabase
        .from("orders")
        .select("id, number, total, status, created_at")
        .order("created_at", { ascending: false })
        .limit(100);
      query = selected.customer_id
        ? query.eq("customer_id", selected.customer_id)
        : query.is("customer_id", null).ilike("guest_email", selected.email);
      const { data, error: ordersError } = await query;
      if (cancelled || ordersError) return;
      setDrawerOrders(
        (data ?? []).map((order) => ({ ...order, total: Number(order.total) })) as DrawerOrder[],
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [selected]);

  const metrics = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const previousMonthEnd = new Date(monthStart.getTime() - 1);
    const current = customerMetrics(metricOrders, identity);
    const prior = customerMetrics(metricOrders, identity, previousMonthEnd);
    const newCurrent = signupsBetween(signupDates, monthStart, now);
    const newPrevious = signupsBetween(signupDates, previousMonthStart, previousMonthEnd);
    return { current, prior, newCurrent, newPrevious };
  }, [metricOrders, identity, signupDates]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const totalDelta = percentDelta(metrics.current.total, metrics.prior.total);
  const newDelta = percentDelta(metrics.newCurrent, metrics.newPrevious);
  const repeatDelta = percentDelta(metrics.current.repeatRate, metrics.prior.repeatRate);
  const ltvDelta = percentDelta(metrics.current.averageLtv, metrics.prior.averageLtv);
  const customerTotal = metrics.current.total || total;
  const newDotCount = Math.min(customerTotal, metrics.newCurrent);
  const repeatDotCount = Math.min(
    customerTotal - newDotCount,
    Math.round((customerTotal * metrics.current.repeatRate) / 100),
  );
  const customerDots = Array.from({ length: customerTotal }, (_, index) =>
    index < newDotCount ? "new" : index < newDotCount + repeatDotCount ? "repeat" : "one-time",
  );

  return (
    <DashboardShell title="Customers">
      <div className="space-y-6">
        <ChargedPanel
          domain="people"
          material="grain"
          form="corner"
          silhouette="full"
          title="Customers"
        >
          <div className="dash-customers-horizon">
            <div className="dash-customer-total-line">
              <div className="dash-hero-value">{customerTotal.toLocaleString()}</div>
              <span className="dash-delta" data-direction={totalDelta.positive ? "positive" : "neutral"}>
                {totalDelta.label}
              </span>
            </div>
            <div className="dash-customer-dots" role="img" aria-label={`${customerTotal} customers grouped as new, repeat, and one-time`}>
              {customerDots.map((kind, index) => <i key={index} data-kind={kind} />)}
            </div>
          </div>
          <div className="dash-customer-hero-stats">
            <StatCard
              label="New this month"
              value={metrics.newCurrent.toLocaleString()}
              delta={newDelta.label}
              deltaPositive={newDelta.positive ?? undefined}
              domain="people"
            />
            <StatCard
              label="Repeat rate"
              value={`${Math.round(metrics.current.repeatRate)}%`}
              delta={repeatDelta.label}
              deltaPositive={repeatDelta.positive ?? undefined}
              domain="people"
            />
            <StatCard
              label="Average LTV"
              value={money(metrics.current.averageLtv)}
              delta={ltvDelta.label}
              deltaPositive={ltvDelta.positive ?? undefined}
              domain="money"
            />
          </div>
          <div className="dash-customer-legend" aria-label="Customer dot legend">
            <span><i data-kind="one-time" /> One-time</span>
            <span><i data-kind="repeat" /> Repeat</span>
            <span><i data-kind="new" /> New</span>
          </div>
        </ChargedPanel>

        <div className="dash-customer-zone">
        <DashCard title="Top spenders" className="dash-block-zone dash-block-zone-money dash-solid-panel">
          {topCustomers.length === 0 ? (
            <div className="dash-empty text-white/75">
              <p>Top spenders will appear after customer totals load.</p>
            </div>
          ) : (
            <ol className="dash-top-customer-strip">
              {topCustomers.map((customer, index) => (
                <li key={customer.key}>
                  <span className="dash-top-customer-rank" aria-hidden="true">
                    {index + 1}
                  </span>
                  <Avatar name={customer.name} email={customer.email} large />
                  <span className="dash-top-customer-name">{customer.name || customer.email}</span>
                  <strong>{money(Number(customer.total_spent))}</strong>
                  <small>{Number(customer.orders_count).toLocaleString()} orders</small>
                </li>
              ))}
            </ol>
          )}
        </DashCard>

        <div className="dash-customer-directory">

        <div className="dash-filter-bar" aria-label="Customer filters">
          <label className="dash-search-field">
            <span className="sr-only">Search customers</span>
            <Search size={16} aria-hidden="true" />
            <input
              value={q}
              onChange={(event) => setQ(event.target.value)}
              placeholder="Search name or email"
            />
          </label>
          <div className="dash-segmented" role="group" aria-label="Customer type">
            {(["all", "new", "returning"] as const).map((value) => (
              <button
                type="button"
                key={value}
                onClick={() => setFilter(value)}
                aria-pressed={filter === value}
              >
                {value === "all" ? "All" : value === "new" ? "New" : "Returning"}
              </button>
            ))}
          </div>
          <label className="dash-compact-select">
            <span className="sr-only">Sort customers</span>
            <select value={sort} onChange={(event) => setSort(event.target.value as typeof sort)}>
              <option value="recent">Recent</option>
              <option value="top">Top spenders</option>
              <option value="most">Most orders</option>
            </select>
          </label>
        </div>

        {error && (
          <div className="dash-inline-error" role="alert">
            <span>{error}</span>
            <button type="button" onClick={load}>
              Retry
            </button>
          </div>
        )}

        <DashCard>
          <div className="dash-desktop-table -m-5 overflow-x-auto">
            <table className="min-w-[820px]">
              <thead>
                <tr>
                  <th className="text-left px-4">Customer</th>
                  <th className="text-left px-4">Purchases</th>
                  <th className="text-left px-4">Type</th>
                  <th className="text-right px-4">Spend</th>
                  <th className="text-right px-4">Orders</th>
                  <th className="text-right px-4">Last purchase</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((customer) => (
                  <tr
                    key={customer.key}
                    onClick={() => setOpenKey(customer.key)}
                    className="cursor-pointer"
                  >
                    <td className="px-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <Avatar name={customer.name} email={customer.email} />
                        <div className="min-w-0">
                          <div className="max-w-[240px] truncate text-sm font-semibold text-white">
                            {customer.name || customer.email}
                          </div>
                          {customer.name && (
                            <div className="max-w-[240px] truncate font-mono text-[10px] text-[var(--text-tertiary)]">
                              {customer.email}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4">
                      <PurchaseBadge count={Number(customer.orders_count)} />
                    </td>
                    <td className="px-4">
                      <AccountBadge hasAccount={customer.has_account} />
                    </td>
                    <td className="px-4 text-right font-mono text-xs text-[var(--c-money)]">
                      {money(Number(customer.total_spent))}
                    </td>
                    <td className="px-4 text-right font-mono text-xs">{customer.orders_count}</td>
                    <td className="px-4 text-right font-mono text-[10px] text-[var(--text-tertiary)] whitespace-nowrap">
                      {Number(customer.orders_count) > 0
                        ? relativeTime(customer.last_order_at)
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="dash-mobile-list -mx-4 -my-4">
            {rows.map((customer) => (
              <li key={customer.key} className="border-b border-[var(--border)] last:border-b-0">
                <button
                  type="button"
                  onClick={() => setOpenKey(customer.key)}
                  className="w-full min-h-[88px] px-4 py-3 text-left"
                >
                  <span className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                    <span className="flex min-w-0 items-center gap-3">
                      <Avatar name={customer.name} email={customer.email} />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-white">
                          {customer.name || customer.email}
                        </span>
                        {customer.name && (
                          <span className="block truncate font-mono text-[10px] text-[var(--text-tertiary)]">
                            {customer.email}
                          </span>
                        )}
                      </span>
                    </span>
                    <span className="font-mono text-sm text-[var(--c-money)]">
                      {money(Number(customer.total_spent))}
                    </span>
                  </span>
                  <span className="mt-2 flex flex-wrap items-center gap-2 pl-11">
                    <PurchaseBadge count={Number(customer.orders_count)} />
                    <AccountBadge hasAccount={customer.has_account} />
                    <span className="font-mono text-[10px] text-[var(--text-tertiary)]">
                      {relativeTime(customer.last_order_at)}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>

          {rows.length === 0 && (
            <div className="dash-empty">
              <p>
                {loading
                  ? "Loading customers…"
                  : "No customers match these filters. New purchasers will appear automatically."}
              </p>
            </div>
          )}

          <footer className="dash-table-footer">
            <span>
              Page {page} of {totalPages} · {total.toLocaleString()} customers
            </span>
            <div>
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={page <= 1 || loading}
              >
                Previous
              </button>
              <span>
                {page} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                disabled={page >= totalPages || loading}
              >
                Next
              </button>
            </div>
          </footer>
        </DashCard>
        </div>
        </div>

        <DashCard title="Retention" className="dash-bottom-strip dash-retention-strip">
          <div className="dash-retention-track">
            <span style={{ width: `${Math.round(metrics.current.repeatRate)}%` }} />
          </div>
          <div><strong>{Math.round(metrics.current.repeatRate)}%</strong><span>Returning</span></div>
          <div><strong>{Math.max(0, 100 - Math.round(metrics.current.repeatRate))}%</strong><span>New</span></div>
        </DashCard>
      </div>

      <CustomerDrawer
        open={!!selected}
        customer={selected ? toDrawerData(selected, drawerOrders) : null}
        onClose={() => setOpenKey(null)}
      />
    </DashboardShell>
  );
}

function customerMetrics(orders: MetricOrder[], identity: IdentityMap, cutoff?: Date) {
  const grouped = new Map<string, { orders: number; revenue: number }>();
  for (const order of orders) {
    if (cutoff && new Date(order.created_at) > cutoff) continue;
    const identityRow = identity.get(order.id);
    if (!identityRow?.normalized_email) continue;
    const current = grouped.get(identityRow.normalized_email) ?? { orders: 0, revenue: 0 };
    current.orders += 1;
    current.revenue += netRevenue(order);
    grouped.set(identityRow.normalized_email, current);
  }
  const total = grouped.size;
  const repeat = [...grouped.values()].filter((customer) => customer.orders > 1).length;
  const revenue = [...grouped.values()].reduce((sum, customer) => sum + customer.revenue, 0);
  return {
    total,
    repeatRate: total ? (repeat / total) * 100 : 0,
    averageLtv: total ? revenue / total : 0,
  };
}

function signupsBetween(createdAt: string[], start: Date, end: Date) {
  return createdAt.filter((value) => {
    const time = new Date(value).getTime();
    return time >= start.getTime() && time <= end.getTime();
  }).length;
}

function percentDelta(current: number, previous: number) {
  if (current === 0 && previous === 0) return { label: "0%", positive: null as boolean | null };
  if (previous === 0) return { label: "100%", positive: true as boolean | null };
  const raw = ((current - previous) / previous) * 100;
  return { label: `${Math.round(Math.abs(raw))}%`, positive: raw === 0 ? null : raw > 0 };
}

function toDrawerData(customer: Row, orders: DrawerOrder[]): CustomerDrawerData {
  return {
    key: customer.key,
    userId: customer.user_id,
    name: customer.name,
    email: customer.email,
    hasAccount: customer.has_account,
    memberSince: customer.first_order_at,
    totalSpent: Number(customer.total_spent),
    completedCount: Number(customer.completed_count),
    ordersCount: Number(customer.orders_count),
    orders,
  };
}

function Avatar({
  name,
  email,
  large = false,
}: {
  name: string | null;
  email: string;
  large?: boolean;
}) {
  const hue = hashHue(email);
  return (
    <span
      className={`dash-customer-avatar ${large ? "is-large" : ""}`}
      style={{
        background: `linear-gradient(135deg, hsl(${hue} 82% 58%), hsl(${(hue + 58) % 360} 78% 46%))`,
      }}
      aria-hidden="true"
    >
      {initialsFrom(name, email)}
    </span>
  );
}

function AccountBadge({ hasAccount }: { hasAccount: boolean }) {
  return <DomainChip domain="neutral">{hasAccount ? "Account" : "Guest"}</DomainChip>;
}

function PurchaseBadge({ count }: { count: number }) {
  if (count <= 0) return <span className="font-mono text-xs text-[var(--text-disabled)]">—</span>;
  if (count === 1) return <DomainChip domain="neutral">New</DomainChip>;
  return <DomainChip domain="people">Repeat ×{count}</DomainChip>;
}

function initialsFrom(name: string | null, email: string) {
  return (name || email || "?")
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function hashHue(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1)
    hash = (hash * 31 + value.charCodeAt(index)) % 360;
  return hash;
}

function money(value: number) {
  return `$${Number(value || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function relativeTime(iso: string | null) {
  if (!iso) return "—";
  const seconds = (Date.now() - new Date(iso).getTime()) / 1000;
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 86400 * 30) return `${Math.floor(seconds / 86400)}d ago`;
  return new Date(iso).toLocaleDateString("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
