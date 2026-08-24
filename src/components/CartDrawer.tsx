import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Lock, X, ShoppingCart, Tag } from "lucide-react";
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useStore, actions } from "@/lib/store";
import { validateDiscount } from "@/lib/checkout.functions";
import { pickSaleFor, useAllActiveSales } from "@/lib/sale-pricing";
import { ProductArtwork } from "./ProductArtwork";

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
  // `retail` is the compare-at price when set (else my price) — display only.
  // `unit` is what Stripe actually charges (my price minus any active sale %).
  const priced = cart.map((i) => {
    const hit = pickSaleFor(sales, i.product);
    const unit = hit ? Math.round(i.product.price * (100 - hit.pct)) / 100 : i.product.price;
    const retail = i.product.compareAtPrice && i.product.compareAtPrice > i.product.price
      ? i.product.compareAtPrice
      : i.product.price;
    return { ...i, unit, retail, salePct: hit?.pct ?? 0 };
  });
  const subtotal = priced.reduce((n, i) => n + i.unit * i.qty, 0);
  const warehouseSubtotal = priced.reduce((n, i) => n + i.product.price * i.qty, 0);
  const retailTotal = priced.reduce((n, i) => n + i.retail * i.qty, 0);
  const saleSavings = priced.reduce((n, i) => n + (i.product.price - i.unit) * i.qty, 0);
  // Discount only applies to items in scope.
  const eligibleSubtotal = !discount
    ? subtotal
    : priced.reduce((n, i) => {
        const scope = discount.scope ?? "all";
        const pid = (i.product.id ?? "") as string;
        const pcat = (i.product.category ?? "").toLowerCase();
        const cats = (discount.categories ?? []).map((c) => c.toLowerCase());
        const ids = discount.productIds ?? [];
        const eligible =
          scope === "all" ||
          (scope === "categories" && !!pcat && cats.includes(pcat)) ||
          (scope === "selected" && !!pid && ids.includes(pid));
        return eligible ? n + i.unit * i.qty : n;
      }, 0);
  const discountAmount = !discount
    ? 0
    : discount.type === "percent"
      ? Math.min(eligibleSubtotal, (eligibleSubtotal * discount.value) / 100)
      : Math.min(eligibleSubtotal, discount.value);
  const total = Math.max(0, warehouseSubtotal - saleSavings - discountAmount);
  const totalSavedVsRetail = Math.max(0, retailTotal - total);
  const itemCount = cart.reduce((n, i) => n + i.qty, 0);


  async function applyCode(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim() || applying) return;
    setApplying(true); setCodeError(null);
    try {
      const res = await validateDiscount({ data: { code: code.trim(), subtotal } });
      if ("ok" in res && res.ok) {
        actions.setDiscount({
          code: res.code,
          type: res.type,
          value: res.value,
          scope: res.scope,
          categories: res.categories,
          productIds: res.productIds,
        });
        setCode("");
      } else {
        setCodeError((res as any).error ?? "That code isn't valid.");
      }
    } catch (err) {
      setCodeError(err instanceof Error ? err.message : "Couldn't validate that code.");
    } finally { setApplying(false); }
  }

  // Ensure the CHECKOUT button never stays stuck in "OPENING CHECKOUT…" if
  // the user closes/reopens the drawer or navigation is interrupted.
  useEffect(() => {
    if (!open && goingToCheckout) {
      const t = setTimeout(() => setGoingToCheckout(false), 800);
      return () => clearTimeout(t);
    }
  }, [open, goingToCheckout]);

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
        <div className="h-full pwh-cart-panel flex flex-col">
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
                    <ProductArtwork src={item.product.coverUrl} name={item.product.name} gradient={item.product.coverGradient} className="w-16 h-16 !rounded-lg shrink-0 !p-1.5" />
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
                      {item.retail > item.unit && (
                        <div className="font-mono text-[10px] text-white/40 line-through">${(item.retail * item.qty).toFixed(2)}</div>
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
                  {retailTotal > warehouseSubtotal && (
                    <Row label="Retail total" value={<span className="line-through text-white/50">${retailTotal.toFixed(2)}</span>} />
                  )}
                  <Row label="Warehouse subtotal" value={`$${warehouseSubtotal.toFixed(2)}`} />
                  {saleSavings > 0 && <Row label="Sale discount" value={`-$${saleSavings.toFixed(2)}`} highlight />}
                  {discountAmount > 0 && <Row label={`Code ${discount?.code ?? ""}`} value={`-$${discountAmount.toFixed(2)}`} highlight />}
                  <div className="h-px bg-white/10 my-2" />
                  <div className="flex justify-between items-center">
                    <span className="font-bold">Total</span>
                    <span className="font-mono font-black text-2xl">${total.toFixed(2)}</span>
                  </div>
                  {totalSavedVsRetail > 0 && (
                    <div className="mt-2 flex justify-between items-center rounded-lg bg-emerald-500/10 border border-emerald-500/25 px-3 py-2">
                      <span className="font-mono text-[11px] uppercase tracking-wider text-emerald-300">You save vs retail</span>
                      <span className="font-mono font-bold text-emerald-300">${totalSavedVsRetail.toFixed(2)}</span>
                    </div>
                  )}
                </div>

                <div className="font-mono text-[10px] text-white/50 text-center flex items-center justify-center gap-1.5"><Lock className="w-3 h-3" /> Secure checkout · Instant delivery to your library</div>
                <button onClick={goCheckout} disabled={goingToCheckout} className="btn-primary w-full !text-base !py-4 disabled:opacity-70">
                  {goingToCheckout ? "OPENING CHECKOUT…" : <><span>CHECKOUT</span><ArrowRight className="w-4 h-4" /></>}
                </button>
                <div className="font-mono text-[10px] text-white/40 text-center">Powered by Stripe</div>
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

function Row({ label, value, highlight }: { label: string; value: React.ReactNode; highlight?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-white/60">{label}</span>
      <span className={`font-mono ${highlight ? "text-emerald-400" : ""}`}>{value}</span>
    </div>
  );
}

