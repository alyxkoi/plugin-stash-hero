import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { createCheckoutSession } from "@/lib/checkout.functions";
import { useAuth } from "@/hooks/useAuth";
import { useStore } from "@/lib/store";
import { readStoredUtm } from "@/hooks/useUtmCapture";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { getMyStoreCredit } from "@/lib/store-credit.functions";

export const Route = createFileRoute("/checkout/")({
  head: () => ({ meta: [{ title: "Checkout — Plugin Warehouse" }] }),
  component: CheckoutPage,
});

function CheckoutPage() {
  const { user, loading } = useAuth();
  const cart = useStore((s) => s.cart);
  const discount = useStore((s) => s.discount);
  const navigate = useNavigate();

  // Prefer live URL params on the checkout page itself, but fall back to
  // the first-touch UTM stored on landing so attribution isn't lost when
  // a visitor browses several pages before checking out.
  const utm = useMemo(() => {
    if (typeof window === "undefined") return { source: null as string | null, campaign: null as string | null, cid: null as string | null };
    const q = new URLSearchParams(window.location.search);
    const stored = readStoredUtm();
    return {
      source: q.get("utm_source") || stored?.utm_source || null,
      campaign: q.get("utm_campaign") || stored?.utm_campaign || null,
      cid: q.get("pw_cid") || stored?.pw_cid || null,
    };
  }, []);



  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [guestEmail, setGuestEmail] = useState("");
  const [emailConfirmed, setEmailConfirmed] = useState(false);
  const [creating, setCreating] = useState(false);
  const startedRef = useRef(false);

  // Store credit — opt-in, defaults OFF. The server always recomputes the
  // exact amount from the ledger; we only send a boolean.
  const [creditCents, setCreditCents] = useState(0);
  const [creditLoaded, setCreditLoaded] = useState(false);
  const [applyCredit, setApplyCredit] = useState(false);
  const [creditReviewed, setCreditReviewed] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) { setCreditLoaded(true); return; }
    let cancelled = false;
    (async () => {
      try {
        const snap = await getMyStoreCredit();
        if (!cancelled) setCreditCents(snap.balance_cents);
      } catch (e) {
        console.warn("[checkout] store credit load failed", e);
      } finally {
        if (!cancelled) setCreditLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, [user, loading]);

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
      let environment;
      try {
        environment = getStripeEnvironment();
      } catch (envErr: any) {
        setError(envErr?.message ?? "Payments are not configured for this build.");
        setCreating(false);
        startedRef.current = false;
        return;
      }
      const payload = {
        items,
        discountCode: discount?.code ?? null,
        utmSource: utm.source,
        utmCampaign: utm.campaign,
        pwCid: utm.cid,
        email: email ?? (user?.email ?? null),
        returnUrl: `${window.location.origin}/checkout/return`,
        environment,
        applyCredit,
      };


      // One silent retry on transient network failures (aborted fetch, brief
      // Worker cold-start). Anything else falls through to the visible error.
      const callOnce = () => createCheckoutSession({ data: payload });
      let result;
      try {
        result = await callOnce();
      } catch (netErr: any) {
        const msg = String(netErr?.message ?? "");
        const looksNetwork = msg.includes("Failed to fetch") || msg.includes("NetworkError") || msg.includes("Load failed") || netErr?.name === "TypeError";
        if (!looksNetwork) throw netErr;
        await new Promise((r) => setTimeout(r, 600));
        result = await callOnce();
      }

      if ("error" in result) {
        setError(result.error);
        startedRef.current = false;
      } else if ("freeSessionId" in result) {
        // $0 order — order already created server-side, skip Stripe.
        navigate({ to: "/checkout/return", search: { session_id: result.freeSessionId } as any });
      } else {
        setClientSecret(result.clientSecret);
      }

    } catch (e: any) {
      const raw = String(e?.message ?? "");
      const friendly = raw.includes("Failed to fetch") || raw.includes("NetworkError") || raw.includes("Load failed")
        ? "Couldn't reach the checkout service. This is usually a network hiccup or a browser extension (ad-blocker, privacy shield) blocking the request. Try disabling extensions or a different browser, then retry."
        : raw || "Failed to start checkout.";
      setError(friendly);
      startedRef.current = false;
    } finally {
      setCreating(false);
    }
  }


  // Auto-start for logged-in users. When they hold store credit we pause on a
  // short review step first so applying it is a deliberate opt-in.
  useEffect(() => {
    if (loading || cart.length === 0 || !creditLoaded) return;
    if (creditCents > 0 && !creditReviewed) return;
    if (user && !clientSecret && !startedRef.current) startSession(user.email ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading, cart.length, creditLoaded, creditCents, creditReviewed]);

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

  // Store credit opt-in step (signed-in customers with a balance)
  if (user && creditLoaded && creditCents > 0 && !creditReviewed && !clientSecret) {
    return (
      <GuestGateFrame>
        <div className="font-mono text-xs tracking-[0.2em] text-[var(--accent-red-glow)] mb-3">CHECKOUT</div>
        <h1 className="font-black text-4xl md:text-5xl chrome-text mb-2">YOU'VE GOT CREDIT.</h1>
        <p className="text-white/65 mb-8">
          ${(creditCents / 100).toFixed(2)} of store credit is sitting on your account. Use it now, or save it for later.
        </p>
        <button
          type="button"
          onClick={() => setApplyCredit((v) => !v)}
          aria-pressed={applyCredit}
          className={`w-full text-left flex items-center gap-4 p-4 rounded-xl border transition min-h-[64px] ${applyCredit ? "border-[var(--accent-red-glow)] bg-[rgba(255,0,60,0.08)]" : "border-white/15 bg-white/[0.03]"}`}
        >
          <span className={`w-12 h-7 rounded-full shrink-0 relative transition ${applyCredit ? "bg-[var(--accent-red)]" : "bg-white/20"}`}>
            <span className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-all ${applyCredit ? "left-6" : "left-1"}`} />
          </span>
          <span className="min-w-0">
            <span className="block text-sm text-white font-bold">Apply store credit (${(creditCents / 100).toFixed(2)} available)</span>
            <span className="block font-mono text-[11px] text-white/55 mt-0.5">
              {applyCredit
                ? "Applied to this order — any leftover stays on your account."
                : "Off — your credit stays untouched."}
            </span>
          </span>
        </button>
        <button
          type="button"
          onClick={() => setCreditReviewed(true)}
          className="btn-primary w-full !text-base !py-4 mt-6"
        >
          CONTINUE TO PAYMENT →
        </button>
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
