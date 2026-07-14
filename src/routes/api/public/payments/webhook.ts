import { createFileRoute } from "@tanstack/react-router";
import { type StripeEnv, verifyWebhook } from "@/lib/stripe.server";
import { finalizeOrder, type FulfillItem } from "@/lib/order-fulfill.server";
import {
  notifyTelegram,
  formatSaleMessage,
  formatFailureMessage,
} from "@/lib/telegram-notify.server";

async function handleCheckoutCompleted(session: any) {
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
  let items: FulfillItem[] = [];
  try { items = JSON.parse(meta.items_json ?? "[]"); } catch { items = []; }

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
            await handleCheckoutCompleted(event.data.object);
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
