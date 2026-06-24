// Generates a 15-min presigned PUT URL for either a staging plugin zip
// or a public cover image. Admin-only.
import { corsHeaders, requireAdmin, json } from "../_shared/auth.ts";
import { presign, sanitizeFilename, slugify, r2PublicUrl } from "../_shared/r2.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { user } = await requireAdmin(req);
    const body = await req.json().catch(() => ({}));
    const kind: "zip" | "cover" = body.kind;
    const filename: string = sanitizeFilename(String(body.filename ?? "file"));
    const contentType: string = String(body.contentType ?? "application/octet-stream");
    const size: number = Number(body.size ?? 0);

    if (!["zip", "cover"].includes(kind)) return json({ error: "Invalid kind" }, 400);
    if (kind === "zip" && size > 5 * 1024 * 1024 * 1024) return json({ error: "Max 5GB" }, 400);
    if (kind === "cover" && size > 5 * 1024 * 1024) return json({ error: "Cover max 5MB" }, 400);

    const ts = Date.now();
    const ext = (filename.split(".").pop() || "bin").toLowerCase();
    const base = slugify(filename.replace(/\.[^.]+$/, "")) || "cover";
    const key = kind === "zip"
      ? `staging/${user.id}/${ts}-${filename}`
      : `covers/${ts}-${base}.${ext}`;

    const uploadUrl = await presign({ method: "PUT", key, contentType, expiresIn: 900 });
    const publicUrl = kind === "cover" ? r2PublicUrl(key) : null;
    return json({ uploadUrl, objectKey: key, publicUrl });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("r2-upload-url error", e);
    return json({ error: (e as Error).message ?? "Internal error" }, 500);
  }
});
