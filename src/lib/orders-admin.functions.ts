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
  created_at: string;
  utm_source: string | null;
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

async function fetchStripeDetails(stripePaymentIntentId: string | null, stripeSessionId: string | null): Promise<{ payment: AdminOrderDetail["payment"]; phone: string | null; email: string | null; name: string | null }> {
  if (!stripePaymentIntentId && !stripeSessionId) return { payment: null, phone: null, email: null, name: null };
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

      return { payment, phone, email, name };
    } catch {
      // fall through to next env
      continue;
    }
  }
  return { payment: null, phone: null, email: null, name: null };
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
      .select("id, number, status, total, subtotal, discount, discount_code, created_at, utm_source, customer_id, user_id, guest_email, stripe_id, stripe_session_id, order_items(id, name, price, cover_gradient, cover_url, product_slug)")
      .eq("id", data.orderId)
      .maybeSingle();
    if (error || !order) return { error: error?.message ?? "Order not found" };

    let dbEmail: string | null = order.guest_email ?? null;
    let dbName: string | null = null;
    if (order.customer_id) {
      const { data: c } = await supabaseAdmin.from("customers").select("email, name").eq("id", order.customer_id).maybeSingle();
      if (c) { dbEmail = c.email ?? dbEmail; dbName = c.name ?? null; }
    }

    const stripeInfo = await fetchStripeDetails(order.stripe_id as string | null, order.stripe_session_id as string | null);
    const resolvedName = stripeInfo.name || dbName;
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
      created_at: order.created_at,
      utm_source: order.utm_source,
      items: (order.order_items ?? []).map((it: any) => ({
        id: it.id, name: it.name, price: Number(it.price), cover_gradient: it.cover_gradient, cover_url: it.cover_url, product_slug: it.product_slug,
      })),
      customer: { firstName, lastName, email: resolvedEmail, phone: stripeInfo.phone },
      payment: stripeInfo.payment,
    };
  });
