import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { DashboardShell, DashCard, StatCard, StatusBadge } from "@/components/DashboardShell";
import { Plus, Tag, Ticket } from "lucide-react";
import { ResponsiveContainer, Tooltip, XAxis, YAxis, Area, AreaChart, CartesianGrid } from "recharts";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/dashboard/")({
  head: () => ({ meta: [{ title: "Overview — Plugin Warehouse" }] }),
  component: Overview,
});

type OrderRow = {
  id: string;
  number: string;
  total: number;
  status: string;
  created_at: string;
  customer_id: string | null;
  guest_email: string | null;
  order_items: { name: string; price: number; product_id: string | null; cover_gradient: string | null }[];
};

type CustomerLite = { id: string; name: string | null; email: string; last_purchase_at: string | null };

function formatMoney(n: number) {
  return `$${Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}
function relativeTime(iso: string | null) {
  if (!iso) return "";
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (isNaN(s)) return "";
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 86400 * 30) return `${Math.floor(s / 86400)}d ago`;
  return new Date(iso).toLocaleDateString("en", { month: "short", day: "numeric" });
}
function initialsFrom(name: string | null, email: string) {
  const src = (name || email || "").trim();
  return src.split(/[\s@._-]+/).filter(Boolean).map(p => p[0]).slice(0, 2).join("").toUpperCase() || "?";
}

function startOfMonth(d = new Date()) { return new Date(d.getFullYear(), d.getMonth(), 1); }

function Overview() {
  const [grouping, setGrouping] = useState<"daily" | "weekly" | "monthly">("daily");
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [customers, setCustomers] = useState<CustomerLite[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data: o }, { data: c }] = await Promise.all([
        supabase
          .from("orders")
          .select("id, number, total, status, created_at, customer_id, guest_email, order_items(name, price, product_id, cover_gradient)")
          .order("created_at", { ascending: false })
          .limit(1000),
        supabase.from("customers").select("id, name, email, last_purchase_at"),
      ]);
      setOrders((o ?? []) as any);
      setCustomers((c ?? []) as any);
      setLoading(false);
    })();
  }, []);

  const completed = useMemo(() => orders.filter(o => o.status === "completed"), [orders]);
  const monthStart = startOfMonth();
  const completedThisMonth = completed.filter(o => new Date(o.created_at) >= monthStart);
  const totalRev = completed.reduce((s, o) => s + Number(o.total || 0), 0);
  const monthRev = completedThisMonth.reduce((s, o) => s + Number(o.total || 0), 0);
  const thirtyDaysAgo = Date.now() - 30 * 86400 * 1000;
  const activeCust = customers.filter(c => c.last_purchase_at && new Date(c.last_purchase_at).getTime() >= thirtyDaysAgo).length;

  const series = useMemo(() => buildSeries(completed, grouping), [completed, grouping]);

  const recent = useMemo(() => [...orders].slice(0, 10), [orders]);

  const best = useMemo(() => {
    const map = new Map<string, { name: string; cover: string | null; units: number; revenue: number }>();
    for (const o of completedThisMonth) {
      for (const it of o.order_items ?? []) {
        const key = it.product_id || it.name;
        const cur = map.get(key) ?? { name: it.name, cover: it.cover_gradient, units: 0, revenue: 0 };
        cur.units += 1;
        cur.revenue += Number(it.price || 0);
        map.set(key, cur);
      }
    }
    return [...map.values()].sort((a, b) => b.units - a.units).slice(0, 5);
  }, [completedThisMonth]);

  const customerLookup = useMemo(() => new Map(customers.map(c => [c.id, c])), [customers]);

  return (
    <DashboardShell title="Overview">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total revenue" value={formatMoney(totalRev)} />
        <StatCard label="Revenue this month" value={formatMoney(monthRev)} />
        <StatCard label="Orders this month" value={completedThisMonth.length.toString()} />
        <StatCard label="Active customers" value={activeCust.toString()} />
      </div>

      <DashCard
        title="Revenue over time"
        className="mb-6"
        action={
          <div className="flex gap-1 p-0.5 rounded-lg border border-white/10">
            {(["daily", "weekly", "monthly"] as const).map(g => (
              <button key={g} onClick={() => setGrouping(g)} className={`px-3 py-1 rounded-md text-[10px] uppercase tracking-wider font-mono transition ${grouping === g ? "bg-[var(--accent-red)] text-white" : "text-white/60 hover:text-white"}`}>{g}</button>
            ))}
          </div>
        }
      >
        <div className="h-64">
          {series.length === 0 ? (
            <div className="h-full flex items-center justify-center text-white/40 text-xs font-mono">
              {loading ? "Loading…" : "No revenue yet. Live data will appear here after your first completed order."}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#FF003C" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="#FF003C" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="label" stroke="rgba(255,255,255,0.4)" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="rgba(255,255,255,0.4)" fontSize={10} tickFormatter={(v) => `$${v}`} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: "#1F0540", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, fontSize: 12 }} formatter={(v: number) => formatMoney(v)} />
                <Area type="monotone" dataKey="value" stroke="#FF003C" strokeWidth={2} fill="url(#rev)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </DashCard>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-6">
        <div className="lg:col-span-3">
          <DashCard title="Recent orders" action={<Link to="/dashboard/orders" className="text-xs text-white/60 hover:text-white">View all →</Link>}>
            <div className="overflow-x-auto -mx-2">
              <table className="w-full text-sm">
                <thead className="text-[10px] uppercase tracking-wider text-white/40">
                  <tr><th className="text-left px-2 py-2">Order</th><th className="text-left px-2 py-2">Customer</th><th className="text-left px-2 py-2">Items</th><th className="text-right px-2 py-2">Total</th><th className="text-left px-2 py-2">Status</th><th className="text-right px-2 py-2">Time</th></tr>
                </thead>
                <tbody>
                  {recent.map(o => {
                    const cust = o.customer_id ? customerLookup.get(o.customer_id) : null;
                    const label = cust?.name || cust?.email || o.guest_email || "Guest";
                    const ini = initialsFrom(cust?.name ?? null, cust?.email || o.guest_email || "?");
                    return (
                      <tr key={o.id} className="border-t border-white/5 hover:bg-white/[0.03]">
                        <td className="px-2 py-3 font-mono text-xs"><Link to={"/dashboard/orders/$id" as any} params={{ id: o.id } as any} className="hover:text-[var(--accent-red-glow)]">{o.number}</Link></td>
                        <td className="px-2 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[var(--accent-red)] to-[var(--accent-blue)] flex items-center justify-center text-[9px] font-bold">{ini}</div>
                            <span className="text-xs truncate max-w-[160px]">{label}</span>
                          </div>
                        </td>
                        <td className="px-2 py-3 text-xs text-white/60">{o.order_items?.length ?? 0}</td>
                        <td className="px-2 py-3 text-right font-mono text-xs">{formatMoney(Number(o.total))}</td>
                        <td className="px-2 py-3"><StatusBadge status={o.status} /></td>
                        <td className="px-2 py-3 text-right font-mono text-[10px] text-white/50">{relativeTime(o.created_at)}</td>
                      </tr>
                    );
                  })}
                  {recent.length === 0 && (
                    <tr><td colSpan={6} className="px-2 py-12 text-center text-white/40 text-sm">{loading ? "Loading…" : "No orders yet."}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </DashCard>
        </div>
        <div className="lg:col-span-2">
          <DashCard title="Best sellers this month" action={<Link to="/dashboard/analytics" className="text-xs text-white/60 hover:text-white">View all →</Link>}>
            {best.length === 0 ? (
              <div className="py-8 text-center text-white/40 text-xs font-mono">{loading ? "Loading…" : "No sales this month yet."}</div>
            ) : (
              <ul className="space-y-3">
                {best.map((b, i) => (
                  <li key={b.name + i} className="flex items-center gap-3">
                    <span className="font-mono text-sm text-white/40 w-5">{i + 1}</span>
                    <div className="w-10 h-10 rounded-md flex-shrink-0" style={{ background: b.cover || "linear-gradient(135deg,#FF003C,#4066FF)" }} />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-white truncate">{b.name}</div>
                      <div className="text-[10px] text-white/50 font-mono">{formatMoney(b.revenue)}</div>
                    </div>
                    <span className="font-mono text-sm">{b.units}</span>
                  </li>
                ))}
              </ul>
            )}
          </DashCard>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <QuickTile icon={<Plus size={18} />} title="Add product" to="/dashboard/products/new" />
        <QuickTile icon={<Tag size={18} />} title="Create sale event" to="/dashboard/sales/new" />
        <QuickTile icon={<Ticket size={18} />} title="Generate discount code" to="/dashboard/marketing" />
      </div>
    </DashboardShell>
  );
}

function buildSeries(orders: OrderRow[], grouping: "daily" | "weekly" | "monthly") {
  if (orders.length === 0) return [];
  const buckets = new Map<string, { key: string; label: string; ts: number; value: number }>();
  const keyOf = (d: Date): { key: string; label: string; ts: number } => {
    if (grouping === "daily") {
      const k = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      return { key: k, label: d.toLocaleDateString("en", { month: "short", day: "numeric" }), ts: new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() };
    }
    if (grouping === "weekly") {
      const start = new Date(d);
      start.setDate(d.getDate() - d.getDay());
      start.setHours(0, 0, 0, 0);
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

function QuickTile({ icon, title, to }: { icon: React.ReactNode; title: string; to: string }) {
  return (
    <Link to={to as any} className="glass-card p-5 flex items-center gap-3 hover:translate-y-[-2px] transition group">
      <div className="chromatic-edge" />
      <div className="relative z-10 flex items-center gap-3 w-full">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[var(--accent-red)]/30 to-[var(--accent-blue)]/30 flex items-center justify-center text-[var(--accent-red-glow)]">{icon}</div>
        <span className="text-sm">{title}</span>
        <span className="ml-auto text-white/40 group-hover:text-white transition">→</span>
      </div>
    </Link>
  );
}
