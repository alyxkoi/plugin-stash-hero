import { createFileRoute } from "@tanstack/react-router";
import { type StripeEnv, verifyWebhook } from "@/lib/stripe.server";
import { finalizeOrder, type FulfillItem } from "@/lib/order-fulfill.server";

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

  await finalizeOrder({
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
