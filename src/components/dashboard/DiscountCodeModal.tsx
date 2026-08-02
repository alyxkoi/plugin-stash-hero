import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X, Search } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { categories as ALL_CATEGORIES } from "@/lib/mock-data";

export type Scope = "all" | "categories" | "selected";
export type DiscountRow = {
  id: string;
  code: string;
  type: "percent" | "flat";
  value: number;
  usage_limit: number | null;
  uses: number;
  expires_at: string | null;
  status: "active" | "expired" | "disabled";
  applies_to: string | null;
  scope: Scope;
  categories: string[];
};

type ProductLite = { id: string; name: string; maker: string; category: string };

export function DiscountCodeModal({ onClose, onCreated, existing }: { onClose: () => void; onCreated: (r: DiscountRow) => void; existing?: DiscountRow }) {
  const reduce = useReducedMotion();
  const isEdit = !!existing;
  const [code, setCode] = useState(existing?.code ?? "");
  const [type, setType] = useState<"percent" | "flat">(existing?.type ?? "percent");
  const [value, setValue] = useState(existing ? String(existing.value) : "");
  const [usageLimit, setUsageLimit] = useState(existing?.usage_limit != null ? String(existing.usage_limit) : "");
  const [expiresAt, setExpiresAt] = useState(existing?.expires_at ? existing.expires_at.slice(0, 10) : "");
  const [active, setActive] = useState(existing ? existing.status === "active" : true);
  const [scope, setScope] = useState<Scope>(existing?.scope ?? "all");
  const [categoriesSel, setCategoriesSel] = useState<string[]>(existing?.categories ?? []);
  const [productIds, setProductIds] = useState<string[]>([]);
  const [products, setProducts] = useState<ProductLite[]>([]);
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("products")
        .select("id, name, maker, category")
        .eq("status", "published")
        .order("name");
      setProducts((data ?? []) as ProductLite[]);
    })();
  }, []);

  useEffect(() => {
    if (!existing || existing.scope !== "selected") return;
    (async () => {
      const { data } = await (supabase as any).from("discount_code_products")
        .select("product_id")
        .eq("discount_code_id", existing.id);
      setProductIds(((data ?? []) as { product_id: string }[]).map(r => r.product_id));
    })();
  }, [existing]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = prev; document.removeEventListener("keydown", onKey); };
  }, [onClose]);

  const productById = useMemo(() => new Map(products.map(p => [p.id, p])), [products]);
  const searchResults = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return products
      .filter(p => !productIds.includes(p.id))
      .filter(p => p.name.toLowerCase().includes(q) || p.maker.toLowerCase().includes(q))
      .slice(0, 8);
  }, [products, query, productIds]);

  function autoGen() {
    setCode(Math.random().toString(36).slice(2, 8).toUpperCase());
  }

  async function save() {
    const trimmed = code.trim().toUpperCase();
    const val = parseFloat(value);
    if (!trimmed) return toast.error("Enter a code");
    if (!val || val <= 0) return toast.error("Enter a value");
    if (scope === "categories" && categoriesSel.length === 0) return toast.error("Pick at least one category");
    if (scope === "selected" && productIds.length === 0) return toast.error("Add at least one plugin");
    setSaving(true);
    const appliesTo = scope === "all"
      ? "All products"
      : scope === "categories"
        ? `${categoriesSel.length} categor${categoriesSel.length === 1 ? "y" : "ies"}`
        : `${productIds.length} plugin${productIds.length === 1 ? "" : "s"}`;
    const payload: Record<string, unknown> = {
      code: trimmed,
      type,
      value: val,
      usage_limit: usageLimit ? parseInt(usageLimit, 10) : null,
      expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
      status: active ? "active" : "disabled",
      applies_to: appliesTo,
      scope,
      categories: scope === "categories" ? categoriesSel : [],
    };
    const sel = "id, code, type, value, usage_limit, uses, expires_at, status, applies_to, scope, categories";
    const { data, error } = isEdit
      ? await supabase.from("discount_codes").update(payload as any).eq("id", existing!.id).select(sel).single()
      : await supabase.from("discount_codes").insert(payload as any).select(sel).single();
    if (error || !data) {
      setSaving(false);
      return toast.error(error?.message || (isEdit ? "Couldn't save code" : "Couldn't create code"));
    }
    const codeId = (data as any).id as string;
    // Sync join table for scope=selected.
    if (isEdit) {
      const { error: dErr } = await (supabase as any).from("discount_code_products").delete().eq("discount_code_id", codeId);
      if (dErr) { setSaving(false); return toast.error(dErr.message); }
    }
    if (scope === "selected" && productIds.length > 0) {
      const rows = productIds.map(pid => ({ discount_code_id: codeId, product_id: pid }));
      const { error: jErr } = await (supabase as any).from("discount_code_products").insert(rows);
      if (jErr) {
        setSaving(false);
        return toast.error(jErr.message);
      }
    }
    setSaving(false);
    toast.success(isEdit ? "Code updated" : "Code created");
    onCreated(data as unknown as DiscountRow);
  }

  if (typeof document === "undefined") return null;

  const node = (
    <AnimatePresence>
      <motion.div
        className="dashboard-scope fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6"
        role="dialog"
        aria-modal="true"
        initial={reduce ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: reduce ? 0 : 0.2 }}
      >
        <div
          className="absolute inset-0 bg-black/70"
          style={{ backdropFilter: "blur(8px)" }}
          onClick={onClose}
        />
        <motion.div
          className="relative w-full max-w-lg max-h-[90vh] flex flex-col rounded-2xl border border-white/12 shadow-[0_30px_80px_rgba(0,0,0,0.6)] overflow-hidden"
          style={{ background: "rgba(20,5,44,0.96)", backdropFilter: "blur(24px) saturate(160%)" }}
          initial={reduce ? false : { opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97, y: 8 }}
          transition={{ duration: reduce ? 0 : 0.22, ease: [0.19, 1, 0.22, 1] }}
        >
          <div className="chromatic-edge pointer-events-none" />
          <div className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-white/10 shrink-0">
            <h3 className="font-display text-lg">{isEdit ? "Edit discount code" : "Generate discount code"}</h3>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition" aria-label="Close">
              <X size={16} />
            </button>
          </div>

          <div className="relative z-10 flex-1 min-h-0 overflow-y-auto px-6 py-5 space-y-4">
            <label className="block">
              <span className="label-mini text-[10px] opacity-70 mb-1.5 block">Code</span>
              <div className="flex gap-2">
                <input value={code} onChange={e => setCode(e.target.value.toUpperCase())} className="ipt-modal flex-1 font-mono" placeholder="WELCOME10" />
                <button type="button" onClick={autoGen} className="btn-ghost !text-xs !py-2 !px-3 shrink-0">Auto</button>
              </div>
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="label-mini text-[10px] opacity-70 mb-1.5 block">Type</span>
                <select value={type} onChange={e => setType(e.target.value as any)} className="ipt-modal">
                  <option className="bg-[#1F0540]" value="percent">Percentage (%)</option>
                  <option className="bg-[#1F0540]" value="flat">Flat amount ($)</option>
                </select>
              </label>
              <label className="block">
                <span className="label-mini text-[10px] opacity-70 mb-1.5 block">Value {type === "percent" ? "(%)" : "($ off)"}</span>
                <input type="number" min="0" step="any" value={value} onChange={e => setValue(e.target.value)} className="ipt-modal" />
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="label-mini text-[10px] opacity-70 mb-1.5 block">Usage limit</span>
                <input type="number" min="1" value={usageLimit} onChange={e => setUsageLimit(e.target.value)} className="ipt-modal" placeholder="Unlimited" />
              </label>
              <label className="block">
                <span className="label-mini text-[10px] opacity-70 mb-1.5 block">Expires</span>
                <input type="date" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} className="ipt-modal" />
              </label>
            </div>

            <div>
              <span className="label-mini text-[10px] opacity-70 mb-2 block">Applies to</span>
              <div className="space-y-2">
                {(["all", "categories", "selected"] as const).map(s => (
                  <label key={s} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${scope === s ? "border-[var(--accent-red)] bg-[var(--accent-red)]/10" : "border-white/10 hover:border-white/25 bg-white/[0.02]"}`}>
                    <input type="radio" checked={scope === s} onChange={() => setScope(s)} className="accent-[var(--accent-red)] mt-0.5" />
                    <div>
                      <div className="text-sm font-semibold">{s === "all" ? "All products" : s === "categories" ? "Specific categories" : "Specific plugins"}</div>
                      <div className="text-[11px] text-white/55">
                        {s === "all" && "Applies to any plugin in the cart."}
                        {s === "categories" && "Only products in the checked categories."}
                        {s === "selected" && "Only the specific plugins you add below."}
                      </div>
                    </div>
                  </label>
                ))}
              </div>

              {scope === "categories" && (
                <div className="grid grid-cols-2 gap-2 mt-3">
                  {ALL_CATEGORIES.map(c => {
                    const checked = categoriesSel.includes(c.slug);
                    return (
                      <label key={c.slug} className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer text-sm transition ${checked ? "border-[var(--accent-red)] bg-[var(--accent-red)]/10" : "border-white/10 hover:border-white/25"}`}>
                        <input type="checkbox" checked={checked} onChange={() => setCategoriesSel(checked ? categoriesSel.filter(x => x !== c.slug) : [...categoriesSel, c.slug])} className="accent-[var(--accent-red)]" />
                        <span className="capitalize">{c.name}</span>
                      </label>
                    );
                  })}
                </div>
              )}

              {scope === "selected" && (
                <div className="mt-3">
                  <div className="relative mb-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                    <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search plugins…" className="ipt-modal !pl-9" />
                  </div>
                  {searchResults.length > 0 && (
                    <div className="rounded-lg border border-white/10 bg-white/[0.03] max-h-52 overflow-y-auto mb-3">
                      {searchResults.map(p => (
                        <button key={p.id} type="button" onClick={() => { setProductIds([...productIds, p.id]); setQuery(""); }} className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-white/5 text-left">
                          <div>
                            <div className="font-medium">{p.name}</div>
                            <div className="text-[10px] text-white/45 font-mono uppercase tracking-wider">{p.maker} · {p.category}</div>
                          </div>
                          <span className="text-[10px] text-[var(--accent-red-glow)]">+ ADD</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {productIds.length === 0 ? (
                    <div className="text-xs text-white/45 italic">No plugins added yet.</div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {productIds.map(pid => {
                        const p = productById.get(pid);
                        return (
                          <span key={pid} className="inline-flex items-center gap-2 pl-3 pr-1.5 py-1 rounded-full border border-white/15 bg-white/5 text-xs">
                            {p ? p.name : pid.slice(0, 8)}
                            <button type="button" onClick={() => setProductIds(productIds.filter(x => x !== pid))} className="w-5 h-5 rounded-full flex items-center justify-center hover:bg-white/10" aria-label="Remove">
                              <X size={11} />
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} className="accent-[var(--accent-red)]" />
              <span>Active (customers can use this code right away)</span>
            </label>
          </div>

          <div className="relative z-10 flex gap-2 justify-end px-6 py-4 border-t border-white/10 shrink-0" style={{ background: "rgba(20,5,44,0.6)" }}>
            <button onClick={onClose} className="btn-ghost !text-xs !py-2 !px-4">Cancel</button>
            <button onClick={save} disabled={saving} className="btn-primary !text-xs !py-2 !px-4">{saving ? "Creating…" : "Create code"}</button>
          </div>
        </motion.div>

        <style>{`.ipt-modal{width:100%;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.15);border-radius:8px;padding:0.55rem 0.75rem;font-size:13px;color:#fff;outline:none;transition:border-color .15s}.ipt-modal:focus{border-color:var(--accent-red)}`}</style>
      </motion.div>
    </AnimatePresence>
  );

  return createPortal(node, document.body);
}
