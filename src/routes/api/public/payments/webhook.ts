import { createFileRoute } from "@tanstack/react-router";
import { type StripeEnv, verifyWebhook } from "@/lib/stripe.server";
import { sendEmail, FROM_ORDERS } from "@/lib/resend.server";
import { renderOrderConfirmation } from "@/lib/email-templates.server";




async function handleCheckoutCompleted(session: any) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const sessionId = session.id as string;

  // Idempotency: skip if already recorded
  const { data: existing } = await supabaseAdmin
    .from("orders")
    .select("id")
    .eq("stripe_session_id", sessionId)
    .maybeSingle();
  if (existing) return;

  const meta = session.metadata ?? {};
  const userId: string | undefined = meta.userId || undefined;
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
  let items: Array<{ product_id: string; slug: string; name: string; price: number; cover_gradient: string | null; cover_url: string | null; qty: number }> = [];
  try { items = JSON.parse(meta.items_json ?? "[]"); } catch { items = []; }

  // Order number: PW-XXXXXX (retry on collision)
  async function newNumber(): Promise<string> {
    for (let i = 0; i < 6; i++) {
      const n = Math.floor(100000 + Math.random() * 900000);
      const candidate = `PW-${n}`;
      const { data: dup } = await supabaseAdmin.from("orders").select("id").eq("number", candidate).maybeSingle();
      if (!dup) return candidate;
    }
    return `PW-${Date.now().toString().slice(-6)}`;
  }
  const number = await newNumber();

  const { data: inserted, error: orderErr } = await supabaseAdmin
    .from("orders")
    .insert({
      number,
      user_id: userId ?? null,
      guest_email: guestEmail,
      subtotal: subtotalCents / 100,
      discount: discountCents / 100,
      total: totalCents / 100,
      discount_code: discountCode,
      utm_source: utmSource,
      status: "completed",
      stripe_id: (session.payment_intent as string) ?? null,
      stripe_session_id: sessionId,
    })
    .select("id")
    .maybeSingle();

  if (orderErr || !inserted) {
    console.error("[webhook] order insert failed", orderErr);
    return;
  }

  if (items.length > 0) {
    const rows = items.flatMap((it) =>
      Array.from({ length: it.qty }, () => ({
        order_id: inserted.id as string,
        product_id: it.product_id,
        product_slug: it.slug,
        name: it.name,
        price: it.price,
        cover_gradient: it.cover_gradient,
        cover_url: it.cover_url ?? null,
      })),
    );
    const { error: itemsErr } = await supabaseAdmin.from("order_items").insert(rows);
    if (itemsErr) console.error("[webhook] order_items insert failed", itemsErr);
  }

  if (discountCode) {
    // Increment usage counter
    const { data: dc } = await supabaseAdmin
      .from("discount_codes")
      .select("id,uses")
      .ilike("code", discountCode)
      .maybeSingle();
    if (dc) {
      await supabaseAdmin
        .from("discount_codes")
        .update({ uses: (dc.uses as number ?? 0) + 1 })
        .eq("id", dc.id as string);
    }
  }

  // Clear the buyer's cart
  if (userId) {
    await supabaseAdmin.from("cart_items").delete().eq("user_id", userId);
  }

  // Order confirmation email — sent to logged-in buyers and guest checkouts.
  const recipient = guestEmail;
  if (recipient && items.length > 0) {
    const origin =
      process.env.PUBLIC_SITE_URL ||
      process.env.SITE_URL ||
      "https://plugin-stash-hero.lovable.app";
    const emailItems = items.map((it) => ({
      name: it.name,
      price: it.price,
      downloadUrl: `${origin}/api/public/download?session_id=${encodeURIComponent(sessionId)}&product_id=${encodeURIComponent(it.product_id)}`,
    }));
    const rendered = renderOrderConfirmation({
      orderNumber: number,
      customerEmail: recipient,
      items: emailItems,
      total: totalCents / 100,
      orderUrl: `${origin}/checkout/return?session_id=${encodeURIComponent(sessionId)}`,
    });
    const send = await sendEmail({
      from: FROM_ORDERS,
      to: recipient,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    });
    if (send.error) console.error("[webhook] order email send failed:", send.error);
  }


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
