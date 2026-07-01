import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ProductCard } from "./ProductCard";
import { GlassCard } from "./GlassCard";
import { categories, type Category, type Product, SALE } from "@/lib/mock-data";
import { supabase } from "@/integrations/supabase/client";

type Row = {
  slug: string; name: string; maker: string; category: string;
  formats: string[] | null; daws: string[] | null; version: string | null;
  price: number; compare_at_price: number | null; description: string | null;
  cover_url: string | null; cover_gradient: string | null;
  is_free: boolean | null; updated_at: string;
};

async function fetchPublished(): Promise<Product[]> {
  const { data, error } = await supabase
    .from("products")
    .select("slug,name,maker,category,formats,daws,version,price,compare_at_price,description,cover_url,cover_gradient,is_free,updated_at")
    .eq("status", "published")
    .order("published_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data as Row[] ?? []).map(r => ({
    slug: r.slug,
    name: r.name,
    maker: r.maker || "",
    category: (r.category as Category),
    daws: r.daws ?? [],
    formats: r.formats ?? [],
    version: r.version ?? "1.0",
    fileSize: "—",
    updated: new Date(r.updated_at).toLocaleDateString(undefined, { month: "short", year: "numeric" }),
    price: Number(r.price) || 0,
    compareAtPrice: r.compare_at_price ? Number(r.compare_at_price) : undefined,
    tagline: "",
    description: r.description ?? "",
    coverGradient: r.cover_gradient ?? "linear-gradient(135deg,#3a0a4a,#7b0a5a)",
    coverUrl: r.cover_url,
    isFree: !!r.is_free,
  }));
}

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
  const reduce = useReducedMotion();

  const { data: ALL = [], isLoading } = useQuery({
    queryKey: ["storefront-products"],
    queryFn: fetchPublished,
    staleTime: 30_000,
  });

  const allFormats = ["VST", "VST3", "AU", "AAX", "Standalone"];

  const filtered = useMemo(() => {
    let r: Product[] = [...ALL];
    if (selectedCats.length) r = r.filter((p) => selectedCats.includes(p.category));
    if (query) r = r.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()) || p.maker.toLowerCase().includes(query.toLowerCase()));
    if (selectedFormats.length) r = r.filter((p) => p.formats.some((f) => selectedFormats.includes(f)));
    if (saleStatus === "sale") r = r.filter((p) => p.compareAtPrice && p.compareAtPrice > p.price);
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
  }, [query, selectedCats, selectedFormats, saleStatus, priceSort]);

  const togglePill = <T,>(list: T[], v: T, set: (l: T[]) => void) =>
    set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  const showFormat = !initialOnSale && !["software", "freebies"].includes(category || "");
  const resultMotionKey = `${query}|${selectedCats.join(",")}|${selectedFormats.join(",")}|${saleStatus}|${priceSort}`;

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
              <button onClick={() => { setSelectedCats(category ? [category] : []); setSelectedFormats([]); setSaleStatus("all"); setQuery(""); setPriceSort("none"); }} className="text-xs text-white/50 hover:text-white">CLEAR</button>
            </div>
            <input className="input-glass mb-5" placeholder={`Search within ${category || "warehouse"}`} value={query} onChange={(e) => setQuery(e.target.value)} />

            {!category && (
              <FilterGroup title="Category">
                {categories.map((c) => (
                  <label key={c.slug} className="flex items-center text-sm py-1.5 cursor-pointer hover:text-white text-white/70">
                    <span className="flex items-center gap-2">
                      <input type="checkbox" checked={selectedCats.includes(c.slug)} onChange={() => togglePill(selectedCats, c.slug, setSelectedCats)} className="accent-[var(--accent-red)]" />
                      {c.name}
                    </span>
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

            <FilterGroup title="Sort by Price">
              <div className="flex gap-1 p-1 rounded-full bg-white/5 border border-white/10">
                {([
                  { v: "none", l: "None" },
                  { v: "low", l: "Low → High" },
                  { v: "high", l: "High → Low" },
                ] as const).map((opt) => (
                  <button key={opt.v} onClick={() => setPriceSort(opt.v)} className={`flex-1 py-1.5 rounded-full text-[11px] font-bold uppercase transition ${priceSort === opt.v ? "bg-[var(--accent-red)] text-white" : "text-white/60"}`}>
                    {opt.l}
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
          </div>

          <AnimatePresence mode="sync" initial={false}>
            <motion.div
              key={resultMotionKey}
              initial={reduce ? false : { opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={reduce ? undefined : { opacity: 0, x: -16 }}
              transition={{ duration: reduce ? 0 : 0.22, ease: [0.19, 1, 0.22, 1] }}
            >
              {filtered.length === 0 ? (
                <GlassCard className="p-12 text-center">
                  <h3 className="font-black text-3xl mb-2">NOTHING IN THIS COMBO.</h3>
                  <p className="text-white/60 mb-6">Loosen up the filters.</p>
                  <button onClick={() => { setSelectedFormats([]); setSaleStatus("all"); setQuery(""); setPriceSort("none"); }} className="btn-ghost">CLEAR FILTERS</button>
                </GlassCard>
              ) : (
                <div className="grid grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
                  {filtered.map((p) => <ProductCard key={p.slug} product={p} />)}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
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
