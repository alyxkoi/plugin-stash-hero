import { createFileRoute } from "@tanstack/react-router";
import { type StripeEnv, verifyWebhook, createStripeClient } from "@/lib/stripe.server";
import { finalizeOrder, type FulfillItem } from "@/lib/order-fulfill.server";
import {
  notifyTelegram,
  formatSaleMessage,
  formatFailureMessage,
} from "@/lib/telegram-notify.server";

// Parse compact "uuid:qty,uuid:qty" metadata. Falls back to legacy items_json.
function parseCompactItems(meta: Record<string, string>): Array<{ productId: string; qty: number }> {
  const s = (meta.items as string | undefined) ?? "";
  if (s) {
    return s.split(",").map((part) => {
      const [productId, qtyStr] = part.split(":");
      return { productId, qty: Math.max(1, Number(qtyStr) || 1) };
    }).filter((x) => x.productId);
  }
  // Legacy fallback
  try {
    const arr = JSON.parse(meta.items_json ?? "[]") as Array<{ product_id: string; qty: number }>;
    return arr.map((x) => ({ productId: x.product_id, qty: x.qty || 1 }));
  } catch {
    return [];
  }
}

async function resolveFulfillItems(
  compact: Array<{ productId: string; qty: number }>,
  sessionId: string,
  env: StripeEnv,
): Promise<FulfillItem[]> {
  if (compact.length === 0) return [];
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: prodRows } = await supabaseAdmin
    .from("products")
    .select("id,slug,name,price,cover_gradient,cover_url")
    .in("id", compact.map((c) => c.productId));
  const byId = new Map((prodRows ?? []).map((p) => [p.id as string, p]));

  // Pull unit prices from Stripe line_items (reflects sale + promo distribution).
  const priceByProductId = new Map<string, number>();
  try {
    const stripe = createStripeClient(env);
    const lines = await stripe.checkout.sessions.listLineItems(sessionId, {
      limit: 100,
      expand: ["data.price.product"],
    });
    for (const li of lines.data) {
      const prod = li.price?.product as { metadata?: { product_id?: string } } | undefined;
      const pid = prod?.metadata?.product_id;
      if (pid && li.price?.unit_amount != null) {
        priceByProductId.set(pid, li.price.unit_amount / 100);
      }
    }
  } catch (e) {
    console.error("[webhook] listLineItems failed, falling back to product price", e);
  }

  return compact
    .map(({ productId, qty }) => {
      const p = byId.get(productId);
      if (!p) return null;
      const price = priceByProductId.get(productId) ?? Number(p.price);
      return {
        product_id: productId,
        slug: p.slug as string,
        name: p.name as string,
        price,
        cover_gradient: (p.cover_gradient as string | null) ?? null,
        cover_url: (p.cover_url as string | null) ?? null,
        qty,
      } as FulfillItem;
    })
    .filter((x): x is FulfillItem => !!x);
}

async function handleCheckoutCompleted(session: any, env: StripeEnv) {
  const sessionId = session.id as string;
  const meta = session.metadata ?? {};
  const userId: string | null = meta.userId || null;
  const guestEmail: string | null =
    (meta.guest_email as string | undefined) ||
    (session.customer_details?.email as string | undefined) ||
    (session.customer_email as string | undefined) ||
    null;
  const discountCode: string | null = meta.discount_code || null;
  const utmSource: string | null = meta.utm_source || null;
  const utmCampaign: string | null = meta.utm_campaign || null;
  const pwCid: string | null = meta.pw_cid || null;
  const subtotalCents = Number(meta.subtotal_cents ?? session.amount_subtotal ?? 0);
  const discountCents = Number(meta.discount_cents ?? 0);
  const creditCents = Number(meta.credit_cents ?? 0);
  const totalCents = Number(meta.total_cents ?? session.amount_total ?? 0);
  const customerName: string | null = (session.customer_details?.name as string | undefined) || null;

  const compact = parseCompactItems(meta);
  const items = await resolveFulfillItems(compact, sessionId, env);

  const result = await finalizeOrder({
    sessionId,
    userId,
    guestEmail,
    discountCode,
    utmSource,
    utmCampaign,
    pwCid,
    subtotalCents,
    discountCents,
    totalCents,
    items,
    stripePaymentIntentId: (session.payment_intent as string) ?? null,
    customerName,
    creditMaxCents: creditCents,
  });


  const itemCount = items.reduce((n, i) => n + (i.qty || 1), 0);
  if (result) {
    await markCheckoutAttempt(sessionId, meta.checkout_attempt_key, "completed");
    await notifyTelegram(formatSaleMessage(result.number, itemCount, totalCents));
  }
}

// Abandoned / expired checkout — release any store credit that was reserved
// for it so the customer never loses credit they didn't spend.
async function handleSessionExpired(session: any) {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.rpc("release_credit_reservation", { _session_id: session.id as string } as any);
    await markCheckoutAttempt(session.id as string, session.metadata?.checkout_attempt_key, "expired");
  } catch (e) {
    console.error("[webhook] release reservation failed", e);
  }
}



