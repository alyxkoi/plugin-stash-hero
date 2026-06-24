import { Link } from "@tanstack/react-router";
import { Heart, ShoppingCart } from "lucide-react";
import type { Product } from "@/lib/mock-data";
import { useStore, actions } from "@/lib/store";

export function ProductCard({ product, variant = "default", rank }: { product: Product; variant?: "default" | "blue"; rank?: number }) {
  const wished = useStore((s) => s.wishlist.includes(product.slug));

  const onSale = product.compareAtPrice && product.compareAtPrice > product.price;

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
                  <div className="font-mono text-[10px] tracking-[0.2em] text-white/60 mb-1">{product.maker.toUpperCase()}</div>
                  <div className="font-black text-2xl leading-tight chrome-text">{product.name}</div>
                </div>
              </div>
            )}
            {/* breathing red glow inner */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-0 glow-breathe" style={{ background: "radial-gradient(ellipse at center, rgba(255,0,60,0.35), transparent 65%)" }} />
            </div>
            {onSale && (
              <div className="absolute top-2 right-2 px-2 py-1 rounded-md font-mono text-[10px] font-bold bg-[var(--accent-red)] text-white shadow-lg">
                35% OFF
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
            {product.formats.slice(0, 2).map((f) => (
              <span key={f} className="font-mono text-[9px] tracking-wider px-2 py-0.5 rounded-full border border-white/15 text-white/60">{f}</span>
            ))}
          </div>
        </Link>
        <div className="mt-auto flex items-end justify-between pt-2">
          <div>
            {onSale && (
              <div className="font-mono text-xs text-white/40 line-through">${product.compareAtPrice}</div>
            )}
            <div className="font-mono font-bold text-xl">{product.isFree ? "FREE" : `$${product.price}`}</div>
          </div>
          <div className="flex gap-2 items-center">
            <button
              onClick={(e) => { e.preventDefault(); actions.toggleWishlist(product.slug); }}
              className="p-2 rounded-full hover:bg-white/5 transition"
              aria-label="Save"
            >
              <Heart className={`w-5 h-5 ${wished ? "fill-[var(--accent-red)] text-[var(--accent-red)]" : "text-white/80"}`} />
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
