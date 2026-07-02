import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { createCheckoutSession } from "@/lib/checkout.functions";
import { useAuth } from "@/hooks/useAuth";
import { useStore } from "@/lib/store";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";

export const Route = createFileRoute("/checkout/")({
  head: () => ({ meta: [{ title: "Checkout — Plugin Warehouse" }] }),
  component: CheckoutPage,
});

function CheckoutPage() {
  const { user, loading } = useAuth();
  const cart = useStore((s) => s.cart);
  const discount = useStore((s) => s.discount);
  const navigate = useNavigate();

  const utmSource = useMemo(() => {
    if (typeof window === "undefined") return null;
    return new URLSearchParams(window.location.search).get("utm_source");
  }, []);

  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [guestEmail, setGuestEmail] = useState("");
  const [emailConfirmed, setEmailConfirmed] = useState(false);
  const [creating, setCreating] = useState(false);
  const startedRef = useRef(false);

  const needsEmail = !loading && !user && !emailConfirmed;

  async function startSession(email?: string | null) {
    if (startedRef.current) return;
    startedRef.current = true;
    setCreating(true);
    setError(null);
    const items = cart
      .filter((i) => i.product.id)
      .map((i) => ({ productId: i.product.id!, qty: i.qty }));
    if (items.length === 0) {
      setError("Your cart items are missing product IDs. Try re-adding them.");
      setCreating(false);
      startedRef.current = false;
      return;
    }
    try {
      const result = await createCheckoutSession({
        data: {
          items,
          discountCode: discount?.code ?? null,
          utmSource,
          email: email ?? (user?.email ?? null),
          returnUrl: `${window.location.origin}/checkout/return`,
          environment: getStripeEnvironment(),
        },
      });
      if ("error" in result) {
        setError(result.error);
        startedRef.current = false;
      } else {
        setClientSecret(result.clientSecret);
      }
    } catch (e: any) {
      setError(e?.message ?? "Failed to start checkout.");
      startedRef.current = false;
    } finally {
      setCreating(false);
    }
  }

  // Auto-start for logged-in users
  useEffect(() => {
    if (loading || cart.length === 0) return;
    if (user && !clientSecret && !startedRef.current) startSession(user.email ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading, cart.length]);

  if (loading) return <CheckoutFrame><p className="text-white/60">Loading…</p></CheckoutFrame>;

  if (cart.length === 0) {
    return (
      <CheckoutFrame>
        <h1 className="font-display text-3xl mb-3">Your cart is empty</h1>
        <p className="text-white/60 mb-6">Add some plugins and come back.</p>
        <Link to="/shop" className="btn-primary">Browse the warehouse →</Link>
      </CheckoutFrame>
    );
  }

  // Guest email gate — no sign-up required
  if (needsEmail) {
    return (
      <GuestGateFrame>
        <div className="font-mono text-xs tracking-[0.2em] text-[var(--accent-red-glow)] mb-3">CHECKOUT</div>
        <h1 className="font-black text-4xl md:text-5xl chrome-text mb-2">GUEST CHECKOUT.</h1>
        <p className="text-white/65 mb-8">We'll send your receipt and download links here. No account needed.</p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail)) {
              setError("Enter a valid email.");
              return;
            }
            setEmailConfirmed(true);
            startSession(guestEmail);
          }}
          className="text-left"
        >
          <label className="block mb-4">
            <div className="font-mono text-xs text-white/60 mb-1.5 tracking-wider">EMAIL</div>
            <input
              type="email"
              required
              autoFocus
              value={guestEmail}
              onChange={(e) => { setGuestEmail(e.target.value); setError(null); }}
              placeholder="you@email.com"
              className="input-glass"
            />
          </label>
          {error && <div className="text-xs text-[var(--accent-red-glow)] font-mono mb-3">{error}</div>}
          <button type="submit" className="btn-primary w-full !text-base !py-4">CONTINUE TO PAYMENT →</button>
        </form>
        <div className="text-center text-xs text-white/50 mt-6">
          Have an account?{" "}
          <Link to="/login" search={{ next: "/checkout" } as any} className="text-[var(--accent-red-glow)] font-bold hover:underline">SIGN IN →</Link>
        </div>
      </GuestGateFrame>
    );
  }

  if (error) {
    return (
      <CheckoutFrame>
        <h1 className="font-display text-3xl mb-3">Checkout hit a snag</h1>
        <p className="text-[var(--accent-red-glow)] mb-6">{error}</p>
        <button onClick={() => { startedRef.current = false; startSession(guestEmail || user?.email); }} className="btn-primary mr-2">Try again</button>
        <Link to="/shop" className="btn-ghost">Back to shop</Link>
      </CheckoutFrame>
    );
  }

  if (!clientSecret) {
    return (
      <CheckoutFrame>
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full border-2 border-white/20 border-t-white animate-spin" />
          <p className="text-white/70">{creating ? "Preparing secure checkout…" : "Loading…"}</p>
        </div>
      </CheckoutFrame>
    );
  }

  return (
    <>
      <PaymentTestModeBanner />
      <div className="min-h-screen bg-[var(--bg,#0b0316)] pt-6 pb-16">
        <div className="max-w-3xl mx-auto px-4">
          <Link to="/shop" className="text-white/50 text-sm hover:text-white">← Keep shopping</Link>
          <h1 className="font-display text-4xl mt-3 mb-6">Checkout</h1>
          <div id="checkout" className="rounded-2xl overflow-hidden bg-white">
            <EmbeddedCheckoutProvider stripe={getStripe()} options={{ fetchClientSecret: async () => clientSecret }}>
              <EmbeddedCheckout />
            </EmbeddedCheckoutProvider>
          </div>
        </div>
      </div>
    </>
  );
}

function CheckoutFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--bg,#0b0316)] pt-24 pb-16">
      <div className="max-w-md mx-auto px-4 text-center">{children}</div>
    </div>
  );
}

function GuestGateFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--bg,#0b0316)] flex items-center justify-center px-4 py-16 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at center, rgba(255,0,60,0.18), transparent 60%)" }} />
      <div className="relative w-full max-w-md">
        <div className="absolute inset-0 glow-breathe pointer-events-none" style={{ background: "radial-gradient(ellipse at center, rgba(255,0,60,0.45), transparent 65%)", filter: "blur(40px)" }} />
        <div className="glass-card glass-card--heavy p-8 md:p-10 relative">
          <div className="chromatic-edge" />
          <div className="glass-noise" />
          <div className="relative z-10">{children}</div>
        </div>
        <div className="text-center mt-4 font-mono text-xs text-white/40">
          Secure checkout · Powered by Stripe
        </div>
      </div>
    </div>
  );
}
