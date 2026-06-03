// Generates a short-lived signed GET URL for a purchased plugin zip.
// Verifies the requesting user owns a paid order containing the product.
import { corsHeaders, requireUser, adminClient, json } from "../_shared/auth.ts";
import { presign } from "../_shared/r2.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { user } = await requireUser(req);
    const { productId } = await req.json();
    if (typeof productId !== "string") return json({ error: "productId required" }, 400);

    const admin = adminClient();

    // Verify purchase: user has a paid/refunded-okay order containing this product
    const { data: items, error: itemErr } = await admin
      .from("order_items")
      .select("id, order_id, product_id, orders!inner(user_id, status)")
      .eq("product_id", productId)
      .eq("orders.user_id", user.id);

    if (itemErr) return json({ error: itemErr.message }, 500);
    const owns = (items ?? []).some((i: any) => ["paid", "completed", "fulfilled"].includes(i.orders?.status));
    if (!owns) {
      // Allow admins to download anything
      const { data: roleRow } = await admin.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
      if (!roleRow) return json({ error: "You don't own this plugin." }, 403);
    }

    const { data: fileRow, error: fileErr } = await admin
      .from("product_files")
      .select("zip_url, zip_file_name")
      .eq("product_id", productId)
      .maybeSingle();
    if (fileErr || !fileRow?.zip_url) return json({ error: "Plugin file not found." }, 404);

    const url = await presign({ method: "GET", key: fileRow.zip_url, expiresIn: 600 });

    // Record download
    await admin.from("library_downloads").insert({ user_id: user.id, product_id: productId }).select().maybeSingle();

    return json({ url, filename: fileRow.zip_file_name });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("r2-download-url error", e);
    return json({ error: (e as Error).message ?? "Internal error" }, 500);
  }
});
