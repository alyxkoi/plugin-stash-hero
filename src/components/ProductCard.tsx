import { Link } from "@tanstack/react-router";
import { Heart, ShoppingCart, Check } from "lucide-react";
import type { Product } from "@/lib/mock-data";
import { actions, useStore } from "@/lib/store";
import { useSavedIds, useToggleSaved } from "@/hooks/useSaved";
import { useSalePricing } from "@/lib/sale-pricing";
import { ProductArtwork } from "./ProductArtwork";
import { ProductPrice } from "./ProductPrice";

export function ProductCard({ product, variant = "default", rank }: { product: Product; variant?: "default" | "blue"; rank?: number }) {
  const { data: savedIds } = useSavedIds();
  const toggleSaved = useToggleSaved();
  const saved = !!(product.id && savedIds?.has(product.id));
  const inCart = useStore((s) => s.cart.some((i) => i.product.slug === product.slug));


  const { pct, sale } = useSalePricing(product);
  const hasCompareAt = !!(product.compareAtPrice && product.compareAtPrice > product.price);
  const onSale = pct > 0 || hasCompareAt;
  const fallbackPct = hasCompareAt
    ? Math.round((1 - product.price / (product.compareAtPrice as number)) * 100)
    : 0;
  const badgePct = pct > 0 ? pct : fallbackPct;
  const badgeText = badgePct > 0 ? `EXTRA ${badgePct}% OFF` : "";



  return (
    <article className={`product-card group ${variant === "blue" ? "product-card--indigo" : ""} h-full flex flex-col`}>
      <div className="relative z-10 p-3 sm:p-4 flex flex-col h-full">
        <Link to="/shop/p/$slug" params={{ slug: product.slug }} className="block">
          <ProductArtwork src={product.coverUrl} name={product.name} gradient={product.coverGradient} className="aspect-[4/3] mb-4">
            {onSale && !product.isFree && (
              <div className="pwh-art-badge absolute top-2 right-2" title={sale?.name}>
                {badgeText}
              </div>
            )}
            {rank && (
              <div className="pwh-art-rank absolute top-2 left-2">
                {rank}
              </div>
            )}
            {product.isFree && (
              <div className="pwh-art-badge pwh-art-badge--indigo absolute top-2 right-2">
                FREE
              </div>
            )}
          </ProductArtwork>
          {product.maker.trim().toLowerCase() !== "plugin warehouse" && (
            <div className="font-mono text-[10px] tracking-[0.15em] text-[var(--text-3)] mb-1 uppercase truncate">{product.maker}</div>
          )}
          <h3 className="font-bold text-base sm:text-lg leading-tight mb-2 line-clamp-2">{product.name}</h3>
          <div className="flex flex-wrap gap-1 mb-3">
            {product.category !== "libraries" && product.formats.slice(0, 2).map((f) => (
              <span key={f} className="pwh-dark-chip font-mono text-[9px] tracking-wider px-2 py-1">{f}</span>
            ))}
          </div>
        </Link>
        <div className="mt-auto flex items-end justify-between pt-2">
          <ProductPrice product={product} currentClassName="font-mono font-bold text-xl" retailClassName="font-mono text-xs text-white/40" />
          <div className="flex gap-2 items-center">
            <button
              onClick={(e) => { e.preventDefault(); toggleSaved.mutate(product); }}
              className="pwh-icon-button"
              aria-label={saved ? "Remove from saved" : "Save"}
            >
              <Heart className={`w-5 h-5 ${saved ? "fill-[var(--accent-red)] text-[var(--accent-red)]" : "text-white/80"}`} />
            </button>
            <button
              onClick={() => actions.addToCart(product)}
              className="btn-primary !py-2 !px-3"
              aria-label={inCart ? "Already in cart" : "Add to cart"}
              title={inCart ? "Already in your cart" : "Add to cart"}
            >
              {inCart ? <Check className="w-4 h-4" strokeWidth={2.2} /> : <ShoppingCart className="w-4 h-4" strokeWidth={2.2} />}
            </button>

          </div>
        </div>
      </div>
    </article>
  );
}
