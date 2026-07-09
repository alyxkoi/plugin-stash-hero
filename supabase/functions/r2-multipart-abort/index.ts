// Abort an in-flight multipart upload and free R2 storage for the partial parts.
// Admin-only. Body: { key, uploadId }.
import { corsHeaders, requireAdmin, json } from "../_shared/auth.ts";
import { abortMultipartUpload } from "../_shared/r2.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    await requireAdmin(req);
    const body = await req.json().catch(() => ({}));
    const key: string = body.key;
    const uploadId: string = body.uploadId;
    if (typeof key !== "string" || !key.startsWith("staging/")) return json({ error: "Invalid key" }, 400);
    if (typeof uploadId !== "string" || uploadId.length < 8) return json({ error: "Invalid uploadId" }, 400);
    await abortMultipartUpload(key, uploadId);
    return json({ ok: true });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("r2-multipart-abort error", e);
    return json({ error: (e as Error).message ?? "Internal error" }, 500);
  }
});
