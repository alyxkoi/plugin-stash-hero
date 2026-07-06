import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { DashboardShell, DashCard, StatusBadge } from "@/components/DashboardShell";
import { supabase } from "@/integrations/supabase/client";
import { deriveSaleStatus, formatInSaleTimeZone, type LiveSaleStatus } from "@/lib/sale-time";
import { Edit3, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/sales/")({
  head: () => ({ meta: [{ title: "Sales — Plugin Warehouse" }] }),
  component: SalesPage,
});

type SaleRow = {
  id: string; name: string; slug: string; discount_pct: number; scope: string;
  start_at: string; end_at: string; status: string; theme_color: string | null;
};

type DisplaySaleRow = SaleRow & { liveStatus: LiveSaleStatus };

function SalesPage() {
  const [rows, setRows] = useState<SaleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(() => Date.now());
  const [pendingDelete, setPendingDelete] = useState<DisplaySaleRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadSales();
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 15_000);
    return () => window.clearInterval(timer);
  }, []);

  async function loadSales() {
    const { data } = await supabase
      .from("sale_events")
      .select("id, name, slug, discount_pct, scope, start_at, end_at, status, theme_color")
      .order("start_at", { ascending: false });
    setRows((data ?? []) as SaleRow[]);
    setLoading(false);
  }

  const displayRows: DisplaySaleRow[] = rows.map((s) => ({
    ...s,
    liveStatus: deriveSaleStatus(s.start_at, s.end_at, s.status, now),
  }));

  const active = displayRows.find(s => s.liveStatus === "active");

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
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't delete the sale.");
    } finally {
      setDeleting(false);
    }
  }

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
              <div className="text-xs text-white/60">{active.discount_pct}% off · ends {formatInSaleTimeZone(active.end_at)}</div>
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
                <th className="text-right py-2 px-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={7} className="py-6 text-center text-white/40 text-xs">Loading…</td></tr>}
              {!loading && rows.length === 0 && (
                <tr><td colSpan={7} className="py-8 text-center text-white/50 text-sm">No sale events yet. <Link to="/dashboard/sales/new" className="text-[var(--accent-red-glow)] underline">Create one</Link>.</td></tr>
              )}
              {displayRows.map(s => (
                <tr key={s.id} className="border-t border-white/5">
                  <td className="py-2 px-2"><Link to="/dashboard/sales/$id" params={{ id: s.id }} className="hover:text-[var(--accent-red-glow)] block max-w-[140px] md:max-w-none truncate">{s.name}</Link></td>
                  <td className="py-2 px-2 text-right font-mono text-xs">{s.discount_pct}%</td>
                  <td className="hidden md:table-cell py-2 px-3 text-[10px] text-white/50 font-mono">{formatInSaleTimeZone(s.start_at)}</td>
                  <td className="hidden md:table-cell py-2 px-3 text-[10px] text-white/50 font-mono">{formatInSaleTimeZone(s.end_at)}</td>
                  <td className="hidden md:table-cell py-2 px-2 text-xs text-white/60 capitalize">{s.scope}</td>
                  <td className="py-2 px-2"><StatusBadge status={s.liveStatus} /></td>
                  <td className="py-2 px-2 text-right text-xs">
                    <div className="inline-flex items-center justify-end gap-1">
                      <Link to="/dashboard/sales/$id" params={{ id: s.id }} className="inline-flex items-center gap-1 rounded px-2 py-1 text-white/60 hover:bg-white/10 hover:text-white" title="Edit sale">
                        <Edit3 size={13} /> <span className="hidden sm:inline">Edit</span>
                      </Link>
                      <button
                        type="button"
                        onClick={() => setPendingDelete(s)}
                        className="inline-flex h-7 w-7 items-center justify-center rounded text-white/55 hover:bg-[var(--accent-red)]/10 hover:text-[var(--accent-red-glow)]"
                        aria-label={`Delete ${s.name}`}
                        title="Delete sale"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DashCard>
      {pendingDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4" onClick={() => setPendingDelete(null)}>
          <div className="glass-card w-full max-w-md p-6" onClick={(event) => event.stopPropagation()}>
            <div className="chromatic-edge" />
            <div className="relative z-10">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="font-display text-xl">Delete sale</h3>
                <button type="button" onClick={() => setPendingDelete(null)} className="text-white/50 hover:text-white" aria-label="Cancel delete">
                  <X size={16} />
                </button>
              </div>
              <p className="mb-2 text-sm text-white/75">Are you sure you want to delete this sale?</p>
              <p className="mb-5 text-xs text-white/45">{pendingDelete.name} will be removed from sale_events and any selected-plugin links will be cleared.</p>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setPendingDelete(null)} className="btn-ghost !px-4 !py-2 !text-xs">Cancel</button>
                <button type="button" disabled={deleting} onClick={confirmDelete} className="btn-primary !px-4 !py-2 !text-xs disabled:opacity-50">
                  {deleting ? "Deleting…" : "Delete"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
