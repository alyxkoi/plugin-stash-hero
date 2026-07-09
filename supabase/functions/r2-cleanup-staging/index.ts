// Cron-only. Deletes anything under staging/ older than 24h that isn't
// referenced by a published product_files row. Staging keys are now used
// as the permanent object key (publish no longer copies to a final folder),
// so we must not delete a staging object that a product depends on.
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
    const items = await listObjects("staging/");
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    const stale = items.filter(it => new Date(it.LastModified).getTime() < cutoff);
    if (stale.length === 0) return json({ scanned: items.length, deleted: 0 });

    // Skip anything referenced by a product file — those staging keys ARE the
    // permanent keys after the finalize-free publish flow.
    const admin = adminClient();
    const { data: refs, error } = await admin
      .from("product_files")
      .select("zip_url")
      .in("zip_url", stale.map(s => s.Key));
    if (error) throw error;
    const referenced = new Set((refs ?? []).map((r: any) => r.zip_url));

    let deleted = 0;
    for (const it of stale) {
      if (referenced.has(it.Key)) continue;
      await deleteObject(it.Key);
      deleted++;
    }
    return json({ scanned: items.length, deleted, skipped: stale.length - deleted });
  } catch (e) {
    console.error("r2-cleanup-staging", e);
    return json({ error: (e as Error).message ?? "Internal error" }, 500);
  }
});
