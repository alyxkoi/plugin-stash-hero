import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { createCheckoutSession } from "@/lib/checkout.functions";
import { useAuth } from "@/hooks/useAuth";
import { useStore } from "@/lib/store";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";

export const Route = createFileRoute("/checkout")({
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

  useEffect(() => {
    if (loading) return;
    if (!user) {
      const next = encodeURIComponent("/checkout");
      navigate({ to: "/login", search: { next } as any });
      return;
    }
    if (cart.length === 0) return;

    let cancelled = false;
    (async () => {
      const items = cart
        .filter((i) => i.product.id)
        .map((i) => ({ productId: i.product.id!, qty: i.qty }));
      if (items.length === 0) {
        setError("Your cart items are missing product IDs. Try re-adding them.");
        return;
      }
      const result = await createCheckoutSession({
        data: {
          items,
          discountCode: discount?.code ?? null,
          utmSource,
          returnUrl: `${window.location.origin}/checkout/return`,
          environment: getStripeEnvironment(),
        },
      });
      if (cancelled) return;
      if ("error" in result) setError(result.error);
      else setClientSecret(result.clientSecret);
    })().catch((e) => !cancelled && setError(e?.message ?? "Failed to start checkout."));

    return () => { cancelled = true; };
  }, [user, loading, cart, discount, navigate, utmSource]);

  if (loading) return <CheckoutFrame><p className="text-white/60">Loading…</p></CheckoutFrame>;
  if (!user) return <CheckoutFrame><p className="text-white/60">Redirecting to sign in…</p></CheckoutFrame>;

  if (cart.length === 0) {
    return (
      <CheckoutFrame>
        <h1 className="font-display text-3xl mb-3">Your cart is empty</h1>
        <p className="text-white/60 mb-6">Add some plugins and come back.</p>
        <Link to="/shop" className="btn-primary">Browse the warehouse →</Link>
      </CheckoutFrame>
    );
  }

  if (error) {
    return (
      <CheckoutFrame>
        <h1 className="font-display text-3xl mb-3">Checkout hit a snag</h1>
        <p className="text-[var(--accent-red-glow)] mb-6">{error}</p>
        <Link to="/shop" className="btn-ghost">Back to shop</Link>
      </CheckoutFrame>
    );
  }

  if (!clientSecret) return <CheckoutFrame><p className="text-white/60">Preparing secure checkout…</p></CheckoutFrame>;

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
      <div className="max-w-xl mx-auto px-4 text-center">{children}</div>
    </div>
  );
}
