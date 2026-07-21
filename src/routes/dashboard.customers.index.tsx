import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { DashboardShell, DashCard } from "@/components/DashboardShell";
import { CustomerDrawer, type CustomerDrawerData } from "@/components/AdminDrawers";
import { Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/dashboard/customers/")({
  head: () => ({ meta: [{ title: "Customers — Plugin Warehouse" }] }),
  component: CustomersPage,
});

type CustomerRow = {
  id: string;
  email: string;
  name: string | null;
  user_id: string | null;
  created_at: string;
};

type OrderRow = {
  id: string;
  number: string;
  total: number;
  status: string;
  created_at: string;
  customer_id: string | null;
  user_id: string | null;
  guest_email: string | null;
  order_items: { name: string; price: number; product_id: string | null }[];
};

interface Aggregate {
  key: string;              // customer id OR guest email fallback
  customerId: string | null;
  email: string;
  name: string | null;
  hasAccount: boolean;
  firstOrderAt: string;
  lastOrderAt: string;
  ordersCount: number;
  completedCount: number;
  totalSpent: number;
  orders: OrderRow[];
}

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
function startOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function CustomersPage() {
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "new" | "returning">("all");
  const [sort, setSort] = useState<"recent" | "top" | "most">("recent");
  const [openKey, setOpenKey] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [{ data: c }, { data: o }] = await Promise.all([
        supabase.from("customers").select("id, email, name, user_id, created_at"),
        supabase
          .from("orders")
          .select("id, number, total, status, created_at, customer_id, user_id, guest_email, order_items(name, price, product_id)")
          .order("created_at", { ascending: false })
          .limit(2000),
      ]);
      setCustomers((c ?? []) as any);
      setOrders((o ?? []) as any);
      setLoading(false);
    })();
  }, []);

  const aggregates = useMemo<Aggregate[]>(() => {
    const byId = new Map<string, CustomerRow>();
    for (const c of customers) byId.set(c.id, c);
    const map = new Map<string, Aggregate>();

    // seed with customers so they show even without orders
    for (const c of customers) {
      map.set(c.id, {
        key: c.id,
        customerId: c.id,
        email: c.email,
        name: c.name,
        hasAccount: !!c.user_id,
        firstOrderAt: c.created_at,
        lastOrderAt: c.created_at,
        ordersCount: 0,
        completedCount: 0,
        totalSpent: 0,
        orders: [],
      });
    }

    for (const o of orders) {
      let agg: Aggregate | undefined;
      if (o.customer_id && map.has(o.customer_id)) {
        agg = map.get(o.customer_id)!;
      } else {
        const email = o.guest_email || "unknown";
        const key = `guest:${email.toLowerCase()}`;
        agg = map.get(key) ?? {
          key,
          customerId: null,
          email,
          name: null,
          hasAccount: !!o.user_id,
          firstOrderAt: o.created_at,
          lastOrderAt: o.created_at,
          ordersCount: 0,
          completedCount: 0,
          totalSpent: 0,
          orders: [],
        };
        map.set(key, agg);
      }
      agg.orders.push(o);
      agg.ordersCount += 1;
      if (o.status === "completed" || o.status === "partial") {
        agg.completedCount += 1;
        agg.totalSpent += Number(o.total || 0);
      }
      if (new Date(o.created_at) < new Date(agg.firstOrderAt)) agg.firstOrderAt = o.created_at;
      if (new Date(o.created_at) > new Date(agg.lastOrderAt)) agg.lastOrderAt = o.created_at;
      if (o.user_id) agg.hasAccount = true;
    }

    return [...map.values()];
  }, [customers, orders]);

  const monthStart = startOfMonth().getTime();
  const totalCustomers = aggregates.length;
  const newThisMonth = aggregates.filter(a => new Date(a.firstOrderAt).getTime() >= monthStart).length;

  const filtered = useMemo(() => {
    let list = aggregates.filter(a => {
      if (q) {
        const needle = q.toLowerCase();
        if (!a.email.toLowerCase().includes(needle) && !(a.name || "").toLowerCase().includes(needle)) return false;
      }
      if (filter === "new" && a.completedCount > 1) return false;
      if (filter === "returning" && a.completedCount < 2) return false;
      return true;
    });
    if (sort === "top") list.sort((a, b) => b.totalSpent - a.totalSpent);
    else if (sort === "most") list.sort((a, b) => b.completedCount - a.completedCount);
    else list.sort((a, b) => +new Date(b.lastOrderAt) - +new Date(a.lastOrderAt));
    return list;
  }, [aggregates, q, filter, sort]);

  const selected = openKey ? filtered.find(a => a.key === openKey) ?? aggregates.find(a => a.key === openKey) ?? null : null;

  return (
    <DashboardShell title="Customers">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <SummaryStat label="Total customers" value={totalCustomers.toString()} />
        <SummaryStat label="New this month" value={newThisMonth.toString()} />
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
        <div className="overflow-x-auto -mx-2">
          <table className="w-full text-sm">
            <thead className="text-[10px] uppercase tracking-wider text-white/40">
              <tr>
                <th className="text-left py-2 px-2">Customer</th>
                <th className="text-left py-2 px-2">Type</th>
                <th className="text-left py-2 px-2">Purchases</th>
                <th className="text-right py-2 px-2">Spent</th>
                <th className="hidden md:table-cell text-right py-2 px-2">Orders</th>
                <th className="text-right py-2 px-2">Last purchase</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(a => (
                <tr key={a.key} onClick={() => setOpenKey(a.key)} className="border-t border-white/5 hover:bg-white/[0.04] cursor-pointer">
                  <td className="py-2 px-2">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--accent-red)] to-[var(--accent-blue)] flex items-center justify-center text-[10px] font-bold shrink-0">{initialsFrom(a.name, a.email)}</div>
                      <div className="min-w-0">
                        <div className="text-sm truncate">{a.name || a.email}</div>
                        {a.name && <div className="text-[10px] text-white/40 font-mono truncate">{a.email}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="py-2 px-2"><AccountBadge hasAccount={a.hasAccount} /></td>
                  <td className="py-2 px-2"><PurchaseBadge count={a.completedCount} /></td>
                  <td className="py-2 px-2 text-right font-mono text-xs">{money(a.totalSpent)}</td>
                  <td className="hidden md:table-cell py-2 px-2 text-right font-mono text-xs">{a.ordersCount}</td>
                  <td className="py-2 px-2 text-right text-[10px] font-mono text-white/50 whitespace-nowrap">{a.completedCount > 0 ? relTime(a.lastOrderAt) : "—"}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="py-16 text-center text-white/40 text-sm">{loading ? "Loading…" : "No customers yet. This list populates automatically as orders come in."}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </DashCard>

      <CustomerDrawer
        open={!!selected}
        customer={selected ? toDrawerData(selected) : null}
        onClose={() => setOpenKey(null)}
      />
    </DashboardShell>
  );
}

function toDrawerData(a: Aggregate): CustomerDrawerData {
  return {
    key: a.key,
    name: a.name,
    email: a.email,
    hasAccount: a.hasAccount,
    memberSince: a.firstOrderAt,
    totalSpent: a.totalSpent,
    completedCount: a.completedCount,
    ordersCount: a.ordersCount,
    orders: a.orders.map(o => ({ id: o.id, number: o.number, total: Number(o.total), status: o.status, created_at: o.created_at })),
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

