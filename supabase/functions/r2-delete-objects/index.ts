// Admin-only. Deletes a list of R2 objects. Accepts either raw object keys
// or full public URLs (public URLs get normalized against
// CLOUDFLARE_R2_PUBLIC_URL). Missing objects are treated as success.
import { corsHeaders, requireAdmin, json } from "../_shared/auth.ts";
import { deleteObject } from "../_shared/r2.ts";

function toKey(input: string): string | null {
  if (!input) return null;
  const s = input.trim();
  if (!s) return null;
  const publicBase = (Deno.env.get("CLOUDFLARE_R2_PUBLIC_URL") ?? "").replace(/\/+$/, "");
  if (publicBase && s.startsWith(publicBase + "/")) {
    return decodeURIComponent(s.slice(publicBase.length + 1));
  }
  // Reject arbitrary URLs from other origins to avoid weirdness
  if (/^https?:\/\//i.test(s)) return null;
  // Strip leading slash if present
  return s.replace(/^\/+/, "");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    await requireAdmin(req);
    const body = await req.json().catch(() => ({}));
    const paths: string[] = Array.isArray(body?.paths) ? body.paths : [];
    if (!paths.length) return json({ deleted: 0, skipped: 0 });

    let deleted = 0;
    let skipped = 0;
    const errors: Array<{ key: string; error: string }> = [];
    for (const p of paths) {
      const key = toKey(String(p));
      if (!key) { skipped++; continue; }
      try {
        await deleteObject(key);
        deleted++;
      } catch (e) {
        errors.push({ key, error: (e as Error).message });
      }
    }
    return json({ deleted, skipped, errors });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("r2-delete-objects error", e);
    return json({ error: (e as Error).message ?? "Internal error" }, 500);
  }
});
