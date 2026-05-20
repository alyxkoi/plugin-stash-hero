import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { DashboardShell, DashCard, StatCard } from "@/components/DashboardShell";
import { products, formatMoney, relativeTime } from "@/lib/dashboard-mock";
import { Upload, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/products/$id")({
  head: () => ({ meta: [{ title: "Edit product — Plugin Warehouse" }] }),
  component: EditProduct,
});

function EditProduct() {
  const { id } = useParams({ from: "/dashboard/products/$id" });
  const product = products.find(p => p.id === id);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [typed, setTyped] = useState("");

  if (!product) {
    return <DashboardShell title="Product not found"><DashCard><p className="text-sm text-white/60">No product matches that id. <Link to="/dashboard/products" className="text-[var(--accent-red-glow)]">Back to products</Link></p></DashCard></DashboardShell>;
  }

  const conv = ((product.unitsSold / (product.unitsSold * 8 + 50)) * 100).toFixed(1);

  return (
    <DashboardShell title={`Edit · ${product.name}`}>
      <div className="max-w-4xl mx-auto pb-12 space-y-6">
        {/* Stats strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Units sold" value={product.unitsSold.toString()} />
          <StatCard label="Revenue" value={formatMoney(product.revenue)} />
          <StatCard label="Refunds" value={product.refundCount.toString()} />
          <StatCard label="Conversion" value={`${conv}%`} />
        </div>

        <DashCard title="Details">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="w-32 h-32 rounded-lg" style={{ background: product.coverGradient }} />
            <div className="md:col-span-2 space-y-3">
              <Field label="Name"><input defaultValue={product.name} className="ipt" /></Field>
              <Field label="Maker"><input defaultValue={product.maker} className="ipt" /></Field>
              <Field label="Description"><textarea defaultValue={product.description} rows={4} className="ipt resize-none" /></Field>
            </div>
          </div>
        </DashCard>

        <DashCard title="Pricing">
          <div className="flex gap-4">
            <Field label="Regular price"><input defaultValue={product.price} type="number" className="ipt max-w-[140px]" /></Field>
            {product.salePrice && <Field label="Sale price"><input defaultValue={product.salePrice} type="number" className="ipt max-w-[140px]" /></Field>}
          </div>
        </DashCard>

        {/* Versions */}
        <DashCard title="File versions">
          <div className="bg-white/5 rounded-lg p-4 mb-4 border border-[var(--accent-red)]/30">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm">Current: <span className="font-mono">v{product.version}</span></div>
                <div className="text-[11px] text-white/50 font-mono">{product.zipFileName} · {product.zipSizeMB} MB · uploaded {relativeTime(product.uploadedAt)}</div>
              </div>
              <span className="text-xs font-mono text-white/60">{product.unitsSold} downloads</span>
            </div>
          </div>
          <label className="block border border-dashed border-white/20 rounded-lg p-4 text-center cursor-pointer hover:border-white/40 mb-4">
            <input type="file" accept=".zip" hidden />
            <Upload size={18} className="mx-auto mb-1 text-white/60" />
            <div className="text-xs text-white/70">Upload new version</div>
          </label>
          <table className="w-full text-sm">
            <thead className="text-[10px] uppercase tracking-wider text-white/40">
              <tr><th className="text-left py-2">Version</th><th className="text-left py-2">Size</th><th className="text-left py-2">Uploaded</th><th className="text-right py-2"></th></tr>
            </thead>
            <tbody>
              {[{ v:"0.9", size:"180 MB", d: 180 },{ v:"0.8", size:"160 MB", d: 240 }].map(r => (
                <tr key={r.v} className="border-t border-white/5">
                  <td className="py-2 font-mono text-xs">v{r.v}</td>
                  <td className="py-2 font-mono text-xs">{r.size}</td>
                  <td className="py-2 text-[10px] text-white/50 font-mono">{r.d}d ago</td>
                  <td className="py-2 text-right"><button className="text-xs text-white/60 hover:text-white">Restore</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-[10px] text-white/30 mt-3">{/* TODO: backend — wire R2 versioning */}</p>
        </DashCard>

        {/* Danger zone */}
        <div className="glass-card p-5 border !border-[var(--accent-red)]/40">
          <div className="chromatic-edge" />
          <div className="relative z-10">
            <h3 className="font-display text-base text-[var(--accent-red-glow)] mb-3">Danger zone</h3>
            <div className="flex gap-3">
              <button onClick={() => toast("Archive confirmation modal would open here.")} className="btn-ghost !text-xs !py-2 !px-4 !border-[var(--accent-red)]/40 !text-[var(--accent-red-glow)]">Archive product</button>
              <button onClick={() => setConfirmDelete(true)} className="btn-primary !text-xs !py-2 !px-4">Delete permanently</button>
            </div>
          </div>
        </div>
      </div>

      {confirmDelete && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setConfirmDelete(false)}>
          <div className="glass-card p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="chromatic-edge" />
            <div className="relative z-10">
              <div className="flex justify-between items-center mb-3"><h3 className="font-display text-lg">Confirm delete</h3><button onClick={() => setConfirmDelete(false)}><X size={16} /></button></div>
              <p className="text-sm text-white/70 mb-4">Type <span className="font-mono text-[var(--accent-red-glow)]">{product.name}</span> to confirm permanent deletion.</p>
              <input value={typed} onChange={e => setTyped(e.target.value)} className="ipt mb-4" />
              <div className="flex gap-2 justify-end">
                <button onClick={() => setConfirmDelete(false)} className="btn-ghost !text-xs !py-2 !px-4">Cancel</button>
                <button disabled={typed !== product.name} onClick={() => { toast.success("Deleted."); setConfirmDelete(false); }} className="btn-primary !text-xs !py-2 !px-4 disabled:opacity-40">Delete</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`.ipt{width:100%;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.15);border-radius:8px;padding:0.55rem 0.75rem;font-size:13px;color:#fff;outline:none;transition:border-color .15s}.ipt:focus{border-color:var(--accent-red)}`}</style>
    </DashboardShell>
  );
}

function Field({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return <label className="block"><span className="label-mini text-[10px] opacity-70 mb-1.5 block">{label}</span>{children}</label>;
}
