// Generates a short-lived signed GET URL for a purchased plugin zip.
// Verifies the requesting user owns a paid order containing the product,
// OR a guest presents a valid Stripe session_id from a paid order that
// includes the product.
import { corsHeaders, adminClient, json } from "../_shared/auth.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { presign, r2PublicUrl } from "../_shared/r2.ts";



// Live entitlement check: a fully refunded order ("refunded") loses access
// immediately. "partial" (partially refunded) keeps access.
const ENTITLED_STATUSES = ["paid", "completed", "fulfilled", "partial"];

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
      if ((items ?? []).some((i: any) => ENTITLED_STATUSES.includes(i.orders?.status))) {
        allowed = true;
        downloadUserId = user.id;
      }

      // Gifted plugins (admin grants) get the identical download experience.
      if (!allowed) {
        const { data: grant } = await admin
          .from("plugin_grants")
          .select("id")
          .eq("customer_id", user.id)
          .eq("product_id", productId)
          .is("revoked_at", null)
          .maybeSingle();
        if (grant) { allowed = true; downloadUserId = user.id; }
      }

      if (!allowed) {
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
      if (order && ENTITLED_STATUSES.includes(order.status as string)) {
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

    // SECURITY: download links must expire. We issue a short-lived (15 min)
    // SigV4 presigned URL against the R2 S3 endpoint. The browser navigates
    // there directly and streams bytes from R2 (Range requests honored), so
    // nothing is buffered in JS. The public custom domain is NOT used because
    // it serves objects unauthenticated forever — a leaked link there would
    // let anyone download a paid plugin.
    const filename = fileRow.zip_file_name || fileRow.zip_url.split("/").pop() || "download.zip";
    const url = await presign({
      method: "GET",
      key: fileRow.zip_url,
      expiresIn: 900,
      responseContentDisposition: `attachment; filename="${filename.replace(/"/g, "")}"`,
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

