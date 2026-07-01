import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { type StripeEnv, createStripeClient, getStripeErrorMessage } from "@/lib/stripe.server";

type DiscountResult =
  | { ok: true; code: string; type: "percent" | "fixed"; value: number }
  | { ok: false; error: string };

type CheckoutResult =
  | { clientSecret: string }
  | { error: string };

type ItemInput = { productId: string; qty: number };

// Optionally resolve the caller's userId from the Authorization header (guest checkout supported).
async function optionalUserId(): Promise<string | null> {
  try {
    const req = getRequest();
    const authHeader = req?.headers?.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) return null;
    const token = authHeader.slice(7);
    if (!token) return null;
    const sb = createClient<Database>(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
    );
    const { data } = await sb.auth.getClaims(token);
    return (data?.claims?.sub as string | undefined) ?? null;
  } catch {
    return null;
  }
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
  .inputValidator((data: {
    items: ItemInput[];
    discountCode?: string | null;
    utmSource?: string | null;
    email?: string | null;
    returnUrl: string;
    environment: StripeEnv;
  }) => {
    if (!Array.isArray(data.items) || data.items.length === 0) throw new Error("Cart is empty");
    for (const it of data.items) {
      if (typeof it.productId !== "string" || !/^[0-9a-f-]{36}$/i.test(it.productId)) throw new Error("Invalid productId");
      if (!Number.isInteger(it.qty) || it.qty < 1 || it.qty > 20) throw new Error("Invalid qty");
    }
    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) throw new Error("Invalid email");
    return data;
  })
  .handler(async ({ data }): Promise<CheckoutResult> => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const userId = await optionalUserId();

      // Load product rows
      const productIds = data.items.map((i) => i.productId);
      const { data: prodRows, error: prodErr } = await supabaseAdmin
        .from("products")
        .select("id,slug,name,price,cover_gradient,cover_url,status")
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
        const discountedUnit = Math.max(1, Math.round(originalUnit * discountRatio));
        const images = i.product.cover_url ? [i.product.cover_url as string] : undefined;
        return {
          price_data: {
            currency: "usd",
            product_data: {
              name: i.product.name as string,
              ...(images && { images }),
              metadata: { product_id: i.product.id as string, slug: i.product.slug as string },
            },
            unit_amount: discountedUnit,
          },
          quantity: i.qty,
        };
      });

      const email = data.email ?? null;

      const session = await stripe.checkout.sessions.create({
        line_items,
        mode: "payment",
        ui_mode: "embedded_page",
        return_url: `${data.returnUrl}?session_id={CHECKOUT_SESSION_ID}`,
        // Force card only; disables Link and any wallet auto-connect that was causing the CVV loop
        payment_method_types: ["card"],
        ...(email && { customer_email: email }),
        payment_intent_data: {
          description: items.length === 1
            ? (items[0].product.name as string)
            : `Plugin Warehouse — ${items.length} items`,
        },
        metadata: {
          userId: userId ?? "",
          guest_email: userId ? "" : (email ?? ""),
          discount_code: discountCode ?? "",
          utm_source: data.utmSource ?? "",
          subtotal_cents: String(subtotalCents),
          discount_cents: String(discountCents),
          total_cents: String(totalCents),
          items_json: JSON.stringify(items.map((i) => ({
            product_id: i.product.id, slug: i.product.slug, name: i.product.name,
            price: Number(i.product.price), cover_gradient: i.product.cover_gradient,
            cover_url: i.product.cover_url, qty: i.qty,
          }))),
        },
      });

      return { clientSecret: session.client_secret ?? "" };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });

// -------------------- Fetch order after checkout return --------------------
// Public: session_id is an unguessable Stripe token. Guests need it to see their order.

export const getOrderBySession = createServerFn({ method: "POST" })
  .inputValidator((data: { sessionId: string }) => {
    if (!data.sessionId || typeof data.sessionId !== "string") throw new Error("sessionId required");
    return data;
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("id, number, subtotal, discount, total, discount_code, status, created_at, stripe_session_id, user_id, guest_email")
      .eq("stripe_session_id", data.sessionId)
      .maybeSingle();

    if (!order) return { order: null, items: [] as any[] };

    const { data: items } = await supabaseAdmin
      .from("order_items")
      .select("id, product_id, product_slug, name, price, cover_gradient, cover_url")
      .eq("order_id", order.id as string);

    return { order, items: items ?? [] };
  });

// -------------------- Guest download URL --------------------
// Guests download using the Stripe session_id + productId. Verifies the order paid for that product.

export const guestDownloadUrl = createServerFn({ method: "POST" })
  .inputValidator((data: { sessionId: string; productId: string }) => {
    if (!data.sessionId || typeof data.sessionId !== "string") throw new Error("sessionId required");
    if (!/^[0-9a-f-]{36}$/i.test(data.productId)) throw new Error("Invalid productId");
    return data;
  })
  .handler(async ({ data }): Promise<{ url?: string; filename?: string; error?: string }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("id, status")
      .eq("stripe_session_id", data.sessionId)
      .maybeSingle();
    if (!order) return { error: "Order not found." };
    if (!["paid", "completed", "fulfilled"].includes(order.status as string)) {
      return { error: "Order not paid yet." };
    }

    const { data: match } = await supabaseAdmin
      .from("order_items")
      .select("id")
      .eq("order_id", order.id as string)
      .eq("product_id", data.productId)
      .maybeSingle();
    if (!match) return { error: "This product isn't part of that order." };

    // Delegate to the R2 signing edge function with service role to avoid duplicating signing logic.
    const url = `${process.env.SUPABASE_URL}/functions/v1/r2-download-url-internal`;
    // Fallback: call presign directly is complex; instead we hit the edge with a service token.
    // Simplest: fetch signed URL via the standard function using a service-scoped shim.
    // Here we just look up product_files and return the raw R2 public path signed via a helper edge fn.
    const { data: file } = await supabaseAdmin
      .from("product_files")
      .select("zip_url, zip_file_name")
      .eq("product_id", data.productId)
      .maybeSingle();
    if (!file?.zip_url) return { error: "Plugin file not found." };

    // Call the signing edge function using the service role key so it can bypass its own auth check.
    const signRes = await fetch(`${process.env.SUPABASE_URL}/functions/v1/r2-download-url`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
      },
      body: JSON.stringify({ productId: data.productId, __trusted: true, __sessionId: data.sessionId }),
    }).catch(() => null);

    if (signRes && signRes.ok) {
      const j = await signRes.json().catch(() => null);
      if (j?.url) return { url: j.url as string, filename: (j.filename as string) ?? file.zip_file_name ?? undefined };
    }
    // If the internal call didn't succeed, at least surface the filename
    return { error: "Could not generate download link. Sign in with your purchase email to download from your library." };
    void url;
  });
