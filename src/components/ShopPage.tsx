import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { SlidersHorizontal, X } from "lucide-react";
import { ProductCard } from "./ProductCard";
import { categories, type Category, type Product } from "@/lib/mock-data";
import { usePublishedProducts } from "@/hooks/useProducts";
import { pickSaleFor, type ActiveSaleRow } from "@/lib/sale-pricing";

interface ShopPageProps {
  category?: Category;
  title: string;
  subtitle: string;
  initialOnSale?: boolean;
  activeSale?: ActiveSaleRow | null;
  themeAccent?: string;
}

export function ShopPage({ category, title, subtitle, initialOnSale, activeSale }: ShopPageProps) {
  const [query, setQuery] = useState("");
  const [selectedCats, setSelectedCats] = useState<Category[]>([]);
  const [selectedFormats, setSelectedFormats] = useState<string[]>([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [saleStatus, setSaleStatus] = useState<"all" | "sale" | "free">(initialOnSale ? "sale" : "all");
  const [priceSort, setPriceSort] = useState<"none" | "low" | "high">("none");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const reduce = useReducedMotion();

  const { data: ALL = [], isLoading } = usePublishedProducts();
  const effectiveCats = useMemo<Category[]>(
    () => (category ? [category] : selectedCats),
    [category, selectedCats],
  );

  useEffect(() => {
    if (!filtersOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [filtersOpen]);

  const allFormats = ["VST", "VST3", "AU", "AAX", "Standalone"];

  const filtered = useMemo(() => {
    let r: Product[] = [...ALL];
    if (activeSale) r = r.filter((p) => pickSaleFor([activeSale], p) !== null);
    if (effectiveCats.length) {
      const wanted = new Set(effectiveCats.map((c) => c.toLowerCase()));
      // The "freebies" category is a virtual bucket: any published product
      // marked is_free (or priced at $0) belongs here regardless of its
      // real category (effects, instruments, etc.).
      const freebiesOnly = wanted.has("freebies") && wanted.size === 1;
      if (freebiesOnly) {
        r = r.filter((p) => p.isFree || p.price === 0);
      } else {
        r = r.filter((p) => wanted.has((p.category ?? "").toString().toLowerCase()) || (wanted.has("freebies") && (p.isFree || p.price === 0)));
      }
    }

    if (query) r = r.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()) || p.maker.toLowerCase().includes(query.toLowerCase()));
    if (selectedFormats.length) r = r.filter((p) => p.formats.some((f) => selectedFormats.includes(f)));
    if (selectedPlatforms.length) r = r.filter((p) => (p.platforms ?? []).some((pl) => selectedPlatforms.includes(pl)));
    if (saleStatus === "sale" && !activeSale) r = r.filter((p) => p.compareAtPrice && p.compareAtPrice > p.price);
    if (saleStatus === "free") r = r.filter((p) => p.isFree);

    if (priceSort === "low") {
      r.sort((a, b) => a.price - b.price);
    } else if (priceSort === "high") {
      r.sort((a, b) => b.price - a.price);
    } else {
      // Default: newest first (by `updated` month/year).
      r.sort((a, b) => {
        const ta = Date.parse(`1 ${a.updated}`) || 0;
        const tb = Date.parse(`1 ${b.updated}`) || 0;
        return tb - ta;
      });
    }
    return r;
  }, [ALL, activeSale, query, effectiveCats, selectedFormats, selectedPlatforms, saleStatus, priceSort]);

  const togglePill = <T,>(list: T[], v: T, set: (l: T[]) => void) =>
    set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  const showFormat = !initialOnSale && !["software", "freebies"].includes(category || "");
  const showPlatform = !["software", "libraries"].includes(category || "");
  const resultMotionKey = `${query}|${effectiveCats.join(",")}|${selectedFormats.join(",")}|${selectedPlatforms.join(",")}|${saleStatus}|${priceSort}`;
  const clearFilters = () => {
    setSelectedCats([]);
    setSelectedFormats([]);
    setSelectedPlatforms([]);
    setSaleStatus("all");
    setQuery("");
    setPriceSort("none");
  };

  const filters = (
    <>
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-bold uppercase tracking-wider text-base m-0">Filters</h2>
        <button onClick={clearFilters} className="pwh-text-button">Clear</button>
      </div>
      <input className="input-glass mb-5" placeholder={`Search within ${category || "warehouse"}`} value={query} onChange={(e) => setQuery(e.target.value)} />
      {!category && (
        <FilterGroup title="Category">
          <div className="grid grid-cols-2 lg:grid-cols-1 gap-1">
            {categories.map((c) => (
              <label key={c.slug} className="pwh-check-row">
                <input type="checkbox" checked={selectedCats.includes(c.slug)} onChange={() => togglePill(selectedCats, c.slug, setSelectedCats)} />
                <span>{c.name}</span>
              </label>
            ))}
          </div>
        </FilterGroup>
      )}
      {showFormat && (
        <FilterGroup title="Format">
          <PillGroup options={allFormats} selected={selectedFormats} onToggle={(v) => togglePill(selectedFormats, v, setSelectedFormats)} />
        </FilterGroup>
      )}
      {showPlatform && (
        <FilterGroup title="Compatibility">
          <PillGroup options={["Mac", "Windows"]} selected={selectedPlatforms.map((p) => p === "mac" ? "Mac" : "Windows")} onToggle={(v) => togglePill(selectedPlatforms, v.toLowerCase(), setSelectedPlatforms)} />
        </FilterGroup>
      )}
      <FilterGroup title="Sale status">
        <Segmented options={[{ value: "all", label: "All" }, { value: "sale", label: "On sale" }, { value: "free", label: "Free" }]} value={saleStatus} onChange={(value) => setSaleStatus(value as typeof saleStatus)} />
      </FilterGroup>
      <FilterGroup title="Sort by price">
        <Segmented options={[{ value: "none", label: "Newest" }, { value: "low", label: "Low first" }, { value: "high", label: "High first" }]} value={priceSort} onChange={(value) => setPriceSort(value as typeof priceSort)} />
      </FilterGroup>
    </>
  );

  return (
    <div className="shop-page">
      <section className="pwh-horizon shop-horizon px-4 md:px-12 py-12 md:py-16 text-center relative">
        <h1 className="pwh-display shop-horizon__title">{title}</h1>
        <p className="mt-3 text-[var(--text-2)] max-w-2xl mx-auto">{subtitle}</p>
      </section>

      <div className="shop-results px-4 md:px-8 xl:px-12 grid lg:grid-cols-[248px_minmax(0,1fr)] gap-6 xl:gap-8 pb-20">
        <aside className="hidden lg:block lg:sticky lg:top-28 self-start pwh-solid-panel p-5">
          {filters}
        </aside>

        <div className="min-w-0">
          <div className="shop-result-count flex flex-wrap items-center justify-between gap-4">
            <div className="font-mono text-sm text-[var(--text-2)]">{filtered.length} {filtered.length === 1 ? "PLUGIN" : "PLUGINS"}</div>
            <button className="lg:hidden pwh-filter-trigger" onClick={() => setFiltersOpen(true)}>
              <SlidersHorizontal className="w-4 h-4" /> Filters and sort
            </button>
          </div>

          <AnimatePresence mode="sync" initial={false}>
            <motion.div
              key={resultMotionKey}
              initial={reduce ? false : { opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={reduce ? undefined : { opacity: 0, x: -16 }}
              transition={{ duration: reduce ? 0 : 0.22, ease: [0.19, 1, 0.22, 1] }}
            >
              {isLoading ? (
                <div className="pwh-solid-panel p-10 md:p-16 text-center" role="status">
                  <div className="font-mono text-sm tracking-wider text-[var(--text-2)]">LOADING PLUGINS…</div>
                </div>
              ) : filtered.length === 0 ? (
                <div className="pwh-solid-panel p-10 md:p-16 text-center">
                  <h3 className="font-bold text-3xl mb-2">No matches yet.</h3>
                  <p className="text-[var(--text-2)] mb-6">Try a wider filter or another search.</p>
                  <button onClick={() => { setSelectedFormats([]); setSelectedPlatforms([]); setSaleStatus("all"); setQuery(""); setPriceSort("none"); }} className="btn-ghost">CLEAR FILTERS</button>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-5">
                  {filtered.map((p) => <ProductCard key={p.slug} product={p} />)}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
      <AnimatePresence>
        {filtersOpen && (
          <motion.div className="pwh-mobile-sheet-layer lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setFiltersOpen(false)}>
            <motion.aside className="pwh-mobile-sheet" initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ duration: reduce ? 0 : 0.28, ease: [0.19, 1, 0.22, 1] }} onClick={(event) => event.stopPropagation()}>
              <div className="pwh-sheet-grip" />
              <button className="pwh-sheet-close" onClick={() => setFiltersOpen(false)} aria-label="Close filters"><X className="w-5 h-5" /></button>
              <div className="p-5 pt-8 overflow-y-auto">{filters}</div>
              <div className="p-4 border-t border-white/10">
                <button className="btn-primary w-full" onClick={() => setFiltersOpen(false)}>Show {filtered.length} results</button>
              </div>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <div className="font-mono text-[10px] tracking-[0.15em] text-white/40 mb-2 uppercase">{title}</div>
      {children}
    </div>
  );
}

function PillGroup({ options, selected, onToggle }: { options: string[]; selected: string[]; onToggle: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button key={o} onClick={() => onToggle(o)} className={`pwh-filter-chip ${selected.includes(o) ? "is-active" : ""}`}>
          {o}
        </button>
      ))}
    </div>
  );
}

function Segmented({ options, value, onChange }: { options: { value: string; label: string }[]; value: string; onChange: (value: string) => void }) {
  return (
    <div className="pwh-segmented">
      {options.map((option) => (
        <button key={option.value} onClick={() => onChange(option.value)} className={value === option.value ? "is-active" : ""}>{option.label}</button>
      ))}
    </div>
  );
}
