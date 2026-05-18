import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ProductCard } from "./ProductCard";
import { GlassCard } from "./GlassCard";
import { products as ALL, categories, type Category, type Product, SALE } from "@/lib/mock-data";

interface ShopPageProps {
  category?: Category;
  title: string;
  subtitle: string;
  initialOnSale?: boolean;
  themeAccent?: string;
}

export function ShopPage({ category, title, subtitle, initialOnSale }: ShopPageProps) {
  const [query, setQuery] = useState("");
  const [selectedCats, setSelectedCats] = useState<Category[]>(category ? [category] : []);
  const [selectedFormats, setSelectedFormats] = useState<string[]>([]);
  const [saleStatus, setSaleStatus] = useState<"all" | "sale" | "free">(initialOnSale ? "sale" : "all");
  const [priceSort, setPriceSort] = useState<"none" | "low" | "high">("none");

  const allFormats = ["VST", "VST3", "AU", "AAX", "Standalone"];

  const filtered = useMemo(() => {
    let r: Product[] = [...ALL];
    if (selectedCats.length) r = r.filter((p) => selectedCats.includes(p.category));
    if (query) r = r.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()) || p.maker.toLowerCase().includes(query.toLowerCase()));
    if (selectedFormats.length) r = r.filter((p) => p.formats.some((f) => selectedFormats.includes(f)));
    if (saleStatus === "sale") r = r.filter((p) => p.compareAtPrice && p.compareAtPrice > p.price);
    if (saleStatus === "free") r = r.filter((p) => p.isFree);

    switch (sort) {
      case "fresh": r.sort((a, b) => (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0)); break;
      case "low": r.sort((a, b) => a.price - b.price); break;
      case "high": r.sort((a, b) => b.price - a.price); break;
      case "sale": r.sort((a, b) => ((b.compareAtPrice || 0) - b.price) - ((a.compareAtPrice || 0) - a.price)); break;
      default: r.sort((a, b) => (b.isBestseller ? 1 : 0) - (a.isBestseller ? 1 : 0));
    }
    return r;
  }, [query, selectedCats, selectedFormats, saleStatus, sort]);

  const togglePill = <T,>(list: T[], v: T, set: (l: T[]) => void) =>
    set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  const showFormat = !["software", "freebies"].includes(category || "");

  return (
    <div>
      {/* Banner */}
      <section className="px-4 md:px-12 py-12 md:py-16 text-center relative">
        <h1 className="font-black chrome-text" style={{ fontSize: "clamp(2.5rem, 6vw, 5rem)" }}>{title}</h1>
        <p className="mt-3 text-white/65 max-w-2xl mx-auto">{subtitle}</p>
        {SALE.active && (
          <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/15 bg-white/5 font-mono text-xs">
            🌴 35% off everything — {SALE.endsLabel}
          </div>
        )}
      </section>

      <div className="px-4 md:px-12 grid lg:grid-cols-[280px_1fr] gap-8 pb-16">
        {/* Sidebar */}
        <aside className="lg:sticky lg:top-28 self-start">
          <GlassCard variant="subtle" className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="font-black uppercase tracking-wider">FILTERS</div>
              <button onClick={() => { setSelectedCats(category ? [category] : []); setSelectedFormats([]); setSaleStatus("all"); setQuery(""); }} className="text-xs text-white/50 hover:text-white">CLEAR</button>
            </div>
            <input className="input-glass mb-5" placeholder={`Search within ${category || "warehouse"}`} value={query} onChange={(e) => setQuery(e.target.value)} />

            {!category && (
              <FilterGroup title="Category">
                {categories.map((c) => (
                  <label key={c.slug} className="flex items-center justify-between text-sm py-1.5 cursor-pointer hover:text-white text-white/70">
                    <span className="flex items-center gap-2">
                      <input type="checkbox" checked={selectedCats.includes(c.slug)} onChange={() => togglePill(selectedCats, c.slug, setSelectedCats)} className="accent-[var(--accent-red)]" />
                      {c.name}
                    </span>
                    <span className="font-mono text-xs text-white/40">{c.count}</span>
                  </label>
                ))}
              </FilterGroup>
            )}


            {showFormat && (
              <FilterGroup title="Format">
                <PillGroup options={allFormats} selected={selectedFormats} onToggle={(v) => togglePill(selectedFormats, v, setSelectedFormats)} />
              </FilterGroup>
            )}

            <FilterGroup title="Sale Status">
              <div className="flex gap-1 p-1 rounded-full bg-white/5 border border-white/10">
                {(["all", "sale", "free"] as const).map((s) => (
                  <button key={s} onClick={() => setSaleStatus(s)} className={`flex-1 py-1.5 rounded-full text-xs font-bold uppercase transition ${saleStatus === s ? "bg-[var(--accent-red)] text-white" : "text-white/60"}`}>
                    {s === "all" ? "All" : s === "sale" ? "On Sale" : "Free"}
                  </button>
                ))}
              </div>
            </FilterGroup>
          </GlassCard>
        </aside>

        {/* Main */}
        <div>
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div className="font-mono text-sm text-white/60">{filtered.length} {filtered.length === 1 ? "PLUGIN" : "PLUGINS"}</div>
            <select value={sort} onChange={(e) => setSort(e.target.value as any)} className="input-glass !py-2 !px-4 !w-auto !text-sm !font-mono">
              <option value="loaded">MOST LOADED</option>
              <option value="fresh">FRESH</option>
              <option value="low">PRICE: LOW → HIGH</option>
              <option value="high">PRICE: HIGH → LOW</option>
              <option value="sale">ON SALE</option>
            </select>
          </div>

          {filtered.length === 0 ? (
            <GlassCard className="p-12 text-center">
              <h3 className="font-black text-3xl mb-2">NOTHING IN THIS COMBO.</h3>
              <p className="text-white/60 mb-6">Loosen up the filters.</p>
              <button onClick={() => { setSelectedFormats([]); setSaleStatus("all"); setQuery(""); }} className="btn-ghost">CLEAR FILTERS</button>
            </GlassCard>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-8">
              {filtered.map((p) => <ProductCard key={p.slug} product={p} />)}
            </div>
          )}
        </div>
      </div>
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
        <button key={o} onClick={() => onToggle(o)} className={`px-3 py-1 rounded-full text-xs font-medium border transition ${selected.includes(o) ? "bg-[var(--accent-red)] border-[var(--accent-red)] text-white" : "border-white/15 text-white/70 hover:border-white/30"}`}>
          {o}
        </button>
      ))}
    </div>
  );
}
