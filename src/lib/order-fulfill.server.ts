// Order fulfillment shared between the Stripe webhook (paid orders) and the
// free-checkout path in `createCheckoutSession` (zero-total orders). Both
// paths need identical downstream side effects: insert order + items,
// increment discount usage, clear cart, and send the confirmation email.

import { sendEmail, FROM_ORDERS } from "@/lib/resend.server";
import { renderOrderConfirmation } from "@/lib/email-templates.server";
import { subscribeToMailchimp } from "@/lib/mailchimp.server";

export type FulfillItem = {
  product_id: string;
  slug: string;
  name: string;
  price: number;
  cover_gradient: string | null;
  cover_url: string | null;
  qty: number;
};

export type FulfillInput = {
  sessionId: string; // stripe_session_id — synthetic like `free_<uuid>` for freebies
  userId: string | null;
  guestEmail: string | null;
  discountCode: string | null;
  utmSource: string | null;
  subtotalCents: number;
  discountCents: number;
  totalCents: number;
  items: FulfillItem[];
  stripePaymentIntentId?: string | null;
};

export async function finalizeOrder(input: FulfillInput): Promise<{ orderId: string; number: string } | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  // Idempotency: skip if already recorded for this session id
  const { data: existing } = await supabaseAdmin
    .from("orders")
    .select("id, number")
    .eq("stripe_session_id", input.sessionId)
    .maybeSingle();
  if (existing) return { orderId: existing.id as string, number: existing.number as string };

  // Sequential order number
  let number: string;
  {
    const { data: nn, error: nnErr } = await supabaseAdmin.rpc("next_order_number");
    if (nnErr || !nn) {
      console.error("[fulfill] next_order_number failed", nnErr);
      number = `PW-${Date.now().toString().slice(-6)}`;
    } else {
      number = nn as unknown as string;
    }
  }

  const { data: inserted, error: orderErr } = await supabaseAdmin
    .from("orders")
    .insert({
      number,
      user_id: input.userId ?? null,
      guest_email: input.guestEmail,
      subtotal: input.subtotalCents / 100,
      discount: input.discountCents / 100,
      total: input.totalCents / 100,
      discount_code: input.discountCode,
      utm_source: input.utmSource,
      status: "completed",
      stripe_id: input.stripePaymentIntentId ?? null,
      stripe_session_id: input.sessionId,
    })
    .select("id")
    .maybeSingle();

  if (orderErr || !inserted) {
    console.error("[fulfill] order insert failed", orderErr);
    return null;
  }

  const orderId = inserted.id as string;

  if (input.items.length > 0) {
    const rows = input.items.flatMap((it) =>
      Array.from({ length: it.qty }, () => ({
        order_id: orderId,
        product_id: it.product_id,
        product_slug: it.slug,
        name: it.name,
        price: it.price,
        cover_gradient: it.cover_gradient,
        cover_url: it.cover_url ?? null,
      })),
    );
    const { error: itemsErr } = await supabaseAdmin.from("order_items").insert(rows);
    if (itemsErr) console.error("[fulfill] order_items insert failed", itemsErr);

    // Seed per-user file-update acknowledgements so newly purchased products
    // never show an "updated" badge until the next actual file replacement.
    if (input.userId) {
      const ackRows = input.items
        .filter((it) => it.product_id)
        .map((it) => ({ user_id: input.userId!, product_id: it.product_id, acknowledged_at: new Date().toISOString() }));
      if (ackRows.length > 0) {
        const { error: ackErr } = await supabaseAdmin
          .from("product_file_acknowledgements")
          .upsert(ackRows, { onConflict: "user_id,product_id" });
        if (ackErr) console.error("[fulfill] ack seed failed", ackErr);
      }
    }
  }

  if (input.discountCode) {
    const { data: dc } = await supabaseAdmin
      .from("discount_codes")
      .select("id,uses")
      .ilike("code", input.discountCode)
      .maybeSingle();
    if (dc) {
      await supabaseAdmin
        .from("discount_codes")
        .update({ uses: ((dc.uses as number) ?? 0) + 1 })
        .eq("id", dc.id as string);
    }
  }

  if (input.userId) {
    await supabaseAdmin.from("cart_items").delete().eq("user_id", input.userId);
  }

  const recipient = input.guestEmail;
  if (recipient && input.items.length > 0) {
    const origin =
      process.env.PUBLIC_SITE_URL ||
      process.env.SITE_URL ||
      "https://plugin-stash-hero.lovable.app";
    const emailItems = input.items.map((it) => ({
      name: it.name,
      price: it.price,
      downloadUrl: `${origin}/api/public/download?session_id=${encodeURIComponent(input.sessionId)}&product_id=${encodeURIComponent(it.product_id)}`,
    }));
    const rendered = renderOrderConfirmation({
      orderNumber: number,
      customerEmail: recipient,
      items: emailItems,
      total: input.totalCents / 100,
      orderUrl: `${origin}/checkout/return?session_id=${encodeURIComponent(input.sessionId)}`,
    });
    const send = await sendEmail({
      from: FROM_ORDERS,
      to: recipient,
      reply_to: "pluginwh@gmail.com",
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    });
    if (send.error) console.error("[fulfill] order email send failed:", send.error);
  }

  // Add buyer to Mailchimp audience with a "customer" tag. Non-fatal.
  if (recipient) {
    subscribeToMailchimp({ email: recipient, tags: ["customer"] }).catch((e) =>
      console.error("[fulfill] mailchimp sync failed:", e),
    );
  }

  return { orderId, number };
}
