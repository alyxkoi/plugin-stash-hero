import { createFileRoute, Link } from "@tanstack/react-router";
import { DashboardShell, DashCard, StatusBadge } from "@/components/DashboardShell";
import { saleEvents, formatMoney } from "@/lib/dashboard-mock";
import { Plus } from "lucide-react";

export const Route = createFileRoute("/dashboard/sales/")({
  head: () => ({ meta: [{ title: "Sales — Plugin Warehouse" }] }),
  component: SalesPage,
});

function SalesPage() {
  const active = saleEvents.find(s => s.status === "active");
  return (
    <DashboardShell title="Sales" action={<Link to="/dashboard/sales/new" className="btn-primary !text-xs !py-2 !px-4 inline-flex items-center gap-1.5"><Plus size={13} /> New sale</Link>}>
      {active && (
        <div className="glass-card p-5 mb-6" style={{ borderColor: active.themeColor + "55" }}>
          <div className="chromatic-edge" />
          <div className="relative z-10 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1"><span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded" style={{ background: active.themeColor + "22", color: active.themeColor }}>Live</span><h2 className="font-display text-2xl">{active.name}</h2></div>
              <div className="text-xs text-white/60">{active.discountPct}% off · ends {new Date(active.endAt).toLocaleDateString()}</div>
            </div>
            <div className="flex gap-2"><a href={`/sale/${active.slug}`} target="_blank" rel="noreferrer" className="btn-ghost !text-xs !py-2 !px-4">Preview landing page</a><button className="btn-ghost !text-xs !py-2 !px-4">Pause</button><button className="btn-ghost !text-xs !py-2 !px-4 !border-[var(--accent-red)]/40 !text-[var(--accent-red-glow)]">End early</button></div>
          </div>
        </div>
      )}
      <DashCard title="All sale events">
        <div className="overflow-x-auto -mx-2">
        <table className="w-full text-sm">
          <thead className="text-[10px] uppercase tracking-wider text-white/40"><tr><th className="text-left py-2 px-2">Event</th><th className="text-right py-2 px-2">Discount</th><th className="hidden md:table-cell text-left py-2 px-3">Start</th><th className="hidden md:table-cell text-left py-2 px-3">End</th><th className="hidden md:table-cell text-left py-2 px-2">Products</th><th className="text-left py-2 px-2">Status</th><th className="text-right py-2 px-2">Revenue</th><th className="hidden md:table-cell text-right py-2 px-2">Actions</th></tr></thead>
          <tbody>
            {saleEvents.map(s => (
              <tr key={s.id} className="border-t border-white/5">
                <td className="py-2 px-2"><Link to={"/dashboard/sales/$id" as any} params={{ id: s.id } as any} className="hover:text-[var(--accent-red-glow)] block max-w-[140px] md:max-w-none truncate">{s.name}</Link></td>
                <td className="py-2 px-2 text-right font-mono text-xs">{s.discountPct}%</td>
                <td className="hidden md:table-cell py-2 px-3 text-[10px] text-white/50 font-mono">{new Date(s.startAt).toLocaleDateString()}</td>
                <td className="hidden md:table-cell py-2 px-3 text-[10px] text-white/50 font-mono">{new Date(s.endAt).toLocaleDateString()}</td>
                <td className="hidden md:table-cell py-2 px-2 text-xs text-white/60">{s.scope === "all" ? "All" : s.productCount}</td>
                <td className="py-2 px-2"><StatusBadge status={s.status} /></td>
                <td className="py-2 px-2 text-right font-mono text-xs">{s.revenue ? formatMoney(s.revenue) : "—"}</td>
                <td className="hidden md:table-cell py-2 px-2 text-right text-xs"><Link to={"/dashboard/sales/$id" as any} params={{ id: s.id } as any} className="text-white/60 hover:text-white">Edit</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </DashCard>
    </DashboardShell>
  );
}
