// Batch-sign presigned PUT URLs for a list of parts in an in-flight
// multipart upload. Admin-only. Body: { key, uploadId, partNumbers: number[] }.
// Returns { urls: { [partNumber]: url } } with URLs valid for 6 hours.
import { corsHeaders, requireAdmin, json } from "../_shared/auth.ts";
import { presignUploadPart } from "../_shared/r2.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    await requireAdmin(req);
    const body = await req.json().catch(() => ({}));
    const key: string = body.key;
    const uploadId: string = body.uploadId;
    const partNumbers: number[] = body.partNumbers;

    if (typeof key !== "string" || !key.startsWith("staging/")) return json({ error: "Invalid key" }, 400);
    if (typeof uploadId !== "string" || uploadId.length < 8) return json({ error: "Invalid uploadId" }, 400);
    if (!Array.isArray(partNumbers) || partNumbers.length === 0 || partNumbers.length > 100) {
      return json({ error: "partNumbers must be a non-empty array of at most 100 numbers" }, 400);
    }
    for (const n of partNumbers) {
      if (!Number.isInteger(n) || n < 1 || n > 10000) return json({ error: `Invalid part number: ${n}` }, 400);
    }

    const entries = await Promise.all(
      partNumbers.map(async (n) => [n, await presignUploadPart(key, uploadId, n, 6 * 3600)] as const),
    );
    const urls: Record<number, string> = {};
    for (const [n, url] of entries) urls[n] = url;

    return json({ urls, expiresIn: 6 * 3600 });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("r2-multipart-sign error", e);
    return json({ error: (e as Error).message ?? "Internal error" }, 500);
  }
});
