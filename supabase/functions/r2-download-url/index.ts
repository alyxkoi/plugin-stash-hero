// Generates a short-lived signed GET URL for a purchased plugin zip.
// Verifies the requesting user owns a paid order containing the product,
// OR a guest presents a valid Stripe session_id from a paid order that
// includes the product.
import { corsHeaders, adminClient, json } from "../_shared/auth.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { presign } from "../_shared/r2.ts";

async function resolveUser(req: Request) {
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  const token = auth.slice(7);
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, anonKey, { auth: { persistSession: false } });
  const { data } = await sb.auth.getUser(token);
  return data?.user ?? null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const body = await req.json().catch(() => ({}));
    const productId = body?.productId;
    const sessionId: string | undefined = body?.sessionId;
    if (typeof productId !== "string") return json({ error: "productId required" }, 400);

    const admin = adminClient();
    let allowed = false;
    let downloadUserId: string | null = null;

    // Path A: authenticated user with a matching paid order
    const user = await resolveUser(req);
    if (user) {
      const { data: items } = await admin
        .from("order_items")
        .select("id, orders!inner(user_id, status)")
        .eq("product_id", productId)
        .eq("orders.user_id", user.id);
      if ((items ?? []).some((i: any) => ["paid", "completed", "fulfilled"].includes(i.orders?.status))) {
        allowed = true;
        downloadUserId = user.id;
      } else {
        // Admins can download anything
        const { data: roleRow } = await admin.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
        if (roleRow) { allowed = true; downloadUserId = user.id; }
      }
    }

    // Path B: guest checkout — verify by Stripe session_id
    if (!allowed && typeof sessionId === "string" && sessionId.length > 8) {
      const { data: order } = await admin
        .from("orders")
        .select("id, status, user_id")
        .eq("stripe_session_id", sessionId)
        .maybeSingle();
      if (order && ["paid", "completed", "fulfilled"].includes(order.status as string)) {
        const { data: match } = await admin
          .from("order_items")
          .select("id")
          .eq("order_id", order.id as string)
          .eq("product_id", productId)
          .maybeSingle();
        if (match) {
          allowed = true;
          downloadUserId = (order.user_id as string | null) ?? null;
        }
      }
    }

    if (!allowed) return json({ error: "You don't own this plugin." }, 403);

    const { data: fileRow, error: fileErr } = await admin
      .from("product_files")
      .select("zip_url, zip_file_name")
      .eq("product_id", productId)
      .maybeSingle();
    if (fileErr || !fileRow?.zip_url) return json({ error: "Plugin file not found." }, 404);

    // 24h expiry — a 35GB download at ~5MB/s takes ~2h; give buyers plenty
    // of headroom to pause, resume, or complete over an average connection.
    // Signed response-content-disposition forces the browser to save the file
    // (cross-origin `<a download>` attributes are ignored) and preserves the
    // original filename. Download streams directly from R2 — no edge proxy —
    // so file size has no ceiling (2GB / worker limits do not apply).
    const rawName = fileRow.zip_file_name ?? `plugin-${productId}.zip`;
    const safeName = rawName.replace(/[\r\n"\\]/g, "_");
    const url = await presign({
      method: "GET",
      key: fileRow.zip_url,
      expiresIn: 24 * 3600,
      responseContentDisposition: `attachment; filename="${safeName}"; filename*=UTF-8''${encodeURIComponent(rawName)}`,
      responseContentType: "application/zip",
    });

    if (downloadUserId) {
      await admin.from("library_downloads").insert({ user_id: downloadUserId, product_id: productId }).select().maybeSingle();
    }

    return json({ url, filename: fileRow.zip_file_name });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("r2-download-url error", e);
    return json({ error: (e as Error).message ?? "Internal error" }, 500);
  }
});
