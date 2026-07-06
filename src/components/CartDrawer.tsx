import { Link, useNavigate } from "@tanstack/react-router";
import { X, ShoppingCart, Tag } from "lucide-react";
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useStore, actions } from "@/lib/store";
import { validateDiscount } from "@/lib/checkout.functions";
import { pickSaleFor, useAllActiveSales } from "@/lib/sale-pricing";

export function CartDrawer() {
  const open = useStore((s) => s.cartOpen);
  const cart = useStore((s) => s.cart);
  const discount = useStore((s) => s.discount);
  const { sales } = useAllActiveSales();
  const reduce = useReducedMotion();
  const navigate = useNavigate();

  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const [goingToCheckout, setGoingToCheckout] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") actions.closeCart(); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [open]);

  // Effective unit price per item after any active sale-event discount.
  const priced = cart.map((i) => {
    const hit = pickSaleFor(sales, i.product);
    const unit = hit ? Math.round(i.product.price * (100 - hit.pct)) / 100 : i.product.price;
    return { ...i, unit, salePct: hit?.pct ?? 0 };
  });
  const subtotal = priced.reduce((n, i) => n + i.unit * i.qty, 0);
  const saleSavings = priced.reduce((n, i) => n + (i.product.price - i.unit) * i.qty, 0);
  const discountAmount = !discount
    ? 0
    : discount.type === "percent"
      ? Math.min(subtotal, (subtotal * discount.value) / 100)
      : Math.min(subtotal, discount.value);
  const total = Math.max(0, subtotal - discountAmount);
  const itemCount = cart.reduce((n, i) => n + i.qty, 0);

  async function applyCode(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim() || applying) return;
    setApplying(true); setCodeError(null);
    try {
      const res = await validateDiscount({ data: { code: code.trim(), subtotal } });
      if ("ok" in res && res.ok) {
        actions.setDiscount({ code: res.code, type: res.type, value: res.value });
        setCode("");
      } else {
        setCodeError((res as any).error ?? "That code isn't valid.");
      }
    } catch (err) {
      setCodeError(err instanceof Error ? err.message : "Couldn't validate that code.");
    } finally { setApplying(false); }
  }

  function goCheckout() {
    if (goingToCheckout) return;
    setGoingToCheckout(true);
    actions.closeCart();
    navigate({ to: "/checkout" });
  }

  return (
    <AnimatePresence>
      {open && (
    <motion.div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true" aria-label="Cart">
      <motion.div
        className="absolute inset-0 bg-black/55"
        style={{ backdropFilter: "blur(8px)" }}
        onClick={() => actions.closeCart()}
        initial={reduce ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: reduce ? 0 : 0.28, ease: [0.19, 1, 0.22, 1] }}
      />
      <motion.div
        className="absolute top-0 right-0 h-full w-[92%] md:w-[440px]"
        initial={reduce ? false : { x: "100%", opacity: 0.7 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: "100%", opacity: 0.8 }}
        transition={{ duration: reduce ? 0 : 0.32, ease: [0.19, 1, 0.22, 1] }}
      >
        <div className="h-full glass-card !rounded-none md:!rounded-l-3xl md:!rounded-r-none flex flex-col"
          style={{ background: "rgba(20,5,40,0.85)", backdropFilter: "blur(40px) saturate(180%)" }}>
          <div className="chromatic-edge" /><div className="glass-noise" />
          <div className="relative z-10 flex flex-col h-full">
            <div className="p-5 border-b border-white/10 flex items-center justify-between">
              <div>
                <h2 className="font-black text-2xl">LOADED UP</h2>
                <div className="font-mono text-xs text-white/50">{itemCount} {itemCount === 1 ? "PLUGIN" : "PLUGINS"} LOADED</div>
              </div>
              <button onClick={() => actions.closeCart()} className="w-10 h-10 rounded-full border border-white/15 hover:border-white/30 flex items-center justify-center transition" aria-label="Close cart">
                <X className="w-5 h-5" />
              </button>
            </div>

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
                priced.map((item) => (
                  <div key={item.product.slug} className="flex gap-3 p-3 rounded-xl border border-white/8 bg-white/3">
                    <div
                      className="w-16 h-16 rounded-lg shrink-0 overflow-hidden relative flex items-center justify-center"
                      style={{ background: item.product.coverGradient }}
                    >
                      {item.product.coverUrl ? (
                        <img src={item.product.coverUrl} alt={item.product.name} loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
                      ) : (
                        <span className="font-mono text-[8px] text-white/70 px-1 text-center leading-tight">{item.product.name}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-mono text-[9px] text-white/40 tracking-wider">{item.product.maker.toUpperCase()}</div>
                      <div className="font-bold truncate">{item.product.name}</div>
                      {item.salePct > 0 && (
                        <div className="font-mono text-[10px] text-[var(--accent-red-glow)] mt-0.5">{item.salePct}% off applied</div>
                      )}
                      <button onClick={() => actions.removeFromCart(item.product.slug)} className="text-xs text-white/50 hover:text-[var(--accent-red)] mt-1 transition">
                        Remove
                      </button>
                    </div>
                    <div className="text-right">
                      {item.salePct > 0 && (
                        <div className="font-mono text-[10px] text-white/40 line-through">${(item.product.price * item.qty).toFixed(2)}</div>
                      )}
                      <div className="font-mono font-bold">${(item.unit * item.qty).toFixed(2)}</div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {cart.length > 0 && (
              <div className="border-t border-white/10 p-5 space-y-4 safe-bottom">
                {/* Discount */}
                {discount ? (
                  <div className="flex items-center justify-between p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5">
                    <div className="flex items-center gap-2 text-sm">
                      <Tag className="w-4 h-4 text-emerald-400" />
                      <span className="font-mono">{discount.code}</span>
                      <span className="text-white/50">
                        {discount.type === "percent" ? `${discount.value}% off` : `$${discount.value} off`}
                      </span>
                    </div>
                    <button onClick={() => actions.setDiscount(null)} className="text-xs text-white/50 hover:text-white">Remove</button>
                  </div>
                ) : (
                  <form onSubmit={applyCode} className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        value={code}
                        onChange={(e) => { setCode(e.target.value); setCodeError(null); }}
                        placeholder="Discount code"
                        className="flex-1 bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-sm outline-none focus:border-white/40 font-mono"
                      />
                      <button type="submit" disabled={applying || !code.trim()} className="btn-ghost !text-xs !py-2 !px-4 disabled:opacity-50">
                        {applying ? "…" : "APPLY"}
                      </button>
                    </div>
                    {codeError && <div className="text-xs text-[var(--accent-red-glow)] font-mono">{codeError}</div>}
                  </form>
                )}

                <div className="p-4 rounded-xl bg-white/3 border border-white/8 space-y-2 text-sm">
                  <Row label="Subtotal" value={`$${subtotal.toFixed(2)}`} />
                  {discountAmount > 0 && <Row label="Discount" value={`-$${discountAmount.toFixed(2)}`} highlight />}
                  <div className="h-px bg-white/10 my-2" />
                  <div className="flex justify-between items-center">
                    <span className="font-bold">Total</span>
                    <span className="font-mono font-black text-2xl">${total.toFixed(2)}</span>
                  </div>
                </div>
                <div className="font-mono text-[10px] text-white/50 text-center">🔒 Secure checkout · Instant delivery to your library</div>
                <button onClick={goCheckout} disabled={goingToCheckout} className="btn-primary w-full !text-base !py-4 disabled:opacity-70">
                  {goingToCheckout ? "OPENING CHECKOUT…" : "CHECKOUT →"}
                </button>
                <div className="font-mono text-[10px] text-white/40 text-center">→ Powered by Stripe</div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
      )}
    </AnimatePresence>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-white/60">{label}</span>
      <span className={`font-mono ${highlight ? "text-emerald-400" : ""}`}>{value}</span>
    </div>
  );
}
