import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { DashboardShell, DashCard, StatusBadge } from "@/components/DashboardShell";
import { productCategories, formatMoney, relativeTime, type ProductStatus } from "@/lib/dashboard-mock";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Search, Edit3, Archive, Trash2, X, Check } from "lucide-react";

const searchSchema = z.object({
  q: fallback(z.string(), "").default(""),
  cat: fallback(z.string(), "all").default("all"),
  status: fallback(z.string(), "all").default("all"),
  page: fallback(z.number().int(), 1).default(1),
});

export const Route = createFileRoute("/dashboard/products/")({
  head: () => ({ meta: [{ title: "Products — Plugin Warehouse" }] }),
  validateSearch: zodValidator(searchSchema),
  component: ProductsPage,
});

const SCROLL_KEY = "dashboard-products:scroll";

type Row = {
  id: string; slug: string; name: string; maker: string; category: string;
  price: number; compare_at_price: number | null; status: ProductStatus;
  cover_url: string | null; cover_gradient: string | null; updated_at: string;
  supports_windows: boolean; supports_mac: boolean;
  is_free: boolean | null;
};

async function fetchProducts(): Promise<Row[]> {
  const { data, error } = await supabase
    .from("products")
    .select("id,slug,name,maker,category,price,compare_at_price,status,cover_url,cover_gradient,updated_at,supports_windows,supports_mac,is_free")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Row[];
}

