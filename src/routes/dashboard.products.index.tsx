import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { DashboardShell, DashCard, StatusBadge } from "@/components/DashboardShell";
import { products, productCategories, formatMoney, relativeTime, type ProductStatus } from "@/lib/dashboard-mock";
import { Plus, Search, Edit3, Archive, Trash2, X } from "lucide-react";

export const Route = createFileRoute("/dashboard/products/")({
  head: () => ({ meta: [{ title: "Products — Plugin Warehouse" }] }),
  component: ProductsPage,
});

function ProductsPage() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("all");
  const [status, setStatus] = useState<"all" | ProductStatus>("all");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showCats, setShowCats] = useState(false);

  const filtered = useMemo(() => {
    return products.filter(p => {
      if (q && !p.name.toLowerCase().includes(q.toLowerCase())) return false;
      if (cat !== "all" && p.category !== cat) return false;
      if (status !== "all" && p.status !== status) return false;
      return true;
    });
  }, [q, cat, status]);

  const pageSize = 20;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged = filtered.slice((page-1)*pageSize, page*pageSize);

  const toggle = (id: string) => {
    setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  return (
    <DashboardShell title="Products" action={
      <Link to="/dashboard/products/new" className="btn-primary !text-xs !py-2 !px-4 inline-flex items-center gap-1.5"><Plus size={14} /> Add product</Link>
    }>
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[240px] max-w-[360px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
          <input value={q} onChange={e => { setQ(e.target.value); setPage(1); }} placeholder="Search plugins" className="w-full bg-white/5 border border-white/15 rounded-lg pl-9 pr-3 py-2 text-sm text-white outline-none focus:border-[var(--accent-red)]" />
        </div>
        <Select value={cat} onChange={(v) => { setCat(v); setPage(1); }} options={[{ value: "all", label: "All categories" }, ...productCategories.map(c => ({ value: c, label: c.charAt(0).toUpperCase()+c.slice(1) }))]} />
        <Select value={status} onChange={(v) => { setStatus(v as any); setPage(1); }} options={[
          { value: "all", label: "All status" }, { value: "published", label: "Published" }, { value: "draft", label: "Draft" }, { value: "archived", label: "Archived" },
        ]} />
        <button onClick={() => setShowCats(true)} className="btn-ghost !text-xs !py-2 !px-3 ml-auto">Manage categories</button>
      </div>

      {selected.size > 0 && (
        <div className="glass-card p-3 mb-3 flex items-center gap-3">
          <div className="chromatic-edge" />
          <div className="relative z-10 flex items-center gap-3 w-full">
            <span className="text-xs font-mono text-white/70">{selected.size} selected</span>
            <button className="btn-ghost !text-xs !py-1.5 !px-3">Archive selected</button>
            <button className="btn-ghost !text-xs !py-1.5 !px-3">Add to sale event</button>
            <button className="btn-ghost !text-xs !py-1.5 !px-3 !border-[var(--accent-red)]/40 !text-[var(--accent-red-glow)]">Delete selected</button>
            <button onClick={() => setSelected(new Set())} className="ml-auto text-white/40 hover:text-white"><X size={14} /></button>
          </div>
        </div>
      )}

      <DashCard>
        <div className="overflow-x-auto -mx-2">
          <table className="w-full text-sm">
            <thead className="text-[10px] uppercase tracking-wider text-white/40">
              <tr>
                <th className="px-2 py-2 w-8"></th><th className="px-2 py-2 w-12"></th>
                <th className="text-left px-2 py-2">Name</th><th className="text-left px-2 py-2">Category</th>
                <th className="text-right px-2 py-2">Price</th><th className="text-left px-2 py-2">Status</th>
                <th className="text-right px-2 py-2">Units</th><th className="text-right px-2 py-2">Updated</th>
                <th className="text-right px-2 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paged.map(p => (
                <tr key={p.id} className="border-t border-white/5 hover:bg-white/[0.03]">
                  <td className="px-2 py-2"><input type="checkbox" checked={selected.has(p.id)} onChange={() => toggle(p.id)} className="accent-[var(--accent-red)]" /></td>
                  <td className="px-2 py-2"><div className="w-10 h-10 rounded-md" style={{ background: p.coverGradient }} /></td>
                  <td className="px-2 py-2"><Link to={"/dashboard/products/$id" as any} params={{ id: p.id } as any} className="text-sm hover:text-[var(--accent-red-glow)]">{p.name}</Link><div className="text-[10px] text-white/40">{p.maker}</div></td>
                  <td className="px-2 py-2"><span className="inline-block text-[10px] uppercase tracking-wider font-mono px-2 py-0.5 rounded bg-white/5 border border-white/10">{p.category}</span></td>
                  <td className="px-2 py-2 text-right font-mono text-xs">
                    {p.salePrice ? (<><span className="text-[var(--accent-red-glow)]">{formatMoney(p.salePrice)}</span> <span className="line-through text-white/30 ml-1">{formatMoney(p.price)}</span></>) : formatMoney(p.price)}
                  </td>
                  <td className="px-2 py-2"><StatusBadge status={p.status} /></td>
                  <td className="px-2 py-2 text-right font-mono text-xs">{p.unitsSold}</td>
                  <td className="px-2 py-2 text-right font-mono text-[10px] text-white/50">{relativeTime(p.updatedAt)}</td>
                  <td className="px-2 py-2 text-right">
                    <div className="inline-flex gap-1">
                      <Link to={"/dashboard/products/$id" as any} params={{ id: p.id } as any} className="p-1.5 rounded hover:bg-white/10 text-white/60 hover:text-white"><Edit3 size={13} /></Link>
                      <button className="p-1.5 rounded hover:bg-white/10 text-white/60 hover:text-white"><Archive size={13} /></button>
                      <button className="p-1.5 rounded hover:bg-white/10 text-white/60 hover:text-[var(--accent-red-glow)]"><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/5 text-xs font-mono text-white/50">
          <span>{filtered.length} products</span>
          <div className="flex items-center gap-2">
            <button disabled={page<=1} onClick={() => setPage(p=>p-1)} className="px-2 py-1 rounded hover:bg-white/5 disabled:opacity-30">Prev</button>
            <span>{page} / {totalPages}</span>
            <button disabled={page>=totalPages} onClick={() => setPage(p=>p+1)} className="px-2 py-1 rounded hover:bg-white/5 disabled:opacity-30">Next</button>
          </div>
        </div>
      </DashCard>

      {showCats && <CategoriesModal onClose={() => setShowCats(false)} />}
    </DashboardShell>
  );
}

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} className="bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-[var(--accent-red)]">
      {options.map(o => <option key={o.value} value={o.value} className="bg-[#1F0540]">{o.label}</option>)}
    </select>
  );
}

