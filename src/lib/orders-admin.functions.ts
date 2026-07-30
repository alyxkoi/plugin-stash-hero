import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type AdminOrderDetail = {
  id: string;
  number: string;
  status: string;
  total: number;
  subtotal: number;
  discount: number;
  discount_code: string | null;
  credit_applied: number;
  created_at: string;
  utm_source: string | null;
  stripe_payment_intent_id: string | null;
  stripe_mode: "live" | "test" | null;
  items: {
    id: string;
    name: string;
    price: number;
    cover_gradient: string | null;
    cover_url: string | null;
    product_slug: string | null;
  }[];
  customer: {
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    phone: string | null;
  };
  payment: {
    method: string; // human-readable: "Visa •• 4242", "Apple Pay", "Klarna", etc.
    brand: string | null;
    last4: string | null;
    wallet: string | null;
  } | null;
};


function splitName(name: string | null): { firstName: string | null; lastName: string | null } {
  if (!name) return { firstName: null, lastName: null };
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return { firstName: null, lastName: null };
  if (parts.length === 1) return { firstName: parts[0], lastName: null };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

function prettyBrand(b: string | null | undefined): string {
  if (!b) return "Card";
  const map: Record<string, string> = { visa: "Visa", mastercard: "Mastercard", amex: "Amex", discover: "Discover", diners: "Diners", jcb: "JCB", unionpay: "UnionPay" };
  return map[b.toLowerCase()] ?? b.charAt(0).toUpperCase() + b.slice(1);
}
function prettyWallet(w: string | null | undefined): string | null {
  if (!w) return null;
  const map: Record<string, string> = { apple_pay: "Apple Pay", google_pay: "Google Pay", samsung_pay: "Samsung Pay", link: "Link" };
  return map[w.toLowerCase()] ?? w.replace(/_/g, " ");
}
function prettyType(t: string): string {
  const map: Record<string, string> = { card: "Card", klarna: "Klarna", affirm: "Affirm", afterpay_clearpay: "Afterpay", cashapp: "Cash App", us_bank_account: "Bank transfer", link: "Link" };
  return map[t] ?? t.replace(/_/g, " ");
}

async function fetchStripeDetails(stripePaymentIntentId: string | null, stripeSessionId: string | null): Promise<{ payment: AdminOrderDetail["payment"]; phone: string | null; email: string | null; name: string | null; mode: "live" | "test" | null }> {
  if (!stripePaymentIntentId && !stripeSessionId) return { payment: null, phone: null, email: null, name: null, mode: null };

  const { createStripeClient } = await import("@/lib/stripe.server");
  type StripeEnv = "sandbox" | "live";
  const envs: StripeEnv[] = ["live", "sandbox"];
  for (const env of envs) {
    try {
      const stripe = createStripeClient(env);
      let phone: string | null = null;
      let email: string | null = null;
      let name: string | null = null;
      let payment: AdminOrderDetail["payment"] = null;

      if (stripeSessionId) {
        try {
          const session = await stripe.checkout.sessions.retrieve(stripeSessionId);
          phone = (session.customer_details?.phone as string | undefined) ?? null;
          email = (session.customer_details?.email as string | undefined) ?? session.customer_email ?? null;
          name = (session.customer_details?.name as string | undefined) ?? null;
        } catch { /* try next env */ }
      }

      if (stripePaymentIntentId) {
        const pi: any = await stripe.paymentIntents.retrieve(stripePaymentIntentId, { expand: ["latest_charge.payment_method_details", "latest_charge.billing_details"] });
        const charge = pi.latest_charge;
        const details = charge?.payment_method_details;
        if (details) {
          const type: string = details.type;
          if (type === "card" && details.card) {
            const brand = prettyBrand(details.card.brand);
            const last4 = details.card.last4 as string | null;
            const wallet = prettyWallet(details.card.wallet?.type);
            payment = {
              brand, last4, wallet,
              method: wallet ? wallet : `${brand} •• ${last4 ?? "????"}`,
            };
          } else {
            payment = { brand: null, last4: null, wallet: null, method: prettyType(type) };
          }
        }
        if (!phone) phone = (charge?.billing_details?.phone as string | undefined) ?? null;
        if (!email) email = (charge?.billing_details?.email as string | undefined) ?? null;
        if (!name) name = (charge?.billing_details?.name as string | undefined) ?? null;
      }

      return { payment, phone, email, name, mode: env === "live" ? "live" : "test" };
    } catch {
      // fall through to next env
      continue;
    }
  }
  return { payment: null, phone: null, email: null, name: null, mode: null };
}

export const getAdminOrderDetail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { orderId: string }) => {
    if (!data?.orderId || typeof data.orderId !== "string") throw new Error("orderId required");
    return data;
  })
  .handler(async ({ data, context }): Promise<AdminOrderDetail | { error: string }> => {
    const { supabase, userId } = context as any;
    // Verify admin
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) return { error: "Not authorized" };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .select("id, number, status, total, subtotal, discount, discount_code, credit_applied_cents, customer_name, created_at, utm_source, customer_id, user_id, guest_email, stripe_id, stripe_session_id, order_items(id, name, price, cover_gradient, cover_url, product_slug)")
      .eq("id", data.orderId)
      .maybeSingle();
    if (error || !order) return { error: error?.message ?? "Order not found" };

    let dbEmail: string | null = order.guest_email ?? null;
    let dbName: string | null = (order as any).customer_name ?? null;
    if (order.customer_id) {
      const { data: c } = await supabaseAdmin.from("customers").select("email, name").eq("id", order.customer_id).maybeSingle();
      if (c) { dbEmail = c.email ?? dbEmail; dbName = dbName || (c.name ?? null); }
    }
    if (!dbName && order.user_id) {
      const { data: p } = await supabaseAdmin
        .from("profiles")
        .select("email, first_name, last_name")
        .eq("id", order.user_id as string)
        .maybeSingle();
      if (p) {
        dbName = [p.first_name, p.last_name].filter(Boolean).join(" ") || null;
        dbEmail = dbEmail || (p.email as string | null);
      }
    }

    const stripeInfo = await fetchStripeDetails(order.stripe_id as string | null, order.stripe_session_id as string | null);
    const resolvedName = dbName || stripeInfo.name;
    const { firstName, lastName } = splitName(resolvedName);
    const resolvedEmail = stripeInfo.email || dbEmail;

    return {
      id: order.id,
      number: order.number,
      status: order.status,
      total: Number(order.total),
      subtotal: Number(order.subtotal),
      discount: Number(order.discount),
      discount_code: order.discount_code,
      credit_applied: Number((order as any).credit_applied_cents ?? 0) / 100,
      created_at: order.created_at,
      utm_source: order.utm_source,
      stripe_payment_intent_id: (order.stripe_id as string | null) ?? null,
      stripe_mode: stripeInfo.mode,
      items: (order.order_items ?? []).map((it: any) => ({
        id: it.id, name: it.name, price: Number(it.price), cover_gradient: it.cover_gradient, cover_url: it.cover_url, product_slug: it.product_slug,
      })),
      customer: { firstName, lastName, email: resolvedEmail, phone: stripeInfo.phone },
      payment: stripeInfo.payment,
    };

  });

