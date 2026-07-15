import { Link } from "@tanstack/react-router";
import { Heart, ShoppingCart, Check } from "lucide-react";
import type { Product } from "@/lib/mock-data";
import { actions } from "@/lib/store";
import { useSavedIds, useToggleSaved } from "@/hooks/useSaved";
import { useSalePricing } from "@/lib/sale-pricing";

export function ProductCard({ product, variant = "default", rank }: { product: Product; variant?: "default" | "blue"; rank?: number }) {
  const { data: savedIds } = useSavedIds();
  const toggleSaved = useToggleSaved();
  const saved = !!(product.id && savedIds?.has(product.id));

  const { finalPrice, pct, sale } = useSalePricing(product);
  const hasCompareAt = !!(product.compareAtPrice && product.compareAtPrice > product.price);
  const onSale = pct > 0 || hasCompareAt;
  const displayPrice = pct > 0 ? finalPrice : product.price;
  // Always prefer the compare-at (retail) as the strike so the saving looks as
  // big as it really is; only fall back to my price when no retail is set.
  const strikePrice = hasCompareAt ? product.compareAtPrice : (pct > 0 ? product.price : undefined);
  const fallbackPct = hasCompareAt
    ? Math.round((1 - product.price / (product.compareAtPrice as number)) * 100)
    : 0;
  const badgePct = pct > 0 ? pct : fallbackPct;
  const badgeText = badgePct > 0 ? `EXTRA ${badgePct}% OFF` : "";



  return (
    <div className={`glass-card product-card group ${variant === "blue" ? "glass-card--blue" : ""} h-full flex flex-col`}>
      <div className="chromatic-edge" />
      <div className="glass-noise" />
      <div className="relative z-10 p-4 flex flex-col h-full">
        <Link to="/shop/p/$slug" params={{ slug: product.slug }} className="block">
          <div className="relative aspect-square rounded-2xl overflow-hidden mb-4" style={{ background: product.coverGradient }}>
            {product.coverUrl ? (
              <img src={product.coverUrl} alt={product.name} loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center p-4">
                <div className="text-center">
                  <div className="font-black text-2xl leading-tight chrome-text">{product.name}</div>
                </div>
              </div>

            )}
            {onSale && !product.isFree && (
              <div className="absolute top-2 right-2 px-2 py-1 rounded-md font-mono text-[10px] font-bold bg-[var(--accent-red)] text-white shadow-lg" title={sale?.name}>
                {badgeText}
              </div>
            )}
            {rank && (
              <div className="absolute top-2 left-2 w-8 h-8 rounded-full flex items-center justify-center font-black text-lg chrome-text bg-black/40 backdrop-blur-md border border-white/20">
                {rank}
              </div>
            )}
            {product.isFree && (
              <div className="absolute top-2 right-2 px-2 py-1 rounded-md font-mono text-[10px] font-bold bg-[var(--accent-blue)] text-white">
                FREE
              </div>
            )}
          </div>
          <div className="font-mono text-[10px] tracking-[0.15em] text-[var(--accent-red-glow)] mb-1">{product.maker.toUpperCase()}</div>
          <h3 className="font-bold text-lg leading-tight mb-2 group-hover:text-white">{product.name}</h3>
          <div className="flex flex-wrap gap-1 mb-3">
            {product.category !== "libraries" && product.formats.slice(0, 2).map((f) => (
              <span key={f} className="font-mono text-[9px] tracking-wider px-2 py-0.5 rounded-full border border-white/15 text-white/60">{f}</span>
            ))}
          </div>
        </Link>
        <div className="mt-auto flex items-end justify-between pt-2">
          <div>
            {onSale && !product.isFree && strikePrice && (
              <div className="font-mono text-xs text-white/40 line-through">${strikePrice}</div>
            )}
            <div className="font-mono font-bold text-xl">{product.isFree ? "FREE" : `$${displayPrice.toFixed(2)}`}</div>
          </div>
          <div className="flex gap-2 items-center">
            <button
              onClick={(e) => { e.preventDefault(); toggleSaved.mutate(product); }}
              className="p-2 rounded-full hover:bg-white/5 transition"
              aria-label={saved ? "Remove from saved" : "Save"}
            >
              <Heart className={`w-5 h-5 ${saved ? "fill-[var(--accent-red)] text-[var(--accent-red)]" : "text-white/80"}`} />
            </button>
            <button
              onClick={() => actions.addToCart(product)}
              className="btn-primary !py-2 !px-3"
              aria-label="Add to cart"
            >
              <ShoppingCart className="w-4 h-4" strokeWidth={2.2} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
