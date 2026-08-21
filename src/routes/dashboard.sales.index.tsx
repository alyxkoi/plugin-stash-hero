import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Edit3, ExternalLink, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ChargedPanel, DashCard, DashboardShell, StatusBadge } from "@/components/DashboardShell";
import { supabase } from "@/integrations/supabase/client";
import { deriveSaleStatus, formatInSaleTimeZone, type LiveSaleStatus } from "@/lib/sale-time";
import { countsAsSale, netRevenue } from "@/lib/revenue";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/dashboard/sales/")({
  head: () => ({ meta: [{ title: "Sales — Plugin Warehouse" }] }),
  component: SalesPage,
});

type SaleRow = {
  id: string;
  name: string;
  slug: string;
  discount_pct: number;
  scope: string;
  start_at: string;
  end_at: string;
  status: string;
  theme_color: string | null;
};

type SaleOrder = {
  id: string;
  sale_id: string | null;
  total: number;
  status: string;
  refunded_amount_cents: number | null;
  created_at: string;
};

type DisplaySaleRow = SaleRow & {
  liveStatus: LiveSaleStatus;
  purchases: number;
  revenue: number;
  aov: number;
};

function SalesPage() {
  const [rows, setRows] = useState<SaleRow[]>([]);
  const [orders, setOrders] = useState<SaleOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(() => Date.now());
  const [pendingDelete, setPendingDelete] = useState<DisplaySaleRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [ending, setEnding] = useState(false);

  useEffect(() => {
    loadSales();
  }, []);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  async function loadSales() {
    const [salesRes, ordersRes] = await Promise.all([
      supabase
        .from("sale_events")
        .select("id, name, slug, discount_pct, scope, start_at, end_at, status, theme_color")
        .order("start_at", { ascending: false }),
      supabase
        .from("orders")
        .select("id, sale_id, total, status, refunded_amount_cents, created_at")
        .not("sale_id", "is", null)
        .order("created_at", { ascending: false })
        .limit(5000),
    ]);
    setRows((salesRes.data ?? []) as SaleRow[]);
    setOrders((ordersRes.data ?? []) as SaleOrder[]);
    setLoading(false);
  }

  const displayRows = useMemo<DisplaySaleRow[]>(
    () =>
      rows.map((sale) => {
        const saleOrders = orders.filter(
          (order) => order.sale_id === sale.id && countsAsSale(order),
        );
        const revenue = saleOrders.reduce((sum, order) => sum + netRevenue(order), 0);
        return {
          ...sale,
          liveStatus: deriveSaleStatus(sale.start_at, sale.end_at, sale.status, now),
          purchases: saleOrders.length,
          revenue,
          aov: saleOrders.length ? revenue / saleOrders.length : 0,
        };
      }),
    [rows, orders, now],
  );

  const active = displayRows.find((sale) => sale.liveStatus === "active") ?? null;
  const pastAndScheduled = displayRows.filter((sale) => sale.id !== active?.id);
  const previousEnded = displayRows.find((sale) => sale.liveStatus === "ended");
  const comparison =
    active && previousEnded ? percentDelta(active.revenue, previousEnded.revenue) : null;
  const spark = active ? saleSparkline(active, orders) : [];
  const sparkMax = Math.max(1, ...spark);

  async function endSale() {
    if (!active || ending) return;
    if (!window.confirm(`End ${active.name} now? Storefront prices will return to normal.`)) return;
    setEnding(true);
    const endedAt = new Date().toISOString();
    const { error } = await supabase
      .from("sale_events")
      .update({ status: "ended", end_at: endedAt })
      .eq("id", active.id);
    setEnding(false);
    if (error) return toast.error(error.message);
    setRows((current) =>
      current.map((sale) =>
        sale.id === active.id ? { ...sale, status: "ended", end_at: endedAt } : sale,
      ),
    );
    toast.success("Sale ended. Storefront prices are back to normal.");
  }

  async function confirmDelete() {
    if (!pendingDelete || deleting) return;
    setDeleting(true);
    try {
      await supabase.from("sale_event_products").delete().eq("sale_event_id", pendingDelete.id);
      const { error } = await supabase.from("sale_events").delete().eq("id", pendingDelete.id);
      if (error) throw error;
      setRows((current) => current.filter((row) => row.id !== pendingDelete.id));
      toast.success("Sale deleted. Storefront discounts now ignore it.");
      setPendingDelete(null);
    } catch (error: any) {
      toast.error(error?.message ?? "Couldn't delete the sale.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <DashboardShell
      title="Sales"
      action={
        <Link
          to="/dashboard/sales/new"
          className="btn-primary !px-4 !py-2 !text-xs inline-flex items-center gap-1.5"
        >
          <Plus size={14} /> New sale
        </Link>
      }
    >
      <div className="space-y-6">
        {active ? (
          <ChargedPanel
            domain="promo"
            anchor="top-left"
            title={
              <span className="inline-flex items-center gap-2">
                <i className="dash-live-dot" /> Live
              </span>
            }
          >
            <div className="dash-live-sale">
              <div className="dash-live-sale-heading">
                <div>
                  <h2>{active.name}</h2>
                  <p>
                    {active.discount_pct}% off ·{" "}
                    {active.scope === "all" ? "All products" : "Selected products"}
                  </p>
                </div>
                <div className="dash-live-sale-actions">
                  <a
                    href={`/sale/${active.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="dash-charged-button"
                  >
                    <ExternalLink size={14} /> Preview landing
                  </a>
                  <Link
                    to="/dashboard/sales/$id"
                    params={{ id: active.id }}
                    className="dash-charged-button"
                  >
                    <Edit3 size={14} /> Edit
                  </Link>
                  <button
                    type="button"
                    onClick={endSale}
                    disabled={ending}
                    className="dash-charged-button"
                  >
                    {ending ? "Ending…" : "End sale"}
                  </button>
                </div>
              </div>
              <div className="dash-sale-countdown">
                {countdown(active.end_at, now)} <span>remaining</span>
              </div>
              <div className="dash-live-sale-bottom">
                <div className="dash-live-sale-stats">
                  <Summary label="Purchases" value={active.purchases.toLocaleString()} />
                  <Summary label="Revenue" value={money(active.revenue)} />
                  <Summary label="Average order" value={money(active.aov)} />
                  <Summary
                    label="Vs last sale"
                    value={comparison ? `${comparison.arrow}${comparison.label}` : "—"}
                  />
                </div>
                <div className="dash-sale-spark" aria-label="Daily purchase pace">
                  {spark.map((value, index) => (
                    <span
                      key={index}
                      style={{ height: `${Math.max(8, (value / sparkMax) * 100)}%` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </ChargedPanel>
        ) : (
          <DashCard>
            <div className="dash-empty">
              <p>No sale running. Create one to discount your whole catalog.</p>
              <Link
                to="/dashboard/sales/new"
                className="btn-primary !px-4 !py-2 !text-xs inline-flex items-center gap-1.5"
              >
                <Plus size={14} /> New sale
              </Link>
            </div>
          </DashCard>
        )}

        <DashCard title="Past and scheduled sales">
          <div className="dash-desktop-table -m-5 overflow-x-auto">
            <table className="min-w-[820px]">
              <thead>
                <tr>
                  <th className="text-left px-4">Sale</th>
                  <th className="text-right px-4">Discount</th>
                  <th className="text-left px-4">Window</th>
                  <th className="text-right px-4">Purchases</th>
                  <th className="text-right px-4">Revenue</th>
                  <th className="text-left px-4">Status</th>
                  <th className="text-right px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pastAndScheduled.map((sale) => (
                  <tr key={sale.id} className={sale.liveStatus === "ended" ? "opacity-70" : ""}>
                    <td className="px-4">
                      <Link
                        to="/dashboard/sales/$id"
                        params={{ id: sale.id }}
                        className="font-semibold text-white hover:text-[var(--c-promo)]"
                      >
                        {sale.name}
                      </Link>
                    </td>
                    <td className="px-4 text-right font-mono text-xs text-[var(--c-promo)]">
                      {sale.discount_pct}%
                    </td>
                    <td className="px-4 font-mono text-[10px] text-[var(--text-tertiary)]">
                      {formatInSaleTimeZone(sale.start_at)} — {formatInSaleTimeZone(sale.end_at)}
                    </td>
                    <td className="px-4 text-right font-mono text-xs">{sale.purchases}</td>
                    <td className="px-4 text-right font-mono text-xs text-[var(--c-money)]">
                      {money(sale.revenue)}
                    </td>
                    <td className="px-4">
                      <StatusBadge status={sale.liveStatus} />
                    </td>
                    <td className="px-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <Link
                          to="/dashboard/sales/$id"
                          params={{ id: sale.id }}
                          className="dash-icon-button"
                          aria-label={`Edit ${sale.name}`}
                        >
                          <Edit3 size={14} />
                        </Link>
                        <button
                          type="button"
                          onClick={() => setPendingDelete(sale)}
                          className="dash-icon-button is-danger"
                          aria-label={`Delete ${sale.name}`}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="dash-mobile-list -mx-4 -my-4">
            {pastAndScheduled.map((sale) => (
              <li key={sale.id} className="border-b border-[var(--border)] last:border-b-0">
                <Link
                  to="/dashboard/sales/$id"
                  params={{ id: sale.id }}
                  className="block min-h-[82px] px-4 py-3"
                >
                  <span className="flex items-start justify-between gap-3">
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-white">{sale.name}</span>
                      <span className="block font-mono text-[10px] text-[var(--text-tertiary)]">
                        {sale.discount_pct}% off · {sale.purchases} purchases
                      </span>
                    </span>
                    <span className="text-right">
                      <span className="block font-mono text-sm text-[var(--c-money)]">
                        {money(sale.revenue)}
                      </span>
                      <StatusBadge status={sale.liveStatus} />
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          {!loading && pastAndScheduled.length === 0 && (
            <div className="dash-empty">
              <p>Past and scheduled sales will appear here.</p>
            </div>
          )}
          {loading && (
            <div className="dash-empty">
              <p>Loading sale events…</p>
            </div>
          )}
        </DashCard>
      </div>

      <AlertDialog
        open={!!pendingDelete}
        onOpenChange={(open) => {
          if (!open && !deleting) setPendingDelete(null);
        }}
      >
        <AlertDialogContent className="dashboard-dialog max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete sale</AlertDialogTitle>
            <AlertDialogDescription>
              Delete {pendingDelete?.name} permanently? The event and its selected-product links
              will be removed. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Keep sale</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              onClick={confirmDelete}
              className="dash-danger-button !bg-transparent"
            >
              {deleting ? "Deleting…" : "Delete sale"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardShell>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function countdown(endAt: string, now: number) {
  const remaining = Math.max(0, new Date(endAt).getTime() - now);
  const days = Math.floor(remaining / 86400_000);
  const hours = Math.floor((remaining % 86400_000) / 3600_000);
  const minutes = Math.floor((remaining % 3600_000) / 60_000);
  return `${String(days).padStart(2, "0")}d ${String(hours).padStart(2, "0")}h ${String(minutes).padStart(2, "0")}m`;
}

function saleSparkline(sale: DisplaySaleRow, orders: SaleOrder[]) {
  const start = new Date(sale.start_at);
  const days = Math.max(1, Math.min(14, Math.ceil((Date.now() - start.getTime()) / 86400_000)));
  return Array.from({ length: days }, (_, index) => {
    const dayStart = new Date(start.getTime() + index * 86400_000);
    const dayEnd = new Date(dayStart.getTime() + 86400_000);
    return orders.filter(
      (order) =>
        order.sale_id === sale.id &&
        countsAsSale(order) &&
        new Date(order.created_at) >= dayStart &&
        new Date(order.created_at) < dayEnd,
    ).length;
  });
}

function percentDelta(current: number, previous: number) {
  if (current === 0 && previous === 0) return { label: "0%", arrow: "→ " };
  if (previous === 0) return { label: "100%", arrow: "↑ " };
  const value = Math.round(Math.abs((current - previous) / previous) * 100);
  return {
    label: `${value}%`,
    arrow: current === previous ? "→ " : current > previous ? "↑ " : "↓ ",
  };
}

function money(value: number) {
  return `$${Number(value || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
