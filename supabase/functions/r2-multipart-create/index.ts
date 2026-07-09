// Initiate a multipart upload for a large staging zip. Admin-only.
// Returns { key, uploadId, partSize, totalParts }.
import { corsHeaders, requireAdmin, json } from "../_shared/auth.ts";
import { sanitizeFilename, createMultipartUpload } from "../_shared/r2.ts";

// 100 MB parts. R2 allows up to 10,000 parts × 5 GB, so this covers 50 GB
// well under the S3 spec limits and keeps each part upload short enough
// that a flaky network only ever loses one 100 MB chunk on retry.
const PART_SIZE = 100 * 1024 * 1024;
const MAX_SIZE  = 50 * 1024 * 1024 * 1024; // 50 GB hard cap

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { user } = await requireAdmin(req);
    const body = await req.json().catch(() => ({}));
    const filename = sanitizeFilename(String(body.filename ?? "file"));
    const size = Number(body.size ?? 0);
    if (!(size > 0)) return json({ error: "Invalid file size" }, 400);
    if (size > MAX_SIZE) return json({ error: "File exceeds 50GB cap" }, 400);

    const ts = Date.now();
    const key = `staging/${user.id}/${ts}-${filename}`;
    const uploadId = await createMultipartUpload(key);
    const totalParts = Math.max(1, Math.ceil(size / PART_SIZE));

    return json({ key, uploadId, partSize: PART_SIZE, totalParts });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("r2-multipart-create error", e);
    return json({ error: (e as Error).message ?? "Internal error" }, 500);
  }
});