function ProductsPage() {
  const queryClient = useQueryClient();
  const { data: products = [], isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ["dashboard-products"],
    queryFn: fetchProducts,
    staleTime: 60_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    placeholderData: (prev) => prev,
  });

  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const q = search.q;
  const cat = search.cat;
  const status = search.status as "all" | ProductStatus | "freebies";
  const page = search.page;

  const setSearchParam = (patch: Partial<{ q: string; cat: string; status: string; page: number }>) => {
    navigate({ search: (prev: any) => ({ ...prev, ...patch }), replace: true });
  };
  const setQ = (v: string) => setSearchParam({ q: v, page: 1 });
  const setCat = (v: string) => setSearchParam({ cat: v, page: 1 });
  const setStatus = (v: string) => setSearchParam({ status: v, page: 1 });
  const setPage = (updater: number | ((p: number) => number)) => {
    const next = typeof updater === "function" ? (updater as (p: number) => number)(page) : updater;
    setSearchParam({ page: next });
  };

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showCats, setShowCats] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [bulkConfirm, setBulkConfirm] = useState<null | "delete" | "archive">(null);
  const [bulkBusy, setBulkBusy] = useState(false);

  // Params passed through to the edit page so Save/Back can return here intact.
  const editSearch = { q, cat, status, page } as const;

  // Preserve scroll position across product-edit navigation.
  useEffect(() => {
    const raw = sessionStorage.getItem(SCROLL_KEY);
    if (raw) {
      const y = parseInt(raw, 10);
      if (!isNaN(y)) requestAnimationFrame(() => window.scrollTo(0, y));
      sessionStorage.removeItem(SCROLL_KEY);
    }
  }, []);

  const rememberScroll = () => sessionStorage.setItem(SCROLL_KEY, String(window.scrollY));

  async function updateProduct(id: string, patch: Partial<Omit<Row, "is_free">>, prev: Row) {
    // Optimistic update
    queryClient.setQueryData<Row[]>(["dashboard-products"], (rows) =>
      (rows ?? []).map((r) => (r.id === id ? { ...r, ...patch } : r))
    );
    const { error } = await supabase.from("products").update(patch).eq("id", id);
    if (error) {
      queryClient.setQueryData<Row[]>(["dashboard-products"], (rows) =>
        (rows ?? []).map((r) => (r.id === id ? prev : r))
      );
      toast.error(`Save failed: ${error.message}`);
      return false;
    }
    setSavedId(id);
    setTimeout(() => setSavedId((s) => (s === id ? null : s)), 1200);
    return true;
  }

  async function bulkArchive() {
    const ids = Array.from(selected);
    if (!ids.length) return;
    setBulkBusy(true);
    const { error } = await supabase.from("products").update({ status: "archived" }).in("id", ids);
    setBulkBusy(false);
    setBulkConfirm(null);
    if (error) { toast.error(`Archive failed: ${error.message}`); return; }
    toast.success(`Archived ${ids.length} product${ids.length === 1 ? "" : "s"}.`);
    setSelected(new Set());
    await queryClient.invalidateQueries({ queryKey: ["dashboard-products"] });
  }

  async function bulkDelete() {
    const ids = Array.from(selected);
    if (!ids.length) return;
    setBulkBusy(true);
    try {
      // 1. Gather every R2 object attached to these products before nuking DB rows.
      const paths: string[] = [];
      const targets = products.filter((p) => selected.has(p.id));
      for (const p of targets) if (p.cover_url) paths.push(p.cover_url);
      const { data: files } = await supabase
        .from("product_files").select("product_id, zip_url").in("product_id", ids);
      for (const r of (files ?? []) as Array<{ zip_url: string | null }>) {
        if (r.zip_url) paths.push(r.zip_url);
      }

      // 2. Delete products (product_files cascade via FK).
      const { error, data: deleted } = await supabase
        .from("products").delete().in("id", ids).select("id, name");
      if (error) { toast.error(`Delete failed: ${error.message}`); return; }

      const deletedIds = new Set((deleted ?? []).map((d: any) => d.id));
      const failed = targets.filter((p) => !deletedIds.has(p.id));

      // 3. Clean R2 objects (best effort).
      if (paths.length) {
        try {
          await supabase.functions.invoke("r2-delete-objects", { body: { paths } });
        } catch (e) { console.warn("R2 delete threw:", e); }
      }

      if (failed.length) {
        toast.error(`Couldn't delete: ${failed.map((f) => f.name).join(", ")}`);
      } else {
        toast.success(`Deleted ${ids.length} product${ids.length === 1 ? "" : "s"}.`);
      }
      setSelected(new Set());
      await queryClient.invalidateQueries({ queryKey: ["dashboard-products"] });
    } finally {
      setBulkBusy(false);
      setBulkConfirm(null);
    }
  }


  const filtered = useMemo(() => products.filter(p => {
    if (q && !p.name.toLowerCase().includes(q.toLowerCase())) return false;
    if (cat !== "all" && p.category !== cat) return false;
    if (status === "freebies") { if (!(p.is_free || Number(p.price) === 0)) return false; }
    else if (status !== "all" && p.status !== status) return false;
    return true;
  }), [products, q, cat, status]);

  const pageSize = 20;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged = filtered.slice((page-1)*pageSize, page*pageSize);
  const toggle = (id: string) => setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  return (
    <DashboardShell title="Products" action={
      <Link to="/dashboard/products/new" className="btn-primary !text-xs !py-2 !px-4 inline-flex items-center gap-1.5"><Plus size={14} /> Add product</Link>
    }>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[240px] max-w-[360px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
          <input value={q} onChange={e => { setQ(e.target.value); setPage(1); }} placeholder="Search plugins" className="w-full bg-white/5 border border-white/15 rounded-lg pl-9 pr-3 py-2 text-sm text-white outline-none focus:border-[var(--accent-red)]" />
        </div>
        <Select value={cat} onChange={(v) => { setCat(v); setPage(1); }} options={[{ value: "all", label: "All categories" }, ...productCategories.map(c => ({ value: c, label: c.charAt(0).toUpperCase()+c.slice(1) }))]} />
        <Select value={status} onChange={(v) => { setStatus(v as any); setPage(1); }} options={[
          { value: "all", label: "All status" }, { value: "published", label: "Published" }, { value: "draft", label: "Draft" }, { value: "archived", label: "Archived" }, { value: "freebies", label: "Freebies (free)" },
        ]} />
        <button onClick={() => refetch()} className="btn-ghost !text-xs !py-2 !px-3">{isFetching ? "Refreshing…" : "Refresh"}</button>
        <button onClick={() => setShowCats(true)} className="btn-ghost !text-xs !py-2 !px-3 ml-auto">Manage categories</button>
      </div>

      {selected.size > 0 && (
        <div className="glass-card p-3 mb-3 flex items-center gap-3">
          <div className="chromatic-edge" />
          <div className="relative z-10 flex items-center gap-3 w-full">
            <span className="text-xs font-mono text-white/70">{selected.size} selected</span>
            <button onClick={() => setBulkConfirm("archive")} disabled={bulkBusy} className="btn-ghost !text-xs !py-1.5 !px-3 disabled:opacity-50">Archive selected</button>
            <button onClick={() => setBulkConfirm("delete")} disabled={bulkBusy} className="btn-ghost !text-xs !py-1.5 !px-3 !border-[var(--accent-red)]/40 !text-[var(--accent-red-glow)] disabled:opacity-50">Delete selected</button>
            <button onClick={() => setSelected(new Set())} className="ml-auto text-white/40 hover:text-white"><X size={14} /></button>
          </div>

        </div>
      )}

      <DashCard>
        {error && (
          <div className="text-sm text-[var(--accent-red-glow)] py-6 text-center">
            Couldn't load products: {(error as Error).message}
          </div>
        )}
        {isLoading && !products.length && (
          <div className="text-sm text-white/50 py-10 text-center font-mono">Loading…</div>
        )}
        {!isLoading && !products.length && !error && (
          <div className="text-sm text-white/50 py-10 text-center">
            No products yet. <Link to="/dashboard/products/new" className="text-[var(--accent-red-glow)] hover:underline">Add your first plugin →</Link>
          </div>
        )}
        {products.length > 0 && (
          <div className="overflow-x-auto -mx-2">
            <table className="w-full text-sm">
              <thead className="text-[10px] uppercase tracking-wider text-white/40">
                <tr>
                  <th className="px-2 py-2 w-8"></th><th className="px-2 py-2 w-12"></th>
                  <th className="text-left px-2 py-2">Name</th><th className="text-left px-2 py-2">Category</th>
                  <th className="text-left px-2 py-2">OS</th>
                  <th className="text-right px-2 py-2">Price</th><th className="text-left px-2 py-2">Status</th>
                  <th className="text-right px-2 py-2">Updated</th><th className="text-right px-2 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paged.map(p => (
                  <tr key={p.id} className={`border-t border-white/5 hover:bg-white/[0.03] transition-colors ${savedId === p.id ? "bg-emerald-500/10" : ""}`}>
                    <td className="px-2 py-2"><input type="checkbox" checked={selected.has(p.id)} onChange={() => toggle(p.id)} className="accent-[var(--accent-red)]" /></td>
                    <td className="px-2 py-2">
                      {p.cover_url
                        ? <img src={p.cover_url} alt="" className="w-10 h-10 rounded-md object-cover" />
                        : <div className="w-10 h-10 rounded-md" style={{ background: p.cover_gradient || "linear-gradient(135deg,#3a0a4a,#7b0a5a)" }} />}
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex items-center gap-2">
                        <Link to={"/dashboard/products/$id" as any} params={{ id: p.id } as any} search={editSearch as any} onClick={rememberScroll} className="text-sm hover:text-[var(--accent-red-glow)]">{p.name}</Link>
                        {(p.is_free || Number(p.price) === 0) && (
                          <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/50 text-emerald-300 tracking-wider">FREE</span>
                        )}
                      </div>
                      <div className="text-[10px] text-white/40">{p.maker}</div>
                    </td>
                    <td className="px-2 py-2">
                      <CategoryCell product={p} onSave={(v) => updateProduct(p.id, { category: v }, p)} />
                    </td>
                    <td className="px-2 py-2">
                      {p.category === "libraries"
                        ? <span className="text-[10px] font-mono text-white/30">—</span>
                        : <OsCell product={p} onSave={(win, mac) => updateProduct(p.id, { supports_windows: win, supports_mac: mac }, p)} />}
                    </td>
                    <td className="px-2 py-2 text-right">
                      <PriceCell product={p} onSave={(price, cmp) => updateProduct(p.id, { price, compare_at_price: cmp }, p)} justSaved={savedId === p.id} />
                    </td>
                    <td className="px-2 py-2"><StatusBadge status={p.status} /></td>
                    <td className="px-2 py-2 text-right font-mono text-[10px] text-white/50">{relativeTime(p.updated_at)}</td>
                    <td className="px-2 py-2 text-right">
                      <div className="inline-flex gap-1">
                        <Link to={"/dashboard/products/$id" as any} params={{ id: p.id } as any} search={editSearch as any} onClick={rememberScroll} className="p-1.5 rounded hover:bg-white/10 text-white/60 hover:text-white"><Edit3 size={13} /></Link>
                        <button className="p-1.5 rounded hover:bg-white/10 text-white/60 hover:text-white"><Archive size={13} /></button>
                        <button className="p-1.5 rounded hover:bg-white/10 text-white/60 hover:text-[var(--accent-red-glow)]"><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {filtered.length > 0 && (
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/5 text-xs font-mono text-white/50">
            <span>{filtered.length} products</span>
            <div className="flex items-center gap-2">
              <button disabled={page<=1} onClick={() => setPage(p=>p-1)} className="px-2 py-1 rounded hover:bg-white/5 disabled:opacity-30">Prev</button>
              <span>{page} / {totalPages}</span>
              <button disabled={page>=totalPages} onClick={() => setPage(p=>p+1)} className="px-2 py-1 rounded hover:bg-white/5 disabled:opacity-30">Next</button>
            </div>
          </div>
        )}
      </DashCard>

      {showCats && <CategoriesModal onClose={() => setShowCats(false)} />}

      {bulkConfirm && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => !bulkBusy && setBulkConfirm(null)}>
          <div className="glass-card p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="chromatic-edge" />
            <div className="relative z-10">
              <h3 className="font-display text-lg mb-2">
                {bulkConfirm === "delete" ? `Delete ${selected.size} product${selected.size === 1 ? "" : "s"}?` : `Archive ${selected.size} product${selected.size === 1 ? "" : "s"}?`}
              </h3>
              <p className="text-sm text-white/70 mb-5">
                {bulkConfirm === "delete"
                  ? "This can't be undone. Products and their plugin files & cover images will be permanently removed from storage."
                  : "Archived products stay in the database but are hidden from the storefront. You can restore them later."}
              </p>
              <div className="flex gap-2 justify-end">
                <button disabled={bulkBusy} onClick={() => setBulkConfirm(null)} className="btn-ghost !text-xs !py-2 !px-4">Cancel</button>
                <button
                  disabled={bulkBusy}
                  onClick={() => bulkConfirm === "delete" ? bulkDelete() : bulkArchive()}
                  className="btn-primary !text-xs !py-2 !px-4"
                >
                  {bulkBusy ? "Working…" : (bulkConfirm === "delete" ? "Delete" : "Archive")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </DashboardShell>
  );
}

// ---------- Inline edit cells ----------

function useOutsideClose(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open, onClose]);
  return ref;
}

function OsCell({ product, onSave }: { product: Row; onSave: (win: boolean, mac: boolean) => Promise<boolean> }) {
  const [open, setOpen] = useState(false);
  const ref = useOutsideClose(open, () => setOpen(false));
  const set = async (win: boolean, mac: boolean) => {
    if (!win && !mac) return; // require at least one
    await onSave(win, mac);
    setOpen(false);
  };
  return (
    <div ref={ref} className="relative inline-block">
      <button onClick={() => setOpen(o => !o)} className="inline-flex gap-1 rounded hover:bg-white/5 px-1 py-0.5 cursor-pointer">
        {product.supports_windows && <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-sky-500/15 border border-sky-500/40 text-sky-200">Win</span>}
        {product.supports_mac && <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-fuchsia-500/15 border border-fuchsia-500/40 text-fuchsia-200">Mac</span>}
        {!product.supports_windows && !product.supports_mac && <span className="text-[10px] font-mono text-white/30">—</span>}
      </button>
      {open && (
        <div className="absolute z-40 top-full mt-1 left-0 w-44 glass-card p-2 shadow-2xl">
          <div className="relative z-10 space-y-1">
            <button onClick={() => set(true, false)} className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-white/10 flex items-center justify-between">
              Windows only {product.supports_windows && !product.supports_mac && <Check size={12} />}
            </button>
            <button onClick={() => set(false, true)} className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-white/10 flex items-center justify-between">
              Mac only {!product.supports_windows && product.supports_mac && <Check size={12} />}
            </button>
            <button onClick={() => set(true, true)} className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-white/10 flex items-center justify-between">
              Both {product.supports_windows && product.supports_mac && <Check size={12} />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function CategoryCell({ product, onSave }: { product: Row; onSave: (v: string) => Promise<boolean> }) {
  const [open, setOpen] = useState(false);
  const ref = useOutsideClose(open, () => setOpen(false));
  const pick = async (v: string) => { await onSave(v); setOpen(false); };
  return (
    <div ref={ref} className="relative inline-block">
      <button onClick={() => setOpen(o => !o)} className="inline-block text-[10px] uppercase tracking-wider font-mono px-2 py-0.5 rounded bg-white/5 border border-white/10 hover:bg-white/10 cursor-pointer">
        {product.category}
      </button>
      {open && (
        <div className="absolute z-40 top-full mt-1 left-0 w-44 glass-card p-1 shadow-2xl max-h-64 overflow-y-auto">
          <div className="relative z-10">
            {productCategories.map(c => (
              <button key={c} onClick={() => pick(c)} className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-white/10 flex items-center justify-between">
                <span className="capitalize">{c}</span>
                {product.category === c && <Check size={12} />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PriceCell({ product, onSave, justSaved }: { product: Row; onSave: (price: number, cmp: number | null) => Promise<boolean>; justSaved: boolean }) {
  const [editing, setEditing] = useState<"price" | "cmp" | null>(null);
  const [val, setVal] = useState("");

  const startEdit = (which: "price" | "cmp") => {
    setEditing(which);
    setVal(which === "price" ? String(product.price) : (product.compare_at_price ? String(product.compare_at_price) : ""));
  };

  const commit = async () => {
    if (!editing) return;
    const trimmed = val.trim();
    if (editing === "price") {
      const n = parseFloat(trimmed);
      if (!isFinite(n) || n < 0) { toast.error("Enter a valid price"); setEditing(null); return; }
      if (n !== product.price) await onSave(n, product.compare_at_price);
    } else {
      const n = trimmed === "" ? null : parseFloat(trimmed);
      if (n !== null && (!isFinite(n) || n < 0)) { toast.error("Enter a valid compare-at price"); setEditing(null); return; }
      if (n !== product.compare_at_price) await onSave(product.price, n);
    }
    setEditing(null);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") { e.preventDefault(); commit(); }
    else if (e.key === "Escape") { e.preventDefault(); setEditing(null); }
  };

  return (
    <div className="inline-flex items-center gap-1 font-mono text-xs justify-end">
      {editing === "price" ? (
        <PriceInput value={val} setVal={setVal} onBlur={commit} onKeyDown={onKeyDown} />
      ) : (
        <button onClick={() => startEdit("price")} className={`px-1 py-0.5 rounded hover:bg-white/10 ${product.compare_at_price && product.compare_at_price > product.price ? "text-[var(--accent-red-glow)]" : ""}`}>
          {formatMoney(product.price)}
        </button>
      )}
      {editing === "cmp" ? (
        <PriceInput value={val} setVal={setVal} onBlur={commit} onKeyDown={onKeyDown} placeholder="—" />
      ) : (
        <button onClick={() => startEdit("cmp")} className="px-1 py-0.5 rounded hover:bg-white/10 text-white/40">
          {product.compare_at_price ? <span className="line-through">{formatMoney(product.compare_at_price)}</span> : <span className="text-white/20">+cmp</span>}
        </button>
      )}
      {justSaved && <Check size={12} className="text-emerald-400" />}
    </div>
  );
}

function PriceInput({ value, setVal, onBlur, onKeyDown, placeholder }: {
  value: string; setVal: (v: string) => void; onBlur: () => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void; placeholder?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { ref.current?.focus(); ref.current?.select(); }, []);
  return (
    <div className="inline-flex items-center bg-white/10 border border-[var(--accent-red)]/60 rounded px-1 py-0.5">
      <span className="text-white/50 mr-0.5">$</span>
      <input
        ref={ref}
        value={value}
        onChange={e => setVal(e.target.value)}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        inputMode="decimal"
        className="w-16 bg-transparent outline-none text-xs text-white text-right"
      />
    </div>
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
