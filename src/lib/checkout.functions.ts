import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { type StripeEnv, createStripeClient, getStripeErrorMessage } from "@/lib/stripe.server";

type DiscountResult =
  | { ok: true; code: string; type: "percent" | "fixed"; value: number }
  | { ok: false; error: string };

type CheckoutResult =
  | { clientSecret: string }
  | { error: string };

type ItemInput = { productId: string; qty: number };

function generateOrderNumber(): string {
  // Not used server-side for uniqueness anymore (webhook uses stripe_session_id),
  // but exported for possible future use.
  const n = Math.floor(100000 + Math.random() * 900000);
  return `PW-${n}`;
}

// -------------------- Discount validation --------------------

export const validateDiscount = createServerFn({ method: "POST" })
  .inputValidator((data: { code: string; subtotal: number }) => {
    if (!data.code || typeof data.code !== "string") throw new Error("Code required");
    return data;
  })
  .handler(async ({ data }): Promise<DiscountResult> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const code = data.code.trim().toUpperCase();
    const { data: row } = await supabaseAdmin
      .from("discount_codes")
      .select("code,type,value,status,expires_at,usage_limit,uses")
      .ilike("code", code)
      .maybeSingle();

    if (!row) return { ok: false, error: "That code doesn't exist." };
    if (row.status !== "active") return { ok: false, error: "That code isn't active." };
    if (row.expires_at && new Date(row.expires_at as string).getTime() < Date.now()) {
      return { ok: false, error: "That code has expired." };
    }
    if (row.usage_limit != null && (row.uses ?? 0) >= (row.usage_limit as number)) {
      return { ok: false, error: "That code has reached its usage limit." };
    }
    return {
      ok: true,
      code: row.code as string,
      type: row.type as "percent" | "fixed",
      value: Number(row.value),
    };
  });

// -------------------- Create checkout session --------------------

export const createCheckoutSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: {
    items: ItemInput[];
    discountCode?: string | null;
    utmSource?: string | null;
    returnUrl: string;
    environment: StripeEnv;
  }) => {
    if (!Array.isArray(data.items) || data.items.length === 0) throw new Error("Cart is empty");
    for (const it of data.items) {
      if (typeof it.productId !== "string" || !/^[0-9a-f-]{36}$/i.test(it.productId)) throw new Error("Invalid productId");
      if (!Number.isInteger(it.qty) || it.qty < 1 || it.qty > 20) throw new Error("Invalid qty");
    }
    return data;
  })
  .handler(async ({ data, context }): Promise<CheckoutResult> => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const userId = context.userId;
      const email = context.claims?.email as string | undefined;

      // Load product rows
      const productIds = data.items.map((i) => i.productId);
      const { data: prodRows, error: prodErr } = await supabaseAdmin
        .from("products")
        .select("id,slug,name,price,cover_gradient,status")
        .in("id", productIds);
      if (prodErr) return { error: prodErr.message };
      const products = (prodRows ?? []).filter((p) => p.status === "published");
      if (products.length === 0) return { error: "None of these products are available." };

      // Build ordered items (respect original cart order)
      const byId = new Map(products.map((p) => [p.id as string, p]));
      const items = data.items
        .map((i) => ({ product: byId.get(i.productId), qty: i.qty }))
        .filter((x): x is { product: NonNullable<ReturnType<typeof byId.get>>; qty: number } => !!x.product);

      const subtotalCents = items.reduce((n, i) => n + Math.round(Number(i.product.price) * 100) * i.qty, 0);
      if (subtotalCents <= 0) return { error: "Cart total must be greater than zero." };

      // Discount
      let discountCents = 0;
      let discountCode: string | null = null;
      if (data.discountCode) {
        const codeUpper = data.discountCode.trim().toUpperCase();
        const { data: dc } = await supabaseAdmin
          .from("discount_codes")
          .select("code,type,value,status,expires_at,usage_limit,uses")
          .ilike("code", codeUpper)
          .maybeSingle();
        if (dc && dc.status === "active"
            && (!dc.expires_at || new Date(dc.expires_at as string).getTime() > Date.now())
            && (dc.usage_limit == null || (dc.uses ?? 0) < (dc.usage_limit as number))) {
          if (dc.type === "percent") {
            discountCents = Math.floor((subtotalCents * Number(dc.value)) / 100);
          } else {
            discountCents = Math.min(subtotalCents, Math.round(Number(dc.value) * 100));
          }
          discountCode = dc.code as string;
        }
      }

      const totalCents = Math.max(0, subtotalCents - discountCents);
      if (totalCents < 50) {
        return { error: "Order total must be at least $0.50 to checkout." };
      }

      const stripe = createStripeClient(data.environment);

      // Build one line item per product using price_data; distribute discount pro-rata via unit_amount reduction
      const discountRatio = subtotalCents > 0 ? (subtotalCents - discountCents) / subtotalCents : 1;

      const line_items = items.map((i) => {
        const originalUnit = Math.round(Number(i.product.price) * 100);
        // Apply proportional discount so subtotal * ratio ≈ total
        const discountedUnit = Math.max(1, Math.round(originalUnit * discountRatio));
        return {
          price_data: {
            currency: "usd",
            product_data: {
              name: i.product.name as string,
              metadata: { product_id: i.product.id as string, slug: i.product.slug as string },
            },
            unit_amount: discountedUnit,
          },
          quantity: i.qty,
        };
      });

      const session = await stripe.checkout.sessions.create({
        line_items,
        mode: "payment",
        ui_mode: "embedded_page",
        return_url: `${data.returnUrl}?session_id={CHECKOUT_SESSION_ID}`,
        ...(email && { customer_email: email }),
        payment_intent_data: {
          description: items.length === 1
            ? (items[0].product.name as string)
            : `Plugin Warehouse — ${items.length} items`,
        },
        metadata: {
          userId,
          discount_code: discountCode ?? "",
          utm_source: data.utmSource ?? "",
          subtotal_cents: String(subtotalCents),
          discount_cents: String(discountCents),
          total_cents: String(totalCents),
          items_json: JSON.stringify(items.map((i) => ({
            product_id: i.product.id, slug: i.product.slug, name: i.product.name,
            price: Number(i.product.price), cover_gradient: i.product.cover_gradient, qty: i.qty,
          }))),
        },
      });

      return { clientSecret: session.client_secret ?? "" };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });

// -------------------- Fetch order after checkout return --------------------

export const getOrderBySession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { sessionId: string }) => {
    if (!data.sessionId || typeof data.sessionId !== "string") throw new Error("sessionId required");
    return data;
  })
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("id, number, subtotal, discount, total, discount_code, status, created_at, stripe_session_id, user_id")
      .eq("stripe_session_id", data.sessionId)
      .maybeSingle();

    if (!order || order.user_id !== context.userId) return { order: null, items: [] as any[] };

    const { data: items } = await supabaseAdmin
      .from("order_items")
      .select("id, product_id, product_slug, name, price, cover_gradient")
      .eq("order_id", order.id as string);

    return { order, items: items ?? [] };
  });

export { generateOrderNumber };
