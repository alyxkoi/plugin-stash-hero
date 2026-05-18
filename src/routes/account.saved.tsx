import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Heart, ShoppingBag } from "lucide-react";
import { GlassCard } from "@/components/GlassCard";
import { savedItems, getLibProduct, formatDate, type SavedItem } from "@/lib/account-data";
import { actions } from "@/lib/store";

export const Route = createFileRoute("/account/saved")({
  head: () => ({ meta: [{ title: "Saved For Later — Plugin Warehouse" }] }),
  component: SavedPage,
});

function SavedPage() {
  const [items, setItems] = useState<SavedItem[]>(savedItems);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const onSaleItems = items.filter(s => s.onSale);
  const totalValue = items.reduce((s, i) => {
    const p = getLibProduct(i.slug); return s + (p?.price ?? 0);
  }, 0);

  const toggleSel = (slug: string) => {
    setSelected(prev => {
      const n = new Set(prev);
      n.has(slug) ? n.delete(slug) : n.add(slug);
      return n;
    });
  };

  const remove = (slug: string) => setItems(items.filter(i => i.slug !== slug));
  const removeSelected = () => { setItems(items.filter(i => !selected.has(i.slug))); setSelected(new Set()); };
  const loadSelected = () => {
    items.filter(i => selected.has(i.slug)).forEach(i => { const p = getLibProduct(i.slug); if (p) actions.addToCart(p); });
    setSelected(new Set());
  };
  const loadAllOnSale = () => onSaleItems.forEach(i => { const p = getLibProduct(i.slug); if (p) actions.addToCart(p); });

  return (
    <div className="space-y-8">
      <header>
        <div className="font-mono text-xs tracking-[0.18em] text-[var(--accent-red-glow)] mb-3">// YOUR SAVED PLUGINS</div>
        <h1 className="font-black text-[clamp(2.25rem,5vw,4rem)] leading-[0.95] tracking-tight chrome-text">SAVED FOR LATER</h1>
        <div className="mt-4 font-mono text-[11px] tracking-[0.14em] text-white/55 flex flex-wrap gap-3">
          <span>{items.length} SAVED</span><span className="text-white/25">·</span>
          <span>{onSaleItems.length} ON SALE NOW</span><span className="text-white/25">·</span>
          <span>TOTAL: ${totalValue}</span>
        </div>
      </header>

      {onSaleItems.length > 0 && (
        <div className="glass-card p-4 md:p-5" style={{ background: "linear-gradient(90deg, rgba(255,0,60,0.20), rgba(255,0,60,0.06))" }}>
          <div className="chromatic-edge" /><div className="glass-noise" />
          <div className="relative z-10 flex items-center gap-4 flex-wrap">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-[var(--accent-red)] pulse-dot shadow-[0_0_12px_var(--accent-red)]" />
            <span className="font-mono text-[12px] tracking-[0.14em] font-bold flex-1">{onSaleItems.length} OF YOUR SAVED PLUGINS ARE 35% OFF RIGHT NOW</span>
            <button onClick={loadAllOnSale} className="btn-primary !text-xs !py-2 !px-4">LOAD THEM UP →</button>
          </div>
        </div>
      )}

      {items.length > 0 && (
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={selected.size === items.length && items.length > 0} onChange={(e) => setSelected(e.target.checked ? new Set(items.map(i => i.slug)) : new Set())} className="w-4 h-4 accent-[var(--accent-red)]" />
            <span className="font-mono text-xs tracking-wider text-white/65">SELECT ALL</span>
          </label>
          {selected.size > 0 && (
            <>
              <button onClick={loadSelected} className="btn-primary !text-xs !py-2 !px-4">LOAD UP SELECTED ({selected.size}) →</button>
              <button onClick={removeSelected} className="btn-ghost !text-xs !py-2 !px-4">REMOVE SELECTED</button>
            </>
          )}
        </div>
      )}

      {items.length === 0 ? (
        <GlassCard className="p-12 text-center">
          <Heart className="w-20 h-20 mx-auto mb-6 text-white/30" strokeWidth={1.2} />
          <h2 className="font-black text-3xl tracking-tight mb-2">NOTHING SAVED YET.</h2>
          <p className="text-white/65 mb-8">Tap the heart on anything you want to come back to. Or just keep loading up.</p>
          <Link to="/shop" className="btn-primary">BROWSE THE WAREHOUSE →</Link>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map(item => <SavedCard key={item.slug} item={item} selected={selected.has(item.slug)} onToggle={() => toggleSel(item.slug)} onRemove={() => remove(item.slug)} />)}
        </div>
      )}
    </div>
  );
}

function SavedCard({ item, selected, onToggle, onRemove }: { item: SavedItem; selected: boolean; onToggle: () => void; onRemove: () => void }) {
  const p = getLibProduct(item.slug)!;
  const onSale = item.onSale || (p.compareAtPrice && p.compareAtPrice > p.price);
  return (
    <div className={`glass-card p-4 flex flex-col h-full transition ${selected ? "ring-2 ring-[var(--accent-red)]" : ""}`}>
      <div className="chromatic-edge" /><div className="glass-noise" />
      <div className="relative z-10 flex flex-col h-full">
        <div className="relative aspect-square rounded-2xl overflow-hidden mb-4" style={{ background: p.coverGradient }}>
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="text-center">
              <div className="font-mono text-[10px] tracking-[0.2em] text-white/60 mb-1">// {p.maker.toUpperCase()}</div>
              <div className="font-black text-2xl chrome-text">{p.name}</div>
            </div>
          </div>
          {item.priceDropped && (
            <div className="absolute top-2 left-2 px-2 py-1 rounded-full font-mono text-[10px] font-bold bg-[var(--accent-red-glow)] text-white border border-white/30">↓ PRICE DROPPED</div>
          )}
          {item.onSale && !item.priceDropped && (
            <div className="absolute top-2 left-2 px-2 py-1 rounded-full font-mono text-[10px] font-bold bg-[var(--accent-red)] text-white border border-white/30">🌴 ON SALE</div>
          )}
        </div>
        <h3 className="font-bold text-base truncate">{p.name}</h3>
        <div className="font-mono text-[10px] tracking-wider text-white/55 mt-1 mb-3">
          {(p.subType || p.category).toUpperCase()} · {p.daws[0]?.toUpperCase() || "STANDALONE"}
        </div>
        <div className="mb-2">
          {onSale && p.compareAtPrice && <span className="font-mono text-xs text-white/40 line-through mr-2">${p.compareAtPrice}</span>}
          <span className="font-mono font-bold text-xl">${p.price}</span>
        </div>
        <div className="font-mono text-[10px] tracking-wider text-white/45 mb-4">SAVED {formatDate(item.savedAt).toUpperCase()}</div>
        <button onClick={() => actions.addToCart(p)} className="btn-primary w-full !rounded-xl !py-3 !text-sm mt-auto">LOAD UP →</button>
        <div className="flex items-center justify-between mt-3">
          <button onClick={onRemove} aria-label="Unsave" className="w-9 h-9 rounded-full border border-white/15 flex items-center justify-center hover:border-white/40">
            <Heart className="w-4 h-4 fill-[var(--accent-red)] text-[var(--accent-red)]" />
          </button>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={selected} onChange={onToggle} className="w-4 h-4 accent-[var(--accent-red)]" />
            <span className="font-mono text-[10px] tracking-wider text-white/55">SELECT</span>
          </label>
        </div>
      </div>
    </div>
  );
}