function CategoriesModal({ onClose }: { onClose: () => void }) {
  const [cats, setCats] = useState(productCategories);
  const [newCat, setNewCat] = useState("");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70" onClick={onClose}>
      <div className="glass-card p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="chromatic-edge" />
        <div className="relative z-10">
          <div className="flex justify-between items-center mb-4"><h3 className="font-display text-lg">Manage categories</h3><button onClick={onClose}><X size={16} /></button></div>
          <ul className="space-y-2 mb-4">
            {cats.map(c => (
              <li key={c} className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2">
                <input defaultValue={c} className="flex-1 bg-transparent outline-none text-sm" />
                <button onClick={() => setCats(cs => cs.filter(x => x !== c))} className="text-white/40 hover:text-[var(--accent-red-glow)]"><Trash2 size={13} /></button>
              </li>
            ))}
          </ul>
          <div className="flex gap-2 mb-4">
            <input value={newCat} onChange={e => setNewCat(e.target.value)} placeholder="New category" className="flex-1 bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--accent-red)]" />
            <button onClick={() => { if (newCat) { setCats([...cats, newCat]); setNewCat(""); } }} className="btn-ghost !text-xs !py-2 !px-3">Add</button>
          </div>
          <div className="flex justify-end gap-2"><button onClick={onClose} className="btn-ghost !text-xs !py-2 !px-3">Cancel</button><button onClick={onClose} className="btn-primary !text-xs !py-2 !px-4">Save</button></div>
        </div>
      </div>
    </div>
  );
}
