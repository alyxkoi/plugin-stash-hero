import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { DashboardShell, DashCard } from "@/components/DashboardShell";
import { saleEvents } from "@/lib/dashboard-mock";

export const Route = createFileRoute("/dashboard/sales/$id")({
  head: () => ({ meta: [{ title: "Edit sale — Plugin Warehouse" }] }),
  component: EditSale,
});

function EditSale() {
  const { id } = useParams({ from: "/dashboard/sales/$id" });
  const s = saleEvents.find(x => x.id === id);
  if (!s) return <DashboardShell title="Not found"><DashCard><Link to="/dashboard/sales" className="text-[var(--accent-red-glow)] text-sm">Back</Link></DashCard></DashboardShell>;
  return (
    <DashboardShell title={`Edit · ${s.name}`}>
      <div className="max-w-4xl mx-auto space-y-6 pb-32">
        <DashCard title="Event details">
          <label className="block mb-3"><span className="label-mini text-[10px] opacity-70 mb-1.5 block">Name</span><input defaultValue={s.name} className="w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--accent-red)]" /></label>
          <label className="block mb-3"><span className="label-mini text-[10px] opacity-70 mb-1.5 block">Headline</span><input defaultValue={s.headline} className="w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--accent-red)]" /></label>
          <label className="block"><span className="label-mini text-[10px] opacity-70 mb-1.5 block">Discount %</span><input type="number" defaultValue={s.discountPct} className="w-32 bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--accent-red)]" /></label>
        </DashCard>
      </div>
      <div className="fixed bottom-0 left-0 md:left-[220px] right-0 z-30 border-t border-white/10 bg-[#13002C]/95 backdrop-blur-md px-6 py-3 flex items-center gap-3">
        <Link to="/dashboard/sales" className="btn-ghost !text-xs !py-2 !px-4">Cancel</Link>
        <button className="btn-primary !text-xs !py-2 !px-6 ml-auto">Save changes</button>
        <button className="btn-ghost !text-xs !py-2 !px-4 !border-[var(--accent-red)]/40 !text-[var(--accent-red-glow)]">Deactivate / End now</button>
      </div>
    </DashboardShell>
  );
}