/**
 * One-off backfill: pull the buyer name (and payment intent id) for existing
 * paid orders from their Stripe Checkout Session, and copy the name onto the
 * customer profile when it's still empty. Admin-only, safe to re-run.
 */
export const backfillOrderNames = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ scanned: number; namesFilled: number; intentsFilled: number } | { error: string }> => {
    const { supabase, userId } = context as any;
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) return { error: "Not authorized" };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { createStripeClient } = await import("@/lib/stripe.server");

    const { data: orders } = await supabaseAdmin
      .from("orders")
      .select("id, user_id, guest_email, stripe_id, stripe_session_id, customer_name, total")
      .is("customer_name", null)
      .limit(500);

    let namesFilled = 0;
    let intentsFilled = 0;
    const rows = (orders ?? []) as any[];

    for (const o of rows) {
      const sid = o.stripe_session_id as string | null;
      if (!sid || sid.startsWith("free_")) continue;
      let name: string | null = null;
      let intent: string | null = null;
      for (const env of ["live", "sandbox"] as const) {
        try {
          const stripe = createStripeClient(env);
          const s: any = await stripe.checkout.sessions.retrieve(sid);
          name = (s.customer_details?.name as string | undefined) ?? null;
          intent = typeof s.payment_intent === "string" ? s.payment_intent : (s.payment_intent?.id ?? null);
          break;
        } catch {
          continue;
        }
      }
      const patch: Record<string, unknown> = {};
      if (name) { patch.customer_name = name; namesFilled += 1; }
      if (!o.stripe_id && intent) { patch.stripe_id = intent; intentsFilled += 1; }
      if (Object.keys(patch).length > 0) {
        await supabaseAdmin.from("orders").update(patch as any).eq("id", o.id as string);
      }
      if (name && o.user_id) {
        const parts = name.trim().split(/\s+/);
        const { data: prof } = await supabaseAdmin
          .from("profiles").select("first_name, last_name").eq("id", o.user_id as string).maybeSingle();
        if (prof && !prof.first_name && !prof.last_name) {
          await supabaseAdmin.from("profiles").update({
            first_name: parts[0] ?? null,
            last_name: parts.length > 1 ? parts.slice(1).join(" ") : null,
          } as any).eq("id", o.user_id as string);
        }
      }
    }

    return { scanned: rows.length, namesFilled, intentsFilled };
  });
