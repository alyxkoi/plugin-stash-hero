import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { DashboardShell, DashCard, StatusBadge } from "@/components/DashboardShell";
import { supabase } from "@/integrations/supabase/client";
import { Plus } from "lucide-react";

export const Route = createFileRoute("/dashboard/sales/")({
  head: () => ({ meta: [{ title: "Sales — Plugin Warehouse" }] }),
  component: SalesPage,
});

type SaleRow = {
  id: string; name: string; slug: string; discount_pct: number; scope: string;
  start_at: string; end_at: string; status: string; theme_color: string | null;
};

function SalesPage() {
  const [rows, setRows] = useState<SaleRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("sale_events")
        .select("id, name, slug, discount_pct, scope, start_at, end_at, status, theme_color")
        .order("start_at", { ascending: false });
      setRows((data ?? []) as SaleRow[]);
      setLoading(false);
    })();
  }, []);

  const active = rows.find(s => s.status === "active");

  return (
    <DashboardShell title="Sales" action={<Link to="/dashboard/sales/new" className="btn-primary !text-xs !py-2 !px-4 inline-flex items-center gap-1.5"><Plus size={13} /> New sale</Link>}>
      {active && (
        <div className="glass-card p-5 mb-6" style={{ borderColor: (active.theme_color ?? "#ff003c") + "55" }}>
          <div className="chromatic-edge" />
          <div className="relative z-10 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded" style={{ background: (active.theme_color ?? "#ff003c") + "22", color: active.theme_color ?? "#ff003c" }}>Live</span>
                <h2 className="font-display text-2xl">{active.name}</h2>
              </div>
              <div className="text-xs text-white/60">{active.discount_pct}% off · ends {new Date(active.end_at).toLocaleDateString()}</div>
            </div>
            <div className="flex gap-2">
              <a href={`/sale/${active.slug}`} target="_blank" rel="noreferrer" className="btn-ghost !text-xs !py-2 !px-4">Preview landing page</a>
            </div>
          </div>
        </div>
      )}
      <DashCard title="All sale events">
        <div className="overflow-x-auto -mx-2">
          <table className="w-full text-sm">
            <thead className="text-[10px] uppercase tracking-wider text-white/40">
              <tr>
                <th className="text-left py-2 px-2">Event</th>
                <th className="text-right py-2 px-2">Discount</th>
                <th className="hidden md:table-cell text-left py-2 px-3">Start</th>
                <th className="hidden md:table-cell text-left py-2 px-3">End</th>
                <th className="hidden md:table-cell text-left py-2 px-2">Scope</th>
                <th className="text-left py-2 px-2">Status</th>
                <th className="hidden md:table-cell text-right py-2 px-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={7} className="py-6 text-center text-white/40 text-xs">Loading…</td></tr>}
              {!loading && rows.length === 0 && (
                <tr><td colSpan={7} className="py-8 text-center text-white/50 text-sm">No sale events yet. <Link to="/dashboard/sales/new" className="text-[var(--accent-red-glow)] underline">Create one</Link>.</td></tr>
              )}
              {rows.map(s => (
                <tr key={s.id} className="border-t border-white/5">
                  <td className="py-2 px-2"><Link to={"/dashboard/sales/$id" as any} params={{ id: s.id } as any} className="hover:text-[var(--accent-red-glow)] block max-w-[140px] md:max-w-none truncate">{s.name}</Link></td>
                  <td className="py-2 px-2 text-right font-mono text-xs">{s.discount_pct}%</td>
                  <td className="hidden md:table-cell py-2 px-3 text-[10px] text-white/50 font-mono">{new Date(s.start_at).toLocaleDateString()}</td>
                  <td className="hidden md:table-cell py-2 px-3 text-[10px] text-white/50 font-mono">{new Date(s.end_at).toLocaleDateString()}</td>
                  <td className="hidden md:table-cell py-2 px-2 text-xs text-white/60 capitalize">{s.scope}</td>
                  <td className="py-2 px-2"><StatusBadge status={s.status as any} /></td>
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
