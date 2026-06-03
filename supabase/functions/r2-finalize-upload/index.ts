// Server-side copies a staging zip into its final category folder and deletes the staging copy.
// Admin-only. Returns the final object key (NEVER a public URL — zips are private).
import { corsHeaders, requireAdmin, json } from "../_shared/auth.ts";
import { copyObject, deleteObject, slugify, sanitizeFilename } from "../_shared/r2.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    await requireAdmin(req);
    const { stagingKey, category, productSlug, version } = await req.json();
    if (typeof stagingKey !== "string" || !stagingKey.startsWith("staging/")) {
      return json({ error: "Invalid stagingKey" }, 400);
    }
    const catSlug = category ? slugify(String(category)) : "uncategorized";
    const slug = slugify(String(productSlug || "plugin"));
    const ver = sanitizeFilename(String(version || "1.0"));
    const finalKey = `${catSlug}/${slug}-v${ver}.zip`;

    await copyObject(stagingKey, finalKey);
    await deleteObject(stagingKey);

    return json({ objectKey: finalKey });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("r2-finalize-upload error", e);
    return json({ error: (e as Error).message ?? "Internal error" }, 500);
  }
});
