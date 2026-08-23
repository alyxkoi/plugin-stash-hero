// Resend email helper. Server-only.
// All outbound email uses the verified thepluginwarehouse.com domain.

export const FROM_ORDERS = "The Plugin Warehouse <hello@thepluginwarehouse.com>";
export const FROM_CONTACT = "The Plugin Warehouse <hello@thepluginwarehouse.com>";
export const CONTACT_INBOX = "pluginwh@gmail.com";

type SendEmailInput = {
  from: string;
  to: string | string[];
  subject: string;
  html: string;
  reply_to?: string | string[];
  text?: string;
};

export async function sendEmail(input: SendEmailInput): Promise<{ id?: string; error?: string }> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.error("[resend] RESEND_API_KEY is not set");
    return { error: "RESEND_API_KEY not configured" };
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    });
    const data = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
    if (!res.ok) {
      console.error("[resend] send failed", res.status, data);
      return { error: data.message ?? `HTTP ${res.status}` };
    }
    return { id: data.id };
  } catch (e) {
    console.error("[resend] exception", e);
    return { error: (e as Error).message };
  }
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
