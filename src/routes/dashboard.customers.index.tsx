import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { DashboardShell, DashCard } from "@/components/DashboardShell";
import { CustomerDrawer, type CustomerDrawerData } from "@/components/AdminDrawers";
import { Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

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

type DrawerOrder = { id: string; number: string; total: number; status: string; created_at: string };

function money(n: number) {
  return `$${Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function relTime(iso: string | null) {
  if (!iso) return "—";
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 86400 * 30) return `${Math.floor(s / 86400)}d ago`;
  return new Date(iso).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" });
}
function initialsFrom(name: string | null, email: string) {
  const src = (name || email || "").trim();
  return src.split(/[\s@._-]+/).filter(Boolean).map(p => p[0]).slice(0, 2).join("").toUpperCase() || "?";
}

function CustomersPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<{ total_customers: number; new_this_month: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [filter, setFilter] = useState<"all" | "new" | "returning">("all");
  const [sort, setSort] = useState<"recent" | "top" | "most">("recent");
  const [page, setPage] = useState(1);
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [drawerOrders, setDrawerOrders] = useState<DrawerOrder[]>([]);

  // Debounce typing so each keystroke doesn't fire a query.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  // Any change to the query/filters restarts at page 1 (server-side scoped).
  useEffect(() => { setPage(1); }, [debouncedQ, filter, sort]);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error: err } = await supabase.rpc("admin_customer_list", {
      _q: debouncedQ,
      _filter: filter,
      _sort: sort,
      _limit: PAGE_SIZE,
      _offset: (page - 1) * PAGE_SIZE,
    });
    if (err) {
      console.error("[customers] list failed", err);
      setError("Couldn't load customers.");
    } else {
      setError(null);
      const list = (data ?? []) as Row[];
      setRows(list);
      setTotal(list.length ? Number(list[0].total_count) : 0);
    }
    setLoading(false);
  }, [debouncedQ, filter, sort, page]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    (async () => {
      const { data, error: err } = await supabase.rpc("admin_customer_stats");
      if (err) { console.warn("[customers] stats failed", err); return; }
      const s = Array.isArray(data) ? data[0] : data;
      if (s) setStats(s as any);
    })();
  }, []);

  const selected = openKey ? rows.find(r => r.key === openKey) ?? null : null;

  // Orders for the open customer only — no full-table fetch.
  useEffect(() => {
    if (!selected) { setDrawerOrders([]); return; }
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
      const { data, error: err } = await query;
      if (cancelled) return;
      if (err) { console.warn("[customers] drawer orders failed", err); return; }
      setDrawerOrders((data ?? []).map(o => ({ ...o, total: Number(o.total) })) as DrawerOrder[]);
    })();
    return () => { cancelled = true; };
  }, [selected?.key, selected?.customer_id, selected?.email]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <DashboardShell title="Customers">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <SummaryStat label="Total customers" value={(stats?.total_customers ?? total).toString()} />
        <SummaryStat label="New this month" value={(stats?.new_this_month ?? 0).toString()} />
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[240px] max-w-[360px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search name or email" className="w-full bg-white/5 border border-white/15 rounded-lg pl-9 pr-3 py-2 text-sm outline-none focus:border-[var(--accent-red)]" />
        </div>
        <div className="flex gap-1 p-0.5 rounded-lg border border-white/10">
          {(["all", "new", "returning"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-md text-[10px] uppercase tracking-wider font-mono transition ${filter === f ? "bg-[var(--accent-red)] text-white" : "text-white/60 hover:text-white"}`}>{f === "all" ? "All" : f === "new" ? "New" : "Returning"}</button>
          ))}
        </div>
        <select value={sort} onChange={e => setSort(e.target.value as any)} className="bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-xs">
          <option value="recent" className="bg-[#1F0540]">Recent</option>
          <option value="top" className="bg-[#1F0540]">Top spenders</option>
          <option value="most" className="bg-[#1F0540]">Most orders</option>
        </select>
      </div>

      <DashCard>
        {/* Desktop: table. Mobile: stacked rows — no horizontal clipping. */}
        <div className="hidden md:block">
          <table className="w-full text-sm">
            <thead className="text-[10px] uppercase tracking-wider text-white/40">
              <tr>
                <th className="text-left py-2 px-2">Customer</th>
                <th className="text-left py-2 px-2">Type</th>
                <th className="text-left py-2 px-2">Purchases</th>
                <th className="text-right py-2 px-2">Spent</th>
                <th className="text-right py-2 px-2">Orders</th>
                <th className="text-right py-2 px-2">Last purchase</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(a => (
                <tr key={a.key} onClick={() => setOpenKey(a.key)} className="border-t border-white/5 hover:bg-white/[0.04] cursor-pointer">
                  <td className="py-2 px-2">
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar name={a.name} email={a.email} />
                      <div className="min-w-0">
                        <div className="text-sm truncate">{a.name || a.email}</div>
                        {a.name && <div className="text-[10px] text-[#B8ACCC] font-mono truncate">{a.email}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="py-2 px-2"><AccountBadge hasAccount={a.has_account} /></td>
                  <td className="py-2 px-2"><PurchaseBadge count={Number(a.orders_count)} /></td>
                  <td className="py-2 px-2 text-right font-mono text-xs">{money(Number(a.total_spent))}</td>
                  <td className="py-2 px-2 text-right font-mono text-xs">{a.orders_count}</td>
                  <td className="py-2 px-2 text-right text-[10px] font-mono text-[#B8ACCC] whitespace-nowrap">{Number(a.orders_count) > 0 ? relTime(a.last_order_at) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <ul className="md:hidden divide-y divide-white/5">
          {rows.map(a => (
            <li key={a.key}>
              <button onClick={() => setOpenKey(a.key)} className="w-full text-left py-3 active:bg-white/[0.04] transition">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar name={a.name} email={a.email} />
                    <div className="min-w-0">
                      <div className="text-sm truncate">{a.name || a.email}</div>
                      {a.name && <div className="text-[11px] text-[#B8ACCC] font-mono truncate">{a.email}</div>}
                    </div>
                  </div>
                  <div className="shrink-0 text-right font-mono text-sm">{money(Number(a.total_spent))}</div>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2 pl-11">
                  <PurchaseBadge count={Number(a.orders_count)} />
                  <AccountBadge hasAccount={a.has_account} />
                  <span className="text-[10px] font-mono text-[#B8ACCC]">
                    {Number(a.orders_count) > 0 ? relTime(a.last_order_at) : "—"}
                  </span>
                </div>
              </button>
            </li>
          ))}
        </ul>

        {rows.length === 0 && (
          <div className="py-16 text-center text-white/40 text-sm">
            {loading ? "Loading…" : error ? (
              <span>
                {error}{" "}
                <button onClick={load} className="underline text-[var(--accent-red)]">Retry</button>
              </span>
            ) : "No customers yet. This list populates automatically as orders come in."}
          </div>
        )}


        <div className="mt-4 pt-3 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-[11px] font-mono text-[#B8ACCC] text-center sm:text-left">
            Page {page} of {totalPages} · {total} customer{total === 1 ? "" : "s"}
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="flex-1 sm:flex-none min-h-[44px] px-4 rounded-lg border border-white/15 text-xs font-mono uppercase tracking-wider text-white/80 transition hover:border-white/35 disabled:opacity-30"
            >
              Prev
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loading}
              className="flex-1 sm:flex-none min-h-[44px] px-4 rounded-lg bg-[var(--accent-red)] text-xs font-mono uppercase tracking-wider text-white transition hover:brightness-110 disabled:opacity-30"
            >
              Next
            </button>
          </div>
        </div>
      </DashCard>

      <CustomerDrawer
        open={!!selected}
        customer={selected ? toDrawerData(selected, drawerOrders) : null}
        onClose={() => setOpenKey(null)}
      />
    </DashboardShell>
  );
}

function toDrawerData(a: Row, orders: DrawerOrder[]): CustomerDrawerData {
  return {
    key: a.key,
    userId: a.user_id,
    name: a.name,
    email: a.email,
    hasAccount: a.has_account,
    memberSince: a.first_order_at,
    totalSpent: Number(a.total_spent),
    completedCount: Number(a.completed_count),
    ordersCount: Number(a.orders_count),
    orders,
  };
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <DashCard>
      <div className="label-mini opacity-60 text-[10px] mb-2">{label}</div>
      <div className="font-mono text-2xl md:text-3xl text-white">{value}</div>
    </DashCard>
  );
}

function AccountBadge({ hasAccount }: { hasAccount: boolean }) {
  return hasAccount
    ? <span className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-[var(--accent-blue)]/15 text-[var(--accent-blue-glow)] border border-[var(--accent-blue)]/40">Account</span>
    : <span className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/5 text-white/60 border border-white/15">Guest</span>;
}

function PurchaseBadge({ count }: { count: number }) {
  if (count <= 0) return <span className="text-[10px] text-white/30 font-mono">—</span>;
  if (count === 1) return <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-white/5 text-white/70 border border-white/15">New</span>;
  return (
    <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-gradient-to-r from-[var(--accent-red)]/25 to-[var(--accent-blue)]/25 text-white border border-[var(--accent-red)]/40 shadow-[0_0_12px_rgba(255,0,60,0.25)]">
      ×{count} repeat
    </span>
  );
}