// ---- Refunds ----
// Stripe sends the CUMULATIVE `amount_refunded` on the charge, so replaying an
// event or receiving several partial refunds always converges on the right
// number. `record_order_refund` clamps to the order total, never moves
// backwards, and derives the order status (completed → partial → refunded).
async function handleChargeRefunded(charge: any) {
  const intentId: string | null =
    (typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id) ?? null;
  const refundedCents = Math.max(0, Number(charge.amount_refunded ?? 0));
  if (!intentId || refundedCents === 0) {
    console.log("[webhook] refund ignored (no intent or zero amount)");
    return;
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: order } = await supabaseAdmin
    .from("orders")
    .select("id, number, total")
    .eq("stripe_id", intentId)
    .maybeSingle();
  if (!order) {
    console.error("[webhook] refund: no order for intent", intentId);
    return;
  }

  const latestRefundId: string | null = charge.refunds?.data?.[0]?.id ?? null;
  const { data: res, error } = await supabaseAdmin.rpc("record_order_refund", {
    _order_id: order.id as string,
    _refunded_total_cents: refundedCents,
    _stripe_refund_id: latestRefundId,
    _note: "Refunded in Stripe",
    _by: null,
  } as any);
  if (error) {
    console.error("[webhook] record_order_refund failed", error);
    throw error;
  }
  const row = Array.isArray(res) ? res[0] : res;
  console.log("[webhook] refund recorded", order.number, row?.status, row?.refunded_amount_cents);
}

async function handlePaymentFailed(intent: any) {
  const meta = intent.metadata ?? {};
  const compact = parseCompactItems(meta);
  const itemCount = compact.reduce((n, i) => n + i.qty, 0);
  const totalCents = Number(meta.total_cents ?? intent.amount ?? 0);
  await markCheckoutAttempt(null, meta.checkout_attempt_key, "failed");

  // Orders are only created on success, so usually there's no order number here.
  let orderNumber: string | null = null;
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("orders")
      .select("number")
      .eq("stripe_id", intent.id as string)
      .maybeSingle();
    if (data?.number) orderNumber = data.number as string;
  } catch (e) {
    console.error("[webhook] failed to look up order for failed intent", e);
  }

  await notifyTelegram(formatFailureMessage(orderNumber, itemCount, totalCents));
}

async function markCheckoutAttempt(
  sessionId: string | null,
  attemptKey: string | null | undefined,
  status: "completed" | "expired" | "failed",
) {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let query = (supabaseAdmin as any)
      .from("checkout_attempts")
      .update({
        status,
        ...(status === "completed" ? { completed_at: new Date().toISOString() } : {}),
      });
    query = attemptKey
      ? query.eq("idempotency_key", attemptKey)
      : query.eq("stripe_session_id", sessionId);
    const { error } = await query;
    if (error) console.error("[webhook] checkout attempt update failed", error);
  } catch (error) {
    console.error("[webhook] checkout attempt update threw", error);
  }
}

export const Route = createFileRoute("/api/public/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawEnv = new URL(request.url).searchParams.get("env");
        if (rawEnv !== "sandbox" && rawEnv !== "live") {
          console.error("[webhook] invalid env:", rawEnv);
          return Response.json({ received: false, error: "invalid env" }, { status: 400 });
        }
        const env: StripeEnv = rawEnv;
        let eventId: string | undefined;
        try {
          // Signature is verified on every request before anything is read.
          const event = await verifyWebhook(request, env);

          // ---- Event-level idempotency ----
          // Stripe retries deliveries, and an endpoint can be registered more
          // than once. Claim the event id first; if it's already logged, skip.
          eventId = (event as any).id as string | undefined;
          if (eventId) {
            const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
            const { data: claimed, error: claimErr } = await supabaseAdmin
              .from("stripe_webhook_events")
              .insert({
                event_id: eventId,
                event_type: event.type,
                session_id: ((event.data.object as any)?.id as string) ?? null,
              } as any)
              .select("event_id");
            if (claimErr || (claimed ?? []).length === 0) {
              console.log("[webhook] duplicate event skipped:", eventId, event.type);
              return Response.json({ received: true, duplicate: true });
            }
          }

          if (event.type === "checkout.session.completed") {
            await handleCheckoutCompleted(event.data.object, env);
          } else if (event.type === "checkout.session.expired") {
            await handleSessionExpired(event.data.object);
          } else if (event.type === "payment_intent.payment_failed") {
            await handlePaymentFailed(event.data.object);
          } else if (event.type === "charge.refunded") {
            await handleChargeRefunded(event.data.object);

          } else {
            console.log("[webhook] unhandled:", event.type);
          }

          if (eventId) {
            const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
            await supabaseAdmin
              .from("stripe_webhook_events")
              .update({ processed_at: new Date().toISOString() } as any)
              .eq("event_id", eventId);
          }
          return Response.json({ received: true });
        } catch (e) {
          console.error("[webhook] error:", e);
          // A claimed-but-unprocessed event must be retryable. Leaving the row
          // behind makes every later Stripe delivery look like a completed
          // duplicate and can permanently strand an order or refund.
          if (eventId) {
            try {
              const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
              await supabaseAdmin
                .from("stripe_webhook_events")
                .delete()
                .eq("event_id", eventId)
                .is("processed_at", null);
            } catch (cleanupError) {
              console.error("[webhook] failed to release event claim", cleanupError);
            }
          }
          return new Response("Webhook error", { status: eventId ? 500 : 400 });
        }
      },
    },
  },
});
