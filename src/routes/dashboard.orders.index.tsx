import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Download, Search } from "lucide-react";
import {
  ChargedPanel,
  DashCard,
  DashboardShell,
  DomainChip,
  StatusBadge,
} from "@/components/DashboardShell";
import { OrderDrawer } from "@/components/AdminDrawers";
import { supabase } from "@/integrations/supabase/client";
import { netRevenue, sumNetRevenue } from "@/lib/revenue";

type Row = {
  id: string;
  number: string;
  total: number;
  discount: number;
  discount_code: string | null;
  utm_source: string | null;
  status: string;
  created_at: string;
  user_id: string | null;
  refunded_amount_cents: number | null;
  customer_name: string | null;
  guest_email: string | null;
  order_items: { name: string }[];
};

type Segment = "all" | "paid" | "free" | "discounted" | "refunded";
type DateRange = "all" | "7d" | "30d" | "mtd";

const SEGMENTS: { value: Segment; label: string }[] = [
  { value: "all", label: "All" },
  { value: "paid", label: "Paid" },
  { value: "free", label: "Free" },
  { value: "discounted", label: "Discounted" },
  { value: "refunded", label: "Refunded" },
];

export const Route = createFileRoute("/dashboard/orders/")({
  head: () => ({ meta: [{ title: "Orders — Plugin Warehouse" }] }),
  component: OrdersPage,
});

function OrdersPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [segment, setSegment] = useState<Segment>("all");
  const [status, setStatus] = useState("all");
  const [dateRange, setDateRange] = useState<DateRange>("30d");
  const [page, setPage] = useState(1);
  const [openOrderId, setOpenOrderId] = useState<string | null>(null);
  const pageSize = 25;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("orders")
        .select(
          "id, number, total, discount, discount_code, refunded_amount_cents, utm_source, status, created_at, user_id, customer_name, guest_email, order_items(name)",
        )
        .order("created_at", { ascending: false })
        .limit(500);
      if (!cancelled) {
        setRows((data ?? []) as Row[]);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setPage(1);
  }, [q, segment, status, dateRange]);

  const filtered = useMemo(
    () =>
      rows.filter((order) => {
        const needle = q.trim().toLowerCase();
        if (
          needle &&
          !order.number.toLowerCase().includes(needle) &&
          !(order.customer_name ?? "").toLowerCase().includes(needle) &&
          !(order.guest_email ?? "").toLowerCase().includes(needle) &&
          !order.order_items.some((item) => item.name.toLowerCase().includes(needle))
        )
          return false;

        if (status !== "all" && order.status !== status) return false;
        if (segment === "paid" && Number(order.total) <= 0) return false;
        if (segment === "free" && Number(order.total) !== 0) return false;
        if (segment === "discounted" && Number(order.discount || 0) <= 0 && !order.discount_code)
          return false;
        if (
          segment === "refunded" &&
          Number(order.refunded_amount_cents || 0) <= 0 &&
          order.status !== "refunded"
        )
          return false;

        const start = rangeStart(dateRange);
        if (start && new Date(order.created_at) < start) return false;
        return true;
      }),
    [rows, q, segment, status, dateRange],
  );

  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayRows = rows.filter((order) => new Date(order.created_at) >= todayStart);
  const todayGross = todayRows.reduce((sum, order) => sum + Number(order.total || 0), 0);
  const todayRefunded = todayRows.reduce(
    (sum, order) => sum + Number(order.refunded_amount_cents || 0) / 100,
    0,
  );
  const todayAverage = todayRows.length ? sumNetRevenue(todayRows) / todayRows.length : 0;

  function exportCsv() {
    const header = [
      "Order",
      "Customer",
      "Email",
      "Items",
      "Total",
      "Discount",
      "Source",
      "Status",
      "Created",
    ];
    const body = filtered.map((order) => [
      order.number,
      order.customer_name ?? "Guest",
      order.guest_email ?? "",
      order.order_items.map((item) => item.name).join(" | "),
      netRevenue(order).toFixed(2),
      order.discount_code ?? "",
      order.utm_source ?? "direct",
      order.status,
      order.created_at,
    ]);
    const csv = [header, ...body].map((line) => line.map(csvCell).join(",")).join("\n");
    // CSV exports are bounded by the dashboard query and never approach the
    // large-file path covered by this repository's download lint rule.
    // eslint-disable-next-line no-restricted-syntax
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `plugin-warehouse-orders-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <DashboardShell title="Orders">
      <div className="space-y-6">
        <ChargedPanel
          domain="volume"
          material="solid"
          silhouette="side"
          title="Today at a glance"
          className="dash-short-charge"
        >
          <div className="dash-charged-stat-grid">
            <SummaryStat label="Orders today" value={todayRows.length.toLocaleString()} />
            <SummaryStat label="Gross" value={money(todayGross)} />
            <SummaryStat label="Refunded" value={money(todayRefunded)} />
            <SummaryStat label="Average order" value={money(todayAverage)} />
          </div>
        </ChargedPanel>

        <div className="dash-filter-bar" aria-label="Order filters">
          <label className="dash-search-field">
            <span className="sr-only">Search orders</span>
            <Search size={16} aria-hidden="true" />
            <input
              value={q}
              onChange={(event) => setQ(event.target.value)}
              placeholder="Search order, customer, email, or product"
            />
          </label>

          <div className="dash-segmented" role="group" aria-label="Order type">
            {SEGMENTS.map((item) => (
              <button
                type="button"
                key={item.value}
                onClick={() => setSegment(item.value)}
                aria-pressed={segment === item.value}
              >
                {item.label}
              </button>
            ))}
          </div>

          <label className="dash-compact-select">
            <span className="sr-only">Order status</span>
            <select value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="all">All status</option>
              <option value="completed">Completed</option>
              <option value="refunded">Refunded</option>
              <option value="partial">Partial refund</option>
              <option value="pending">Pending</option>
            </select>
          </label>

          <label className="dash-compact-select">
            <span className="sr-only">Order date range</span>
            <select
              value={dateRange}
              onChange={(event) => setDateRange(event.target.value as DateRange)}
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="mtd">Month to date</option>
              <option value="all">All available</option>
            </select>
          </label>

          <button
            type="button"
            onClick={exportCsv}
            className="btn-ghost !px-3 inline-flex items-center justify-center gap-2"
          >
            <Download size={15} /> Export CSV
          </button>
        </div>

        <DashCard>
          <div className="dash-desktop-table -m-5 overflow-x-auto">
            <table className="min-w-[1040px]">
              <thead>
                <tr>
                  <th className="text-left px-4">Order</th>
                  <th className="text-left px-4">Customer</th>
                  <th className="text-left px-4">Items</th>
                  <th className="text-right px-4">Total</th>
                  <th className="text-left px-4">Discount</th>
                  <th className="text-left px-4">Source</th>
                  <th className="text-left px-4">Status</th>
                  <th className="text-right px-4">Time</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((order) => (
                  <tr
                    key={order.id}
                    onClick={() => setOpenOrderId(order.id)}
                    className="cursor-pointer"
                  >
                    <td className="px-4 font-mono text-xs text-[var(--c-volume)]">
                      {order.number}
                    </td>
                    <td className="px-4">
                      <div className="max-w-[190px] truncate text-sm text-white">
                        {order.customer_name || order.guest_email || "Guest"}
                      </div>
                      {order.customer_name && order.guest_email && (
                        <div className="max-w-[190px] truncate font-mono text-[10px] text-[var(--text-tertiary)]">
                          {order.guest_email}
                        </div>
                      )}
                    </td>
                    <td className="px-4 text-xs">
                      <span className="dash-fade-tail inline-block max-w-[190px] align-middle">
                        {order.order_items[0]?.name ?? "—"}
                      </span>
                      {order.order_items.length > 1 && (
                        <DomainChip domain="volume" className="ml-2">
                          +{order.order_items.length - 1} more
                        </DomainChip>
                      )}
                    </td>
                    <td
                      className={`px-4 text-right font-mono text-xs ${Number(order.total) === 0 ? "text-[var(--text-disabled)]" : "text-white"}`}
                    >
                      {Number(order.refunded_amount_cents || 0) > 0 ? (
                        <span className="inline-flex flex-col items-end leading-tight">
                          <span>{money(netRevenue(order))}</span>
                          <span className="text-[10px] text-[var(--text-disabled)] line-through">
                            {money(order.total)}
                          </span>
                        </span>
                      ) : (
                        money(order.total)
                      )}
                    </td>
                    <td className="px-4">
                      {order.discount_code ? (
                        <DomainChip domain="promo">{order.discount_code}</DomainChip>
                      ) : (
                        <span className="font-mono text-xs text-[var(--text-disabled)]">—</span>
                      )}
                    </td>
                    <td className="px-4">
                      <SourceChip source={order.utm_source} />
                    </td>
                    <td className="px-4">
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="px-4 text-right font-mono text-[10px] text-[var(--text-tertiary)]">
                      {relativeTime(order.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="dash-mobile-list -mx-4 -my-4">
            {paged.map((order) => (
              <li key={order.id} className="border-b border-[var(--border)] last:border-b-0">
                <button
                  type="button"
                  onClick={() => setOpenOrderId(order.id)}
                  className="w-full min-h-[96px] px-4 py-3 text-left"
                >
                  <span className="flex items-start justify-between gap-3">
                    <span className="min-w-0">
                      <span className="block font-mono text-xs text-[var(--c-volume)]">
                        {order.number}
                      </span>
                      <span className="block truncate text-sm font-semibold text-white">
                        {order.customer_name || order.guest_email || "Guest"}
                      </span>
                      <span className="dash-fade-tail block text-xs text-[var(--text-tertiary)]">
                        {order.order_items[0]?.name ?? "No line items"}
                        {order.order_items.length > 1
                          ? ` +${order.order_items.length - 1} more`
                          : ""}
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span
                        className={`block font-mono text-sm ${Number(order.total) === 0 ? "text-[var(--text-disabled)]" : "text-white"}`}
                      >
                        {money(netRevenue(order))}
                      </span>
                      <span className="block mt-1">
                        <StatusBadge status={order.status} />
                      </span>
                    </span>
                  </span>
                  <span className="mt-2 flex items-center gap-2 text-[10px] text-[var(--text-tertiary)]">
                    <SourceChip source={order.utm_source} />
                    <span className="font-mono">{relativeTime(order.created_at)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>

          {paged.length === 0 && (
            <div className="dash-empty">
              <p>
                {loading
                  ? "Loading orders…"
                  : "No orders match these filters. Clear a filter to widen the results."}
              </p>
            </div>
          )}

          <footer className="dash-table-footer">
            <span>
              {filtered.length.toLocaleString()} orders · {money(sumNetRevenue(filtered))} net
            </span>
            <div>
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((current) => current - 1)}
              >
                Previous
              </button>
              <span>
                {page} / {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((current) => current + 1)}
              >
                Next
              </button>
            </div>
          </footer>
        </DashCard>
      </div>

      <OrderDrawer
        open={!!openOrderId}
        orderId={openOrderId}
        onClose={() => setOpenOrderId(null)}
      />
    </DashboardShell>
  );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="dash-charged-stat">
      <div className="dash-charged-stat-label">{label}</div>
      <div className="dash-charged-stat-value">{value}</div>
    </div>
  );
}

function SourceChip({ source }: { source: string | null }) {
  const normalized = source?.trim() || "direct";
  const domain =
    normalized === "direct" ? "neutral" : normalized.includes("email") ? "money" : "promo";
  return <DomainChip domain={domain}>{normalized}</DomainChip>;
}

function rangeStart(range: DateRange) {
  if (range === "all") return null;
  const start = new Date();
  if (range === "7d") start.setDate(start.getDate() - 7);
  if (range === "30d") start.setDate(start.getDate() - 30);
  if (range === "mtd") {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
  }
  return start;
}

function money(value: number) {
  return `$${Number(value || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function relativeTime(iso: string) {
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

function csvCell(value: string) {
  return `"${String(value).replaceAll('"', '""')}"`;
}
