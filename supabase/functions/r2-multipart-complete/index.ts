// Finalize a multipart upload. Admin-only.
// Body: { key, uploadId, parts: Array<{ PartNumber: number; ETag: string }> }
// Returns { objectKey } (same as staging key — the finalize-upload function
// then copies staging → final category folder just like the small-file path).
import { corsHeaders, requireAdmin, json } from "../_shared/auth.ts";
import { completeMultipartUpload } from "../_shared/r2.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    await requireAdmin(req);
    const body = await req.json().catch(() => ({}));
    const key: string = body.key;
    const uploadId: string = body.uploadId;
    const parts: Array<{ PartNumber: number; ETag: string }> = body.parts;

    if (typeof key !== "string" || !key.startsWith("staging/")) return json({ error: "Invalid key" }, 400);
    if (typeof uploadId !== "string" || uploadId.length < 8) return json({ error: "Invalid uploadId" }, 400);
    if (!Array.isArray(parts) || parts.length === 0) return json({ error: "parts required" }, 400);
    for (const p of parts) {
      if (!p || typeof p.PartNumber !== "number" || typeof p.ETag !== "string" || !p.ETag) {
        return json({ error: "Each part must have { PartNumber, ETag }" }, 400);
      }
    }

    await completeMultipartUpload(key, uploadId, parts);
    return json({ objectKey: key });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("r2-multipart-complete error", e);
    return json({ error: (e as Error).message ?? "Internal error" }, 500);
  }
});
