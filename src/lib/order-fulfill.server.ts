// Order fulfillment shared between the Stripe webhook (paid orders) and the
// free-checkout path in `createCheckoutSession` (zero-total orders). Both
// paths need identical downstream side effects: insert order + items,
// increment discount usage, clear cart, and send the confirmation email.

import { sendEmail, FROM_ORDERS } from "@/lib/resend.server";
import { renderOrderConfirmation } from "@/lib/email-templates.server";
import { subscribeToMailchimp } from "@/lib/mailchimp.server";
import { normalizeUtmSource } from "@/lib/utm";
import { escapeLikePattern } from "@/lib/like-escape";

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
  utmCampaign?: string | null;
  pwCid?: string | null;
  subtotalCents: number;
  discountCents: number;
  totalCents: number;
  items: FulfillItem[];
  stripePaymentIntentId?: string | null;
  /** Name captured at checkout (Stripe customer_details.name or signup profile). */
  customerName?: string | null;
  /** Max store credit to debit for this order (computed server-side). */
  creditMaxCents?: number;
};




export async function finalizeOrder(input: FulfillInput): Promise<{ orderId: string; number: string } | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  // Reuse an existing order on retries, but continue the idempotent downstream
  // work. Returning here would prevent a transient item/email failure from ever
  // being repaired by the next webhook delivery.
  const { data: existing } = await supabaseAdmin
    .from("orders")
    .select("id, number")
    .eq("stripe_session_id", input.sessionId)
    .maybeSingle();

  let number = (existing?.number as string | undefined) ?? "";
  let orderId = (existing?.id as string | undefined) ?? "";

  if (!existing) {
    // Sequential order number
    const { data: nn, error: nnErr } = await supabaseAdmin.rpc("next_order_number");
    if (nnErr || !nn) {
      console.error("[fulfill] next_order_number failed", nnErr);
      number = `PW-${Date.now().toString().slice(-6)}`;
    } else {
      number = nn as unknown as string;
    }


  // Find the sale event active at this moment so revenue attributes correctly.
  let activeSaleId: string | null = null;
  {
    const nowIso = new Date().toISOString();
    const { data: activeSale } = await supabaseAdmin
      .from("sale_events")
      .select("id")
      .in("status", ["active", "scheduled", "ended"])
      .lte("start_at", nowIso)
      .gte("end_at", nowIso)
      .order("start_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    activeSaleId = (activeSale?.id as string | undefined) ?? null;
  }

  // Structurally idempotent: the unique index on stripe_session_id makes a
  // duplicate impossible. On conflict we ignore and re-read the existing row,
  // so a retried webhook/handler returns the original order instead of erroring.
    const { error: insertErr } = await supabaseAdmin
      .from("orders")
      .upsert(
      {
        number,
        user_id: input.userId ?? null,
        guest_email: input.guestEmail,
        customer_name: input.customerName ?? null,
        subtotal: input.subtotalCents / 100,
        discount: input.discountCents / 100,
        total: input.totalCents / 100,
        discount_code: input.discountCode,
        utm_source: normalizeUtmSource(input.utmSource),
        utm_campaign: input.utmCampaign ?? null,
        pw_cid: input.pwCid ?? null,
        status: "completed",
        stripe_id: input.stripePaymentIntentId ?? null,
        stripe_session_id: input.sessionId,
        sale_id: activeSaleId,
        credit_applied_cents: 0,
      } as any,
      { onConflict: "stripe_session_id", ignoreDuplicates: true },
      );
    if (insertErr) console.error("[fulfill] order upsert warning", insertErr);

    const { data: inserted } = await supabaseAdmin
      .from("orders")
      .select("id, number")
      .eq("stripe_session_id", input.sessionId)
      .maybeSingle();

    if (!inserted) {
      console.error("[fulfill] order insert failed", insertErr);
      return null;
    }
    number = inserted.number as string;
    orderId = inserted.id as string;
  }

  // ---- Store credit: atomic debit tied to this session id (retry-safe) ----
  if (input.userId && (input.creditMaxCents ?? 0) > 0) {
    const { data: debited, error: creditErr } = await supabaseAdmin.rpc("consume_store_credit", {
      _customer_id: input.userId,
      _order_id: orderId,
      _max_cents: Math.round(input.creditMaxCents!),
      _idempotency_key: `credit:${input.sessionId}`,
      _session_id: input.sessionId,
    } as any);
    if (creditErr) {
      console.error("[fulfill] store credit debit failed", creditErr);
      throw new Error("Store credit could not be finalized");
    } else if (Number(debited ?? 0) > 0) {
      await supabaseAdmin
        .from("orders")
        .update({ credit_applied_cents: Number(debited) } as any)
        .eq("id", orderId);
    }
  }

  // ---- Persist the checkout name onto the profile when it's still empty ----
  if (input.userId && input.customerName) {
    const parts = input.customerName.trim().split(/\s+/);
    const first = parts[0] ?? null;
    const last = parts.length > 1 ? parts.slice(1).join(" ") : null;
    const { data: prof } = await supabaseAdmin
      .from("profiles")
      .select("first_name, last_name")
      .eq("id", input.userId)
      .maybeSingle();
    if (prof && !prof.first_name && !prof.last_name) {
      await supabaseAdmin
        .from("profiles")
        .update({ first_name: first, last_name: last } as any)
        .eq("id", input.userId);
    }
  }
  if (input.customerName) {
    const emailForCustomer = input.guestEmail;
    if (emailForCustomer) {
      const { data: cust } = await supabaseAdmin
        .from("customers")
        .select("id, name")
        .ilike("email", emailForCustomer)
        .maybeSingle();
      if (cust && !cust.name) {
        await supabaseAdmin.from("customers").update({ name: input.customerName } as any).eq("id", cust.id as string);
      }
    }
  }


  // Line items are only written once per order — a retried handler must never
  // duplicate them.
  const { data: existingItems } = await supabaseAdmin
    .from("order_items")
    .select("id")
    .eq("order_id", orderId)
    .limit(1);
  const itemsAlreadyWritten = (existingItems ?? []).length > 0;

  if (input.items.length > 0 && !itemsAlreadyWritten) {
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
    if (itemsErr) {
      console.error("[fulfill] order_items insert failed", itemsErr);
      throw new Error("Order items could not be saved");
    }


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

  if (input.discountCode && !itemsAlreadyWritten) {
    const { data: dc } = await supabaseAdmin
      .from("discount_codes")
      .select("id,uses")
      .ilike("code", escapeLikePattern(input.discountCode))
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

  // ---- Confirmation email: retry until successfully accepted by Resend ----
  const recipient = input.guestEmail;
  let mayEmail = false;
  if (recipient && input.items.length > 0) {
    const { data: emailState, error: emailStateError } = await supabaseAdmin
      .from("orders")
      .select("confirmation_email_sent_at")
      .eq("id", orderId)
      .maybeSingle();
    if (emailStateError) throw new Error("Confirmation email state could not be read");
    mayEmail = !emailState?.confirmation_email_sent_at;
  }

  if (recipient && input.items.length > 0 && mayEmail) {

    const origin =
      process.env.PUBLIC_SITE_URL ||
      process.env.SITE_URL ||
      "https://www.thepluginwarehouse.com";
    // `/api/public/download` verifies entitlement and 302s to the R2 custom
    // domain (thepluginwarehousefiles.com). Never build R2 S3 API URLs here.
    const emailItems = input.items.map((it) => ({
      name: it.name,
      price: it.price,
      coverUrl: it.cover_url,
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
    if (send.error) {
      console.error("[fulfill] order email send failed:", send.error);
      throw new Error("Confirmation email could not be sent");
    }
    const { error: markEmailError } = await supabaseAdmin
      .from("orders")
      .update({ confirmation_email_sent_at: new Date().toISOString() } as any)
      .eq("id", orderId)
      .is("confirmation_email_sent_at", null);
    if (markEmailError) throw new Error("Confirmation email state could not be saved");
  }

  // Add buyer to Mailchimp audience with a "customer" tag. Non-fatal.
  if (recipient) {
    subscribeToMailchimp({ email: recipient, tags: ["customer"] }).catch((e) =>
      console.error("[fulfill] mailchimp sync failed:", e),
    );
  }

  return { orderId, number };
}
