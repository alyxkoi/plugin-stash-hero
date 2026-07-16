// Mailchimp Marketing API helper (server-only).
// Docs: https://mailchimp.com/developer/marketing/api/list-members/
//
// API key format: "<hex>-<datacenter>", e.g. "abc123...-us14".
// Datacenter suffix determines the API base URL.

import { createHash } from "crypto";

function creds() {
  const apiKey = process.env.MAILCHIMP_API_KEY;
  const audienceId = process.env.MAILCHIMP_AUDIENCE_ID;
  if (!apiKey || !audienceId) return null;
  const dc = apiKey.split("-")[1];
  if (!dc) return null;
  return { apiKey, audienceId, base: `https://${dc}.api.mailchimp.com/3.0` };
}

function subscriberHash(email: string) {
  return createHash("md5").update(email.trim().toLowerCase()).digest("hex");
}

function authHeader(apiKey: string) {
  return "Basic " + Buffer.from(`anystring:${apiKey}`).toString("base64");
}

export type MailchimpResult = { ok: true } | { ok: false; error: string; status?: number };

/**
 * Idempotently upsert a subscriber. If the address exists it stays subscribed;
 * if brand new it's added as `subscribed` (single opt-in). Optional tags.
 */
export async function subscribeToMailchimp(opts: {
  email: string;
  tags?: string[];
  mergeFields?: Record<string, string>;
}): Promise<MailchimpResult> {
  const c = creds();
  if (!c) return { ok: false, error: "Mailchimp not configured" };

  const hash = subscriberHash(opts.email);
  try {
    // Upsert member
    const putRes = await fetch(`${c.base}/lists/${c.audienceId}/members/${hash}`, {
      method: "PUT",
      headers: { Authorization: authHeader(c.apiKey), "Content-Type": "application/json" },
      body: JSON.stringify({
        email_address: opts.email,
        status_if_new: "subscribed",
        merge_fields: opts.mergeFields ?? undefined,
      }),
    });
    if (!putRes.ok) {
      const body = await putRes.text();
      console.error(`[mailchimp] upsert failed [${putRes.status}]: ${body}`);
      return { ok: false, error: `Mailchimp ${putRes.status}`, status: putRes.status };
    }

    // Apply tags if any
    if (opts.tags?.length) {
      const tagRes = await fetch(`${c.base}/lists/${c.audienceId}/members/${hash}/tags`, {
        method: "POST",
        headers: { Authorization: authHeader(c.apiKey), "Content-Type": "application/json" },
        body: JSON.stringify({
          tags: opts.tags.map((name) => ({ name, status: "active" })),
        }),
      });
      if (!tagRes.ok) {
        const body = await tagRes.text();
        console.error(`[mailchimp] tag failed [${tagRes.status}]: ${body}`);
        // Non-fatal: subscriber was still added.
      }
    }
    return { ok: true };
  } catch (e) {
    const msg = (e as Error).message ?? "Unknown error";
    console.error("[mailchimp] request threw:", msg);
    return { ok: false, error: msg };
  }
}
