import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { DashCard } from "@/components/DashboardShell";
import { supabase } from "@/integrations/supabase/client";
import { categories as ALL_CATEGORIES } from "@/lib/mock-data";
import { toast } from "sonner";
import { X, Search, AlertTriangle, Calendar as CalendarIcon } from "lucide-react";
import { SALE_TIME_ZONE, centralInputToUtcDate, centralInputToUtcIso, deriveSaleStatus } from "@/lib/sale-time";

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

export type Scope = "all" | "categories" | "selected";

export type SaleFormValues = {
  id?: string;
  name: string;
  slug: string;
  discount_pct: number;
  scope: Scope;
  categories: string[];
  productIds: string[];
  startAt: string; // "YYYY-MM-DDTHH:mm"
  endAt: string;
  status?: "draft" | "scheduled" | "active" | "ended";
};

const EMPTY: SaleFormValues = {
  name: "", slug: "", discount_pct: 25, scope: "all",
  categories: [], productIds: [], startAt: "", endAt: "",
};

type ProductLite = { id: string; name: string; maker: string; category: string; slug: string };

type OtherSale = {
  id: string; name: string; discount_pct: number; scope: Scope;
  categories: string[]; productIds: Set<string>;
  start_at: string; end_at: string; status: string;
};

export function SaleForm({
  mode,
  initial,
  draftKey,
}: {
  mode: "new" | "edit";
  initial?: Partial<SaleFormValues>;
  draftKey?: string; // localStorage key (only used in "new" mode)
}) {
  const navigate = useNavigate();

  // Local draft persistence (new-mode only)
  const loadDraft = (): SaleFormValues => {
    if (mode !== "new" || !draftKey || typeof window === "undefined") return { ...EMPTY, ...(initial ?? {}) };
    try {
      const raw = localStorage.getItem(draftKey);
      if (!raw) return { ...EMPTY, ...(initial ?? {}) };
      return { ...EMPTY, ...(initial ?? {}), ...(JSON.parse(raw) as Partial<SaleFormValues>) };
    } catch { return { ...EMPTY, ...(initial ?? {}) }; }
  };
  const first = useRef(loadDraft());
  const [v, setV] = useState<SaleFormValues>(first.current);
  const set = <K extends keyof SaleFormValues>(k: K, val: SaleFormValues[K]) =>
    setV((prev) => ({ ...prev, [k]: val }));

  useEffect(() => {
    if (mode !== "new" || !draftKey || typeof window === "undefined") return;
    const { id: _id, status: _s, ...rest } = v;
    try { localStorage.setItem(draftKey, JSON.stringify(rest)); } catch { /* noop */ }
  }, [v, draftKey, mode]);

  const clearDraft = () => {
    if (mode === "new" && draftKey && typeof window !== "undefined") {
      try { localStorage.removeItem(draftKey); } catch { /* noop */ }
    }
  };

  // Product catalog (used by scope=selected search AND overlap resolution)
  const [products, setProducts] = useState<ProductLite[]>([]);
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("products")
        .select("id, name, maker, category, slug")
        .eq("status", "published")
        .order("name");
      setProducts((data ?? []) as ProductLite[]);
    })();
  }, []);
  const productById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  // Product picker search
  const [query, setQuery] = useState("");
  const searchResults = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return products
      .filter((p) => !v.productIds.includes(p.id))
      .filter((p) => p.name.toLowerCase().includes(q) || p.maker.toLowerCase().includes(q))
      .slice(0, 8);
  }, [products, query, v.productIds]);

  // Overlap detection
  const [saving, setSaving] = useState(false);
  const [overlapWarn, setOverlapWarn] = useState<
    { product: ProductLite; sale: OtherSale }[] | null
  >(null);

  function effectiveProductIds(values: SaleFormValues, allProducts: ProductLite[]): Set<string> {
    if (values.scope === "all") return new Set(allProducts.map((p) => p.id));
    if (values.scope === "categories") {
      const cats = new Set(values.categories.map((c) => c.toLowerCase()));
      return new Set(allProducts.filter((p) => cats.has((p.category ?? "").toLowerCase())).map((p) => p.id));
    }
    return new Set(values.productIds);
  }

  async function fetchOtherSales(): Promise<OtherSale[]> {
    const { data: rows } = await supabase
      .from("sale_events")
      .select("id, name, discount_pct, scope, categories, start_at, end_at, status")
        .neq("status", "draft" as any);
    const list = (rows ?? [])
      .filter((r) => r.id !== v.id)
      .filter((r) => ["active", "scheduled"].includes(deriveSaleStatus(r.start_at as string, r.end_at as string, r.status as string))) as any[];
    if (list.length === 0) return [];
    const { data: jr } = await supabase
      .from("sale_event_products")
      .select("sale_event_id, product_id")
      .in("sale_event_id", list.map((r) => r.id));
    const byId = new Map<string, Set<string>>();
    for (const j of jr ?? []) {
      const set = byId.get(j.sale_event_id as string) ?? new Set<string>();
      set.add(j.product_id as string);
      byId.set(j.sale_event_id as string, set);
    }
    return list.map((r) => ({
      id: r.id, name: r.name, discount_pct: r.discount_pct,
      scope: r.scope as Scope, categories: (r.categories ?? []) as string[],
      productIds: byId.get(r.id) ?? new Set<string>(),
      start_at: r.start_at, end_at: r.end_at, status: r.status,
    }));
  }

  function findOverlaps(values: SaleFormValues, others: OtherSale[]) {
    const mine = effectiveProductIds(values, products);
    const conflicts: { product: ProductLite; sale: OtherSale }[] = [];
    for (const other of others) {
      const theirs = other.scope === "all"
        ? new Set(products.map((p) => p.id))
        : other.scope === "categories"
          ? new Set(products.filter((p) => other.categories.map((c) => c.toLowerCase()).includes((p.category ?? "").toLowerCase())).map((p) => p.id))
          : other.productIds;
      for (const pid of mine) {
        if (theirs.has(pid)) {
          const p = productById.get(pid);
          if (p) conflicts.push({ product: p, sale: other });
        }
      }
    }
    return conflicts;
  }

  function validate(status: "scheduled" | "draft"): string | null {
    if (!v.name.trim()) return "Give the sale a name.";
    if (!v.slug.trim()) return "Slug is required.";
    if (v.scope === "categories" && v.categories.length === 0) return "Pick at least one category.";
    if (v.scope === "selected" && v.productIds.length === 0) return "Add at least one plugin.";
    if (status === "scheduled") {
      if (!v.startAt || !v.endAt) return "Start and end dates are required to schedule.";
      const start = centralInputToUtcDate(v.startAt);
      const end = centralInputToUtcDate(v.endAt);
      if (!start || !end) return "Enter valid Central time start and end dates.";
      if (end <= start) return "End must be after start.";
    }
    return null;
  }

  async function attemptSave(status: "scheduled" | "draft", { acknowledgeOverlaps = false } = {}) {
    if (saving) return;
    const err = validate(status);
    if (err) { toast.error(err); return; }

    if (!acknowledgeOverlaps && status === "scheduled") {
      const others = await fetchOtherSales();
      const conflicts = findOverlaps(v, others);
      if (conflicts.length > 0) { setOverlapWarn(conflicts); return; }
    }

    setSaving(true);
    try {
      const now = new Date().toISOString();
      const startAtIso = v.startAt ? centralInputToUtcIso(v.startAt) : now;
      const endAtIso = v.endAt ? centralInputToUtcIso(v.endAt) : now;
      const liveStatus = status === "draft" ? "draft" : deriveSaleStatus(startAtIso, endAtIso);
      const payload = {
        name: v.name.trim(),
        slug: v.slug.trim(),
        discount_pct: v.discount_pct,
        scope: v.scope as any,
        categories: v.scope === "categories" ? v.categories : [],
        start_at: startAtIso,
        end_at: endAtIso,
        status: liveStatus as any,
        // Clear any old presentation fields — this form no longer sets them.
        headline: null,
        subheadline: null,
        theme_color: null,
      };

      let saleId = v.id;
      if (mode === "new") {
        const { data, error } = await supabase.from("sale_events").insert(payload).select("id").single();
        if (error) throw error;
        saleId = data.id as string;
      } else {
        const { error } = await supabase.from("sale_events").update(payload).eq("id", v.id!);
        if (error) throw error;
      }

      // Sync product junction — only for scope=selected. Otherwise wipe it clean so
      // future scope changes don't carry stale plugin selections.
      if (saleId) {
        await supabase.from("sale_event_products").delete().eq("sale_event_id", saleId);
        if (v.scope === "selected" && v.productIds.length > 0) {
          await supabase.from("sale_event_products").insert(
            v.productIds.map((pid) => ({ sale_event_id: saleId!, product_id: pid })),
          );
        }
      }

      clearDraft();
      toast.success(mode === "new"
        ? (status === "scheduled" ? `Sale ${liveStatus === "active" ? "activated" : liveStatus}.` : "Draft saved.")
        : "Sale updated.");
      navigate({ to: "/dashboard/sales" });
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't save the sale.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteSale() {
    if (mode !== "edit" || !v.id) return;
    if (!window.confirm("Delete this sale? This can't be undone.")) return;
    const { error } = await supabase.from("sale_events").delete().eq("id", v.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Sale deleted.");
    navigate({ to: "/dashboard/sales" });
  }

  return (
    <>
      <div className="max-w-4xl mx-auto pb-32 space-y-6">
        <DashCard title="Sale name">
          <Field label="Internal name (for your own reference)">
            <input
              value={v.name}
              onChange={(e) => {
                const name = e.target.value;
                set("name", name);
                // Auto-fill slug until user hand-edits it.
                if (mode === "new" && (!v.slug || v.slug === slugify(v.name))) set("slug", slugify(name));
              }}
              placeholder="e.g. World Cup Sale"
              className="ipt"
            />
          </Field>
          <Field label="Slug (URL)">
            <input value={v.slug} onChange={(e) => set("slug", slugify(e.target.value))} className="ipt" />
            <div className="text-[10px] text-white/40 mt-1 font-mono">/sale/{v.slug || "..."}</div>
          </Field>
        </DashCard>

        <DashCard title="Discount">
          <input
            type="range"
            min={5}
            max={75}
            step={5}
            value={v.discount_pct}
            onChange={(e) => set("discount_pct", Number(e.target.value))}
            className="glass-slider"
            style={{ "--val": `${((v.discount_pct - 5) / 70) * 100}%` } as React.CSSProperties}
          />
          <div className="flex items-baseline justify-center gap-2 mt-4">
            <span
              className="font-display text-4xl text-[var(--accent-red-glow)]"
              style={{ textShadow: "0 0 18px rgba(255,0,60,0.55)" }}
            >
              {v.discount_pct}%
            </span>
            <span className="text-xs text-white/60 font-mono uppercase tracking-wider">off</span>
          </div>
          <div className="text-center text-xs text-white/60 mt-1">
            Save ${Math.round((99 * v.discount_pct) / 100)} on a $99 plugin
          </div>
        </DashCard>

        <DashCard title="Schedule">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Start">
              <div className="relative">
                <input
                  type="datetime-local"
                  value={v.startAt}
                  onChange={(e) => set("startAt", e.target.value)}
                  className="ipt ipt-dt"
                />
                <CalendarIcon className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#B8ACCC]" />
              </div>
            </Field>
            <Field label="End">
              <div className="relative">
                <input
                  type="datetime-local"
                  value={v.endAt}
                  onChange={(e) => set("endAt", e.target.value)}
                  className="ipt ipt-dt"
                />
                <CalendarIcon className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#B8ACCC]" />
              </div>
            </Field>
          </div>
          <div className="text-[10px] text-white/40 mt-2 font-mono">
            Time zone: {SALE_TIME_ZONE}. Times are saved in UTC automatically.
          </div>
          <div className="text-[11px] text-white/50 mt-2">
            Status is derived automatically — Scheduled before start, Active between start &amp; end, then Ended.
          </div>
        </DashCard>


        <DashCard title="What does the discount apply to?">
          <div className="space-y-2 mb-4">
            {(["all", "categories", "selected"] as const).map((s) => (
              <label key={s} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${v.scope === s ? "border-[var(--accent-red)] bg-[var(--accent-red)]/10" : "border-white/10 hover:border-white/25 bg-white/[0.02]"}`}>
                <input
                  type="radio"
                  checked={v.scope === s}
                  onChange={() => set("scope", s)}
                  className="accent-[var(--accent-red)] mt-0.5"
                />
                <div>
                  <div className="text-sm font-semibold">
                    {s === "all" ? "All products" : s === "categories" ? "Specific categories" : "Specific plugins"}
                  </div>
                  <div className="text-[11px] text-white/55">
                    {s === "all" && "The discount covers your entire published catalog."}
                    {s === "categories" && "Pick one or more categories — every product in the checked categories is included."}
                    {s === "selected" && "Search and add individual plugins. Perfect for spotlight promos."}
                  </div>
                </div>
              </label>
            ))}
          </div>

          {v.scope === "categories" && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {ALL_CATEGORIES.map((c) => {
                const checked = v.categories.includes(c.slug);
                return (
                  <label
                    key={c.slug}
                    className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer text-sm transition ${checked ? "border-[var(--accent-red)] bg-[var(--accent-red)]/10" : "border-white/10 hover:border-white/25"}`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        set(
                          "categories",
                          checked ? v.categories.filter((x) => x !== c.slug) : [...v.categories, c.slug],
                        )
                      }
                      className="accent-[var(--accent-red)]"
                    />
                    <span className="capitalize">{c.name}</span>
                  </label>
                );
              })}
            </div>
          )}

          {v.scope === "selected" && (
            <div>
              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search plugins by name or maker…"
                  className="ipt !pl-9"
                />
              </div>
              {searchResults.length > 0 && (
                <div className="rounded-lg border border-white/10 bg-white/[0.03] max-h-60 overflow-y-auto mb-3">
                  {searchResults.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => { set("productIds", [...v.productIds, p.id]); setQuery(""); }}
                      className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-white/5 text-left"
                    >
                      <div>
                        <div className="font-medium">{p.name}</div>
                        <div className="text-[10px] text-white/45 font-mono uppercase tracking-wider">{p.maker} · {p.category}</div>
                      </div>
                      <span className="text-[10px] text-[var(--accent-red-glow)]">+ ADD</span>
                    </button>
                  ))}
                </div>
              )}
              {v.productIds.length === 0 ? (
                <div className="text-xs text-white/45">No plugins added yet.</div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {v.productIds.map((pid) => {
                    const p = productById.get(pid);
                    return (
                      <span
                        key={pid}
                        className="inline-flex items-center gap-2 pl-3 pr-1.5 py-1 rounded-full border border-white/15 bg-white/5 text-xs"
                      >
                        {p ? p.name : pid.slice(0, 8)}
                        <button
                          type="button"
                          onClick={() => set("productIds", v.productIds.filter((x) => x !== pid))}
                          className="w-5 h-5 rounded-full flex items-center justify-center hover:bg-white/10"
                          aria-label="Remove"
                        >
                          <X size={11} />
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </DashCard>
      </div>

      {/* Sticky action bar */}
      <div
        className="fixed bottom-0 left-0 md:left-[220px] right-0 z-30 border-t border-white/10 bg-[#13002C]/95 backdrop-blur-md px-4 sm:px-6 py-3"
        style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
      >
        {/* Desktop / tablet: single row */}
        <div className="hidden sm:flex items-center gap-3">
          {mode === "edit" && (
            <button onClick={deleteSale} className="btn-ghost !text-xs !py-2 !px-4 !border-[var(--accent-red)]/40 !text-[var(--accent-red-glow)]">Delete sale</button>
          )}
          {mode === "new" && draftKey && <span className="text-[10px] text-white/40 font-mono">Draft auto-saved locally</span>}
          <div className="ml-auto flex items-center gap-3">
            <Link to="/dashboard/sales" onClick={clearDraft} className="btn-ghost !text-xs !py-2 !px-4">Cancel</Link>
            <button disabled={saving} onClick={() => attemptSave("draft")} className="btn-ghost !text-xs !py-2 !px-4 disabled:opacity-50">
              {saving ? "Saving…" : mode === "new" ? "Save draft" : "Save as draft"}
            </button>
            <button disabled={saving} onClick={() => attemptSave("scheduled")} className="btn-primary !text-xs !py-2 !px-6 disabled:opacity-50">
              {saving ? "Saving…" : mode === "new" ? "Schedule sale" : "Save changes"}
            </button>
          </div>
        </div>

        {/* Mobile: grouped by importance */}
        <div className="sm:hidden flex flex-col gap-2.5">
          <button
            disabled={saving}
            onClick={() => attemptSave("scheduled")}
            className="btn-primary w-full !text-sm !py-3 !px-4 min-h-[48px] disabled:opacity-50"
          >
            {saving ? "Saving…" : mode === "new" ? "Schedule sale" : "Save changes"}
          </button>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              disabled={saving}
              onClick={() => attemptSave("draft")}
              className="btn-ghost w-full !text-sm !py-3 !px-4 min-h-[48px] disabled:opacity-50"
            >
              {saving ? "Saving…" : mode === "new" ? "Save draft" : "Save as draft"}
            </button>
            <Link
              to="/dashboard/sales"
              onClick={clearDraft}
              className="btn-ghost w-full !text-sm !py-3 !px-4 min-h-[48px] inline-flex items-center justify-center"
            >
              Cancel
            </Link>
          </div>
          {mode === "edit" && (
            <>
              <div className="h-px bg-white/10 mt-1" />
              <button
                onClick={deleteSale}
                className="w-full min-h-[48px] rounded-lg border border-[var(--accent-red)]/50 text-[var(--accent-red-glow)] text-sm font-semibold tracking-wide bg-transparent hover:bg-[var(--accent-red)]/10 transition"
              >
                Delete sale
              </button>
            </>
          )}
        </div>
      </div>


      {/* Overlap warning modal */}
      {overlapWarn && (
        <OverlapModal
          conflicts={overlapWarn}
          onCancel={() => setOverlapWarn(null)}
          onRemoveConflicting={() => {
            const bad = new Set(overlapWarn.map((c) => c.product.id));
            if (v.scope === "selected") {
              set("productIds", v.productIds.filter((id) => !bad.has(id)));
            }
            setOverlapWarn(null);
            toast.message("Overlapping plugins removed from this sale — save again to schedule.");
          }}
          onAcknowledge={() => { setOverlapWarn(null); attemptSave("scheduled", { acknowledgeOverlaps: true }); }}
        />
      )}

      <style>{`.ipt{width:100%;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.15);border-radius:8px;padding:0.55rem 0.75rem;font-size:13px;color:#fff;outline:none}.ipt:focus{border-color:var(--accent-red);box-shadow:0 0 0 3px rgba(255,0,60,0.15)}.ipt-dt{min-height:48px;padding-right:2.25rem;font-size:14px;font-variant-numeric:tabular-nums}.ipt-dt::-webkit-calendar-picker-indicator{opacity:0;position:absolute;right:0;top:0;width:100%;height:100%;cursor:pointer}`}</style>
    </>
  );
}

function Field({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return <label className="block mb-3"><span className="label-mini text-[10px] opacity-70 mb-1.5 block">{label}</span>{children}</label>;
}

function OverlapModal({
  conflicts, onCancel, onRemoveConflicting, onAcknowledge,
}: {
  conflicts: { product: { id: string; name: string; maker: string }; sale: { name: string; discount_pct: number; status: string } }[];
  onCancel: () => void;
  onRemoveConflicting: () => void;
  onAcknowledge: () => void;
}) {
  // De-dupe (product,sale) pairs.
  const seen = new Set<string>();
  const rows = conflicts.filter((c) => {
    const k = `${c.product.id}|${(c.sale as any).id ?? c.sale.name}`;
    if (seen.has(k)) return false;
    seen.add(k); return true;
  });
  return (
    <div className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="glass-card p-6 max-w-lg w-full">
        <div className="chromatic-edge" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-3 text-[var(--accent-red-glow)]">
            <AlertTriangle size={18} /> <h3 className="font-display text-xl">Plugin overlap detected</h3>
          </div>
          <p className="text-sm text-white/70 mb-4">
            {rows.length} {rows.length === 1 ? "plugin is" : "plugins are"} already in another active or scheduled sale.
            A plugin should only be in one sale at a time.
          </p>
          <div className="max-h-52 overflow-y-auto rounded-lg border border-white/10 bg-white/[0.03] mb-4">
            {rows.map((c, i) => (
              <div key={i} className="flex justify-between items-center px-3 py-2 text-xs border-b border-white/5 last:border-b-0">
                <div>
                  <div className="font-medium">{c.product.name}</div>
                  <div className="text-white/40 font-mono uppercase tracking-wider text-[10px]">{c.product.maker}</div>
                </div>
                <div className="text-right">
                  <div className="text-white/70">{c.sale.name}</div>
                  <div className="text-[10px] text-white/40 font-mono">{c.sale.discount_pct}% · {c.sale.status}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 justify-end">
            <button onClick={onCancel} className="btn-ghost !text-xs !py-2 !px-4">Back to editing</button>
            <button onClick={onRemoveConflicting} className="btn-ghost !text-xs !py-2 !px-4">Remove conflicting plugins</button>
            <button onClick={onAcknowledge} className="btn-primary !text-xs !py-2 !px-4">Schedule anyway</button>
          </div>
          <div className="text-[10px] text-white/40 mt-3">
            "Schedule anyway" leaves the overlap in place — whichever sale has the highest % will be applied to shared plugins.
          </div>
        </div>
      </div>
    </div>
  );
}
