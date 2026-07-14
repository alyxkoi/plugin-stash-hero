import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { type StripeEnv, createStripeClient, getStripeErrorMessage } from "@/lib/stripe.server";
import { finalizeOrder, type FulfillItem } from "@/lib/order-fulfill.server";

type DiscountResult =
  | {
      ok: true;
      code: string;
      type: "percent" | "fixed";
      value: number;
      scope: "all" | "categories" | "selected";
      categories: string[];
      productIds: string[];
    }
  | { ok: false; error: string };

type CheckoutResult =
  | { clientSecret: string }
  | { freeSessionId: string }
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
      .select("id,code,type,value,status,expires_at,usage_limit,uses,scope,categories")
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
    const scope = ((row as any).scope as "all" | "categories" | "selected" | undefined) ?? "all";
    let productIds: string[] = [];
    if (scope === "selected") {
      const { data: links } = await (supabaseAdmin as any)
        .from("discount_code_products")
        .select("product_id")
        .eq("discount_code_id", (row as any).id);
      productIds = (links ?? []).map((r: any) => r.product_id as string);
    }
    return {
      ok: true,
      code: row.code as string,
      type: row.type as "percent" | "fixed",
      value: Number(row.value),
      scope,
      categories: (((row as any).categories as string[]) ?? []).map((c) => c.toLowerCase()),
      productIds,
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
        .select("id,slug,name,price,category,cover_gradient,cover_url,status")
        .in("id", productIds);
      if (prodErr) return { error: prodErr.message };
      const products = (prodRows ?? []).filter((p) => p.status === "published");
      if (products.length === 0) return { error: "None of these products are available." };

      // Load currently-active sales and their scope details so we apply the same
      // discount to Stripe that the storefront/cart already shows the buyer.
      // "Effectively active" = not a draft AND inside the sale window. This avoids stale
      // stored labels like "scheduled" or "ended" controlling the Stripe price.
      const nowIso = new Date().toISOString();
      const { data: activeSales } = await supabaseAdmin
        .from("sale_events")
        .select("id, discount_pct, scope, categories")
        .neq("status", "draft")
        .lte("start_at", nowIso)
        .gte("end_at", nowIso);
      const saleList = (activeSales ?? []) as Array<{ id: string; discount_pct: number; scope: string; categories: string[] | null }>;
      let saleProdMap = new Map<string, Set<string>>(); // sale_id -> product_ids
      if (saleList.length > 0) {
        const { data: jr } = await supabaseAdmin
          .from("sale_event_products")
          .select("sale_event_id, product_id")
          .in("sale_event_id", saleList.map((s) => s.id));
        for (const j of jr ?? []) {
          const set = saleProdMap.get(j.sale_event_id as string) ?? new Set<string>();
          set.add(j.product_id as string);
          saleProdMap.set(j.sale_event_id as string, set);
        }
      }
      function saleUnitFor(p: { id: string; price: number; category: string | null }): number {
        let bestPct = 0;
        for (const s of saleList) {
          const cats = (s.categories ?? []).map((c) => c.toLowerCase());
          const applies =
            s.scope === "all" ||
            (s.scope === "categories" && !!p.category && cats.includes(p.category.toLowerCase())) ||
            (s.scope === "selected" && (saleProdMap.get(s.id)?.has(p.id) ?? false));
          if (applies && s.discount_pct > bestPct) bestPct = s.discount_pct;
        }
        return Math.round(Number(p.price) * (100 - bestPct)) / 100;
      }

      // Build ordered items (respect original cart order) with sale-adjusted unit price.
      const byId = new Map(products.map((p) => [p.id as string, p]));
      const items = data.items
        .map((i) => {
          const product = byId.get(i.productId);
          if (!product) return null;
          const salePrice = saleUnitFor({
            id: product.id as string,
            price: Number(product.price),
            category: (product.category as string | null) ?? null,
          });
          return { product, qty: i.qty, unitPrice: salePrice };
        })
        .filter((x): x is { product: NonNullable<ReturnType<typeof byId.get>>; qty: number; unitPrice: number } => !!x);

      const subtotalCents = items.reduce((n, i) => n + Math.round(i.unitPrice * 100) * i.qty, 0);
      if (subtotalCents <= 0) return { error: "Cart total must be greater than zero." };

      // Promo code (applied on top of any sale-event pricing already baked into unitPrice)
      let discountCents = 0;
      let discountCode: string | null = null;
      if (data.discountCode) {
        const codeUpper = data.discountCode.trim().toUpperCase();
        const { data: dc } = await supabaseAdmin
          .from("discount_codes")
          .select("id,code,type,value,status,expires_at,usage_limit,uses,scope,categories")
          .ilike("code", codeUpper)
          .maybeSingle();
        if (dc && dc.status === "active"
            && (!dc.expires_at || new Date(dc.expires_at as string).getTime() > Date.now())
            && (dc.usage_limit == null || (dc.uses ?? 0) < (dc.usage_limit as number))) {
          const scope = ((dc as any).scope as "all" | "categories" | "selected" | undefined) ?? "all";
          const codeCats = (((dc as any).categories as string[]) ?? []).map((c) => c.toLowerCase());
          let allowedIds: Set<string> | null = null;
          if (scope === "selected") {
            const { data: links } = await (supabaseAdmin as any)
              .from("discount_code_products")
              .select("product_id")
              .eq("discount_code_id", (dc as any).id);
            allowedIds = new Set((links ?? []).map((r: any) => r.product_id as string));
          }
          // Compute the subtotal of items eligible for this code.
          const eligibleCents = items.reduce((n, i) => {
            const pid = i.product.id as string;
            const pcat = ((i.product.category as string | null) ?? "").toLowerCase();
            const eligible =
              scope === "all" ||
              (scope === "categories" && !!pcat && codeCats.includes(pcat)) ||
              (scope === "selected" && !!allowedIds && allowedIds.has(pid));
            return eligible ? n + Math.round(i.unitPrice * 100) * i.qty : n;
          }, 0);
          if (eligibleCents > 0) {
            if (dc.type === "percent") {
              discountCents = Math.floor((eligibleCents * Number(dc.value)) / 100);
            } else {
              discountCents = Math.min(eligibleCents, Math.round(Number(dc.value) * 100));
            }
            discountCode = dc.code as string;
          }
        }
      }

      const totalCents = Math.max(0, subtotalCents - discountCents);

      // Free-checkout path: total is $0 (all freebies, or discount zeroed it out).
      // Skip Stripe entirely — create the order directly and hand the client a
      // synthetic session id so the return page + download links work the same.
      if (totalCents === 0) {
        const freeSessionId = `free_${crypto.randomUUID()}`;
        const fulfillItems: FulfillItem[] = items.map((i) => ({
          product_id: i.product.id as string,
          slug: i.product.slug as string,
          name: i.product.name as string,
          price: i.unitPrice,
          cover_gradient: (i.product.cover_gradient as string | null) ?? null,
          cover_url: (i.product.cover_url as string | null) ?? null,
          qty: i.qty,
        }));
        const guestEmail = data.email ?? null;
        const finalized = await finalizeOrder({
          sessionId: freeSessionId,
          userId: userId ?? null,
          guestEmail: userId ? guestEmail : guestEmail,
          discountCode,
          utmSource: data.utmSource ?? null,
          subtotalCents,
          discountCents,
          totalCents,
          items: fulfillItems,
          stripePaymentIntentId: null,
        });
        if (!finalized) return { error: "Could not complete free order." };
        return { freeSessionId };
      }

      if (totalCents < 50) {
        return { error: "Order total must be at least $0.50 to checkout." };
      }



      const stripe = createStripeClient(data.environment);

      // Distribute any promo-code discount pro-rata across the sale-adjusted unit prices.
      const promoRatio = subtotalCents > 0 ? (subtotalCents - discountCents) / subtotalCents : 1;

      const line_items = items.map((i) => {
        const saleUnitCents = Math.round(i.unitPrice * 100);
        const finalUnit = Math.max(1, Math.round(saleUnitCents * promoRatio));
        const images = i.product.cover_url ? [i.product.cover_url as string] : undefined;
        return {
          price_data: {
            currency: "usd",
            product_data: {
              name: i.product.name as string,
              ...(images && { images }),
              metadata: { product_id: i.product.id as string, slug: i.product.slug as string },
            },
            unit_amount: finalUnit,
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
        payment_method_types: ["card", "klarna", "affirm"],
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

    // Delegate signing to the r2-download-url edge function (session_id path).
    const signRes = await fetch(`${process.env.SUPABASE_URL}/functions/v1/r2-download-url`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: process.env.SUPABASE_PUBLISHABLE_KEY ?? "",
      },
      body: JSON.stringify({ productId: data.productId, sessionId: data.sessionId }),
    }).catch(() => null);

    if (!signRes) return { error: "Download service unavailable." };
    const j = await signRes.json().catch(() => null);
    if (!signRes.ok || !j?.url) return { error: (j?.error as string) ?? "Could not generate download link." };
    return { url: j.url as string, filename: (j.filename as string) ?? undefined };
  });
