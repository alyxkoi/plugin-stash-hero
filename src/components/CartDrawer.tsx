import { Link } from "@tanstack/react-router";
import { X, ShoppingCart } from "lucide-react";
import { useEffect } from "react";
import { useStore, actions } from "@/lib/store";
import { SALE } from "@/lib/mock-data";

export function CartDrawer() {
  const open = useStore((s) => s.cartOpen);
  const cart = useStore((s) => s.cart);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") actions.closeCart(); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [open]);

  if (!open) return null;

  const subtotal = cart.reduce((n, i) => n + i.product.price * i.qty, 0);
  const itemCount = cart.reduce((n, i) => n + i.qty, 0);

  return (
    <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true" aria-label="Cart">
      <div
        className="absolute inset-0 bg-black/55"
        style={{ backdropFilter: "blur(8px)" }}
        onClick={() => actions.closeCart()}
      />
      <div className="absolute top-0 right-0 h-full w-[92%] md:w-[440px] slide-in-right">
        <div className="h-full glass-card !rounded-none md:!rounded-l-3xl md:!rounded-r-none flex flex-col"
          style={{ background: "rgba(20,5,40,0.85)", backdropFilter: "blur(40px) saturate(180%)" }}>
          <div className="chromatic-edge" /><div className="glass-noise" />
          <div className="relative z-10 flex flex-col h-full">
            {/* Header */}
            <div className="p-5 border-b border-white/10 flex items-center justify-between">
              <div>
                <h2 className="font-black text-2xl">LOADED UP</h2>
                <div className="font-mono text-xs text-white/50">{itemCount} {itemCount === 1 ? "PLUGIN" : "PLUGINS"} LOADED</div>
              </div>
              <button onClick={() => actions.closeCart()} className="w-10 h-10 rounded-full border border-white/15 hover:border-white/30 flex items-center justify-center transition" aria-label="Close cart">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Sale banner */}
            {SALE.active && cart.length > 0 && (
              <div className="mx-5 mt-4 px-4 py-3 rounded-xl border border-[var(--accent-red)]/40 bg-[var(--accent-red)]/10 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[var(--accent-red)] pulse-dot" />
                <div className="font-mono text-xs">🌴 SUMMER STEALS — 35% OFF APPLIED AT CHECKOUT</div>
              </div>
            )}

            {/* Items */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center px-6">
                  <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-white/20 flex items-center justify-center mb-6">
                    <ShoppingCart className="w-8 h-8 text-white/30" />
                  </div>
                  <h3 className="font-black text-2xl mb-2">EMPTY. FIX THAT.</h3>
                  <p className="text-white/60 mb-6">Your DAW's waiting.</p>
                  <Link to="/shop" onClick={() => actions.closeCart()} className="btn-primary">
                    BROWSE THE WAREHOUSE →
                  </Link>
                </div>
              ) : (
                cart.map((item) => (
                  <div key={item.product.slug} className="flex gap-3 p-3 rounded-xl border border-white/8 bg-white/3">
                    <div className="w-16 h-16 rounded-lg shrink-0 flex items-center justify-center" style={{ background: item.product.coverGradient }}>
                      <span className="font-mono text-[8px] text-white/70 px-1 text-center leading-tight">{item.product.name}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-mono text-[9px] text-white/40 tracking-wider">// {item.product.maker.toUpperCase()}</div>
                      <div className="font-bold truncate">{item.product.name}</div>
                      <button onClick={() => actions.removeFromCart(item.product.slug)} className="text-xs text-white/50 hover:text-[var(--accent-red)] mt-1 transition">
                        Remove
                      </button>
                    </div>
                    <div className="font-mono font-bold">${item.product.price}</div>
                  </div>
                ))
              )}
            </div>

            {/* Totals + CTA */}
            {cart.length > 0 && (
              <div className="border-t border-white/10 p-5 space-y-4 safe-bottom">
                <div className="p-4 rounded-xl bg-white/3 border border-white/8 space-y-2 text-sm">
                  <Row label="Subtotal" value={`$${subtotal}`} />
                  {SALE.active && <Row label="Summer Steals 35%" value="applied at checkout" highlight />}
                  <div className="h-px bg-white/10 my-2" />
                  <div className="flex justify-between items-center">
                    <span className="font-bold">Total</span>
                    <span className="font-mono font-black text-2xl">${subtotal}</span>
                  </div>
                </div>
                <div className="font-mono text-[10px] text-white/50 text-center">🔒 Secure checkout · Instant delivery to your library</div>
                <button className="btn-primary w-full !text-base !py-4">CHECKOUT →</button>
                <div className="font-mono text-[10px] text-white/40 text-center">→ Powered by Stripe</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-white/60">{label}</span>
      <span className={`font-mono ${highlight ? "text-[var(--accent-red-glow)]" : ""}`}>{value}</span>
    </div>
  );
}
