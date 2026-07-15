// Cron-only. Scans staging/ and deletes ONLY objects that are (a) older than
// 24h AND (b) not referenced by ANY database record. Real product files live
// under staging/ and their keys are the permanent object keys, so this must
// never delete anything a product depends on.
import { corsHeaders, adminClient, json } from "../_shared/auth.ts";
import { listObjects, deleteObject } from "../_shared/r2.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const apiKey = req.headers.get("apikey") ?? req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!apiKey || !serviceKey || apiKey !== serviceKey) {
    return new Response("Forbidden", { status: 403, headers: corsHeaders });
  }
  try {
    const admin = adminClient();

    // Build a set of every R2 object key referenced anywhere in the database.
    // - product_files.zip_url          → object keys (e.g. "staging/foo.zip")
    // - products.cover_url             → full public URLs, we extract the key
    // - order_items.cover_url          → full public URLs, we extract the key
    const referenced = new Set<string>();
    const extractKey = (val: string | null | undefined) => {
      if (!val) return;
      // Full URL → strip origin, leading slash, and bucket prefix if present
      let k = val.trim();
      if (/^https?:\/\//i.test(k)) {
        try { k = new URL(k).pathname.replace(/^\/+/, ""); } catch { /* ignore */ }
      }
      if (k) referenced.add(k);
    };

    const [pf, pr, oi] = await Promise.all([
      admin.from("product_files").select("zip_url"),
      admin.from("products").select("cover_url"),
      admin.from("order_items").select("cover_url"),
    ]);
    if (pf.error) throw pf.error;
    if (pr.error) throw pr.error;
    if (oi.error) throw oi.error;
    for (const r of pf.data ?? []) extractKey((r as any).zip_url);
    for (const r of pr.data ?? []) extractKey((r as any).cover_url);
    for (const r of oi.data ?? []) extractKey((r as any).cover_url);

    const items = await listObjects("staging/");
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;

    let deleted = 0;
    let keptReferenced = 0;
    let keptRecent = 0;
    for (const it of items) {
      if (referenced.has(it.Key)) { keptReferenced++; continue; }
      if (new Date(it.LastModified).getTime() >= cutoff) { keptRecent++; continue; }
      await deleteObject(it.Key);
      deleted++;
    }

    return json({
      scanned: items.length,
      referenced_in_db: referenced.size,
      kept_referenced: keptReferenced,
      kept_recent: keptRecent,
      deleted,
    });
  } catch (e) {
    console.error("r2-cleanup-staging", e);
    return json({ error: (e as Error).message ?? "Internal error" }, 500);
  }
});
