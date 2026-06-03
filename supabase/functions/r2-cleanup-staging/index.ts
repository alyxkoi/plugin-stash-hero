// Cron-only. Deletes anything under staging/ older than 24h.
// Authenticated via service-role apikey header (set in pg_cron job).
import { corsHeaders, json } from "../_shared/auth.ts";
import { listObjects, deleteObject } from "../_shared/r2.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const apiKey = req.headers.get("apikey") ?? req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const allowed = new Set(
    [
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
      Deno.env.get("SUPABASE_ANON_KEY"),
      Deno.env.get("SUPABASE_PUBLISHABLE_KEY"),
    ].filter(Boolean) as string[],
  );
  if (!apiKey || !allowed.has(apiKey)) {
    return new Response("Forbidden", { status: 403, headers: corsHeaders });
  }
  try {
    const items = await listObjects("staging/");
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    let deleted = 0;
    for (const it of items) {
      if (new Date(it.LastModified).getTime() < cutoff) {
        await deleteObject(it.Key);
        deleted++;
      }
    }
    return json({ scanned: items.length, deleted });
  } catch (e) {
    console.error("r2-cleanup-staging", e);
    return json({ error: (e as Error).message ?? "Internal error" }, 500);
  }
});
