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
  const subtotalCents = Number(meta.subtotal_cents ?? session.amount_subtotal ?? 0);
  const discountCents = Number(meta.discount_cents ?? 0);
  const totalCents = Number(meta.total_cents ?? session.amount_total ?? 0);

  const compact = parseCompactItems(meta);
  const items = await resolveFulfillItems(compact, sessionId, env);

  const result = await finalizeOrder({
    sessionId,
    userId,
    guestEmail,
    discountCode,
    utmSource,
    subtotalCents,
    discountCents,
    totalCents,
    items,
    stripePaymentIntentId: (session.payment_intent as string) ?? null,
  });

  const itemCount = items.reduce((n, i) => n + (i.qty || 1), 0);
  if (result) {
    await notifyTelegram(formatSaleMessage(result.number, itemCount, totalCents));
  }
}

async function handlePaymentFailed(intent: any) {
  const meta = intent.metadata ?? {};
  let items: FulfillItem[] = [];
  try { items = JSON.parse(meta.items_json ?? "[]"); } catch { items = []; }
  const itemCount = items.reduce((n, i) => n + (i.qty || 1), 0);
  const totalCents = Number(meta.total_cents ?? intent.amount ?? 0);

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

export const Route = createFileRoute("/api/public/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawEnv = new URL(request.url).searchParams.get("env");
        if (rawEnv !== "sandbox" && rawEnv !== "live") {
          console.error("[webhook] invalid env:", rawEnv);
          return Response.json({ received: true, ignored: "invalid env" });
        }
        const env: StripeEnv = rawEnv;
        try {
          const event = await verifyWebhook(request, env);
          if (event.type === "checkout.session.completed") {
            await handleCheckoutCompleted(event.data.object, env);
          } else if (event.type === "payment_intent.payment_failed") {
            await handlePaymentFailed(event.data.object);
          } else {
            console.log("[webhook] unhandled:", event.type);
          }
          return Response.json({ received: true });
        } catch (e) {
          console.error("[webhook] error:", e);
          return new Response("Webhook error", { status: 400 });
        }
      },
    },
  },
});
