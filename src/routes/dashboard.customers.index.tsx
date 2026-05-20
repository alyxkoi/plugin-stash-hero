import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { DashboardShell, DashCard } from "@/components/DashboardShell";
import { customers, formatMoney, relativeTime } from "@/lib/dashboard-mock";
import { Search, Mail } from "lucide-react";

export const Route = createFileRoute("/dashboard/customers/")({
  head: () => ({ meta: [{ title: "Customers — Plugin Warehouse" }] }),
  component: CustomersPage,
});

function CustomersPage() {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("recent");
  const filtered = useMemo(() => {
    let list = customers.filter(c => {
      if (q && !c.name.toLowerCase().includes(q.toLowerCase()) && !c.email.toLowerCase().includes(q.toLowerCase())) return false;
      if (filter === "repeat" && c.ordersCount < 2) return false;
      if (filter === "refunded" && c.status !== "refunded") return false;
      if (filter === "banned" && c.status !== "banned") return false;
      return true;
    });
    if (sort === "top") list = [...list].sort((a,b) => b.totalSpent - a.totalSpent);
    else if (sort === "most") list = [...list].sort((a,b) => b.ordersCount - a.ordersCount);
    else list = [...list].sort((a,b) => +new Date(b.lastPurchaseAt) - +new Date(a.lastPurchaseAt));
    return list;
  }, [q, filter, sort]);

  return (
    <DashboardShell title="Customers">
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[240px] max-w-[360px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search name or email" className="w-full bg-white/5 border border-white/15 rounded-lg pl-9 pr-3 py-2 text-sm outline-none focus:border-[var(--accent-red)]" />
        </div>
        <select value={filter} onChange={e => setFilter(e.target.value)} className="bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-xs">
          <option value="all" className="bg-[#1F0540]">All</option>
          <option value="repeat" className="bg-[#1F0540]">Repeat customers</option>
          <option value="refunded" className="bg-[#1F0540]">Refunded</option>
          <option value="banned" className="bg-[#1F0540]">Banned</option>
        </select>
        <select value={sort} onChange={e => setSort(e.target.value)} className="bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-xs">
          <option value="recent" className="bg-[#1F0540]">Recent</option>
          <option value="top" className="bg-[#1F0540]">Top spenders</option>
          <option value="most" className="bg-[#1F0540]">Most purchases</option>
        </select>
      </div>
      <DashCard>
        <table className="w-full text-sm">
          <thead className="text-[10px] uppercase tracking-wider text-white/40"><tr><th className="text-left py-2">Customer</th><th className="text-right py-2">Spent</th><th className="text-right py-2">Orders</th><th className="text-right py-2">Last</th><th className="text-left py-2 px-3">Source</th><th className="text-left py-2">Tags</th><th className="text-right py-2"></th></tr></thead>
          <tbody>
            {filtered.map(c => (
              <tr key={c.id} className="border-t border-white/5 hover:bg-white/[0.03]">
                <td className="py-2"><Link to={"/dashboard/customers/$id" as any} params={{ id: c.id } as any} className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--accent-red)] to-[var(--accent-blue)] flex items-center justify-center text-[10px] font-bold">{c.initials}</div><div><div className="text-sm">{c.name}</div><div className="text-[10px] text-white/40 font-mono">{c.email}</div></div></Link></td>
                <td className="py-2 text-right font-mono text-xs">{formatMoney(c.totalSpent)}</td>
                <td className="py-2 text-right font-mono text-xs">{c.ordersCount}</td>
                <td className="py-2 text-right text-[10px] font-mono text-white/50">{relativeTime(c.lastPurchaseAt)}</td>
                <td className="py-2 px-3"><span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/5 border border-white/10">{c.primarySource}</span></td>
                <td className="py-2 flex gap-1">{c.ordersCount >= 2 && <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-[var(--accent-blue)]/20 text-[var(--accent-blue-glow)] border border-[var(--accent-blue)]/40">Repeat</span>}{c.status === "banned" && <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-[var(--accent-red)]/20 text-[var(--accent-red-glow)] border border-[var(--accent-red)]/40">Banned</span>}</td>
                <td className="py-2 text-right"><button className="p-1.5 rounded hover:bg-white/10 text-white/60 hover:text-white"><Mail size={13} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </DashCard>
    </DashboardShell>
  );
}
