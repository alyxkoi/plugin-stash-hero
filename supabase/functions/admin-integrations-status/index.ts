// Returns real status for integrations shown on Dashboard → Settings.
// Admin-only. Reads from project secrets and lists R2 bucket objects.
import { corsHeaders, requireAdmin, json } from "../_shared/auth.ts";
import { listObjects, bucket } from "../_shared/r2.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    await requireAdmin(req);

    // R2 stats — real ListObjectsV2 against the configured bucket.
    let r2: {
      bucket: string;
      connected: boolean;
      fileCount: number;
      totalBytes: number;
      avgBytes: number;
      error?: string;
    } = {
      bucket: bucket() || "",
      connected: false,
      fileCount: 0,
      totalBytes: 0,
      avgBytes: 0,
    };
    try {
      const items = await listObjects("");
      const totalBytes = items.reduce((a, i) => a + (i.Size ?? 0), 0);
      r2 = {
        bucket: bucket(),
        connected: true,
        fileCount: items.length,
        totalBytes,
        avgBytes: items.length ? Math.round(totalBytes / items.length) : 0,
      };
    } catch (e) {
      r2.error = (e as Error).message;
    }

    // Stripe — infer mode from which gateway key is configured.
    const stripeLive = !!Deno.env.get("STRIPE_LIVE_API_KEY");
    const stripeSandbox = !!Deno.env.get("STRIPE_SANDBOX_API_KEY");
    const stripe = {
      connected: stripeLive || stripeSandbox,
      mode: stripeLive ? "live" : stripeSandbox ? "test" : null,
    };

    // OpenAI / Mailchimp — secret presence only (no live ping).
    const openai = { connected: !!Deno.env.get("OPENAI_API_KEY") };
    const mailchimp = {
      connected: !!(Deno.env.get("MAILCHIMP_API_KEY") && Deno.env.get("MAILCHIMP_AUDIENCE_ID")),
    };

    return json({ r2, stripe, openai, mailchimp });
  } catch (e) {
    if (e instanceof Response) return e;
    return json({ error: (e as Error).message ?? "Internal error" }, 500);
  }
});
