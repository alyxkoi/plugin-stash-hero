import { createFileRoute } from "@tanstack/react-router";
import { type StripeEnv, verifyWebhook } from "@/lib/stripe.server";

async function signDownloadUrl(productId: string, sessionId: string): Promise<{ url: string; filename?: string } | null> {
  try {
    const res = await fetch(`${process.env.SUPABASE_URL}/functions/v1/r2-download-url`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: process.env.SUPABASE_PUBLISHABLE_KEY ?? "",
      },
      body: JSON.stringify({ productId, sessionId }),
    });
    const j = await res.json().catch(() => null);
    if (!res.ok || !j?.url) return null;
    return { url: j.url as string, filename: j.filename as string | undefined };
  } catch { return null; }
}

async function sendOrderEmail(args: {
  to: string;
  orderNumber: string;
  total: number;
  items: { name: string; price: number; downloadUrl?: string }[];
}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) { console.log("[webhook] RESEND_API_KEY not set, skipping confirmation email"); return; }
  const from = process.env.RESEND_FROM ?? "Plugin Warehouse <onboarding@resend.dev>";
  const itemsHtml = args.items.map(i => `
    <tr>
      <td style="padding:12px 0;border-bottom:1px solid #eee;">
        <div style="font-weight:600;color:#111;">${escapeHtml(i.name)}</div>
        ${i.downloadUrl ? `<a href="${i.downloadUrl}" style="color:#e11d48;font-size:13px;">Download →</a>` : `<div style="color:#999;font-size:13px;">Download link unavailable — view in your account.</div>`}
      </td>
      <td style="padding:12px 0;border-bottom:1px solid #eee;text-align:right;font-family:monospace;color:#111;">$${i.price.toFixed(2)}</td>
    </tr>`).join("");
  const html = `<!doctype html><html><body style="margin:0;background:#f6f6f6;font-family:-apple-system,Helvetica,Arial,sans-serif;">
    <div style="max-width:560px;margin:0 auto;background:#fff;padding:32px 28px;">
      <div style="font-size:12px;letter-spacing:0.15em;color:#e11d48;font-weight:700;">PLUGIN WAREHOUSE</div>
      <h1 style="font-size:26px;margin:8px 0 4px;color:#111;">Order confirmed</h1>
      <p style="color:#555;margin:0 0 24px;">Order <strong>${escapeHtml(args.orderNumber)}</strong> — thanks for the pickup.</p>
      <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">${itemsHtml}
        <tr><td style="padding:14px 0;font-weight:700;color:#111;">Total</td><td style="padding:14px 0;text-align:right;font-weight:700;font-family:monospace;color:#111;">$${args.total.toFixed(2)}</td></tr>
      </table>
      <p style="color:#555;font-size:13px;">Download links above are secure and time-limited. You can always re-download from your account.</p>
    </div></body></html>`;
  try {
    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ from, to: [args.to], subject: `Order ${args.orderNumber} — your downloads`, html }),
    });
    if (!resp.ok) console.error("[webhook] resend send failed", resp.status, await resp.text().catch(() => ""));
  } catch (e) { console.error("[webhook] resend error", e); }
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}


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
