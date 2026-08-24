import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { sendEmail, FROM_CONTACT, escapeHtml } from "@/lib/resend.server";

const ResetSchema = z.object({
  email: z.string().trim().email().max(255),
  redirectTo: z.string().url().refine(isAllowedResetRedirect, "Invalid reset destination"),
});

function isAllowedResetRedirect(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.pathname !== "/reset-password") return false;
    const configured = [process.env.PUBLIC_SITE_URL, process.env.SITE_URL]
      .filter(Boolean)
      .map((origin) => new URL(origin!).origin);
    const production = ["https://thepluginwarehouse.com", "https://www.thepluginwarehouse.com"];
    if ([...configured, ...production].includes(url.origin)) return true;
    if (process.env.NODE_ENV !== "production" && ["localhost", "127.0.0.1"].includes(url.hostname)) return true;
    return url.protocol === "https:" && [
      "lovable.app",
      "lovableproject.com",
      "lovableproject-dev.com",
      "gpt-eng.com",
      "gptengineer.run",
    ].some((zone) => url.hostname === zone || url.hostname.endsWith(`.${zone}`));
  } catch {
    return false;
  }
}

/**
 * Sends a password-reset email through Resend so delivery is reliable on our
 * verified domain (default Supabase SMTP is unreliable). We generate a real
 * Supabase recovery link with the service role, then send it ourselves.
 *
 * Always returns { ok: true } to avoid leaking whether an email is registered.
 */
export const sendPasswordResetEmail = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => ResetSchema.parse(data))
  .handler(async ({ data }) => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: linkData, error } = await supabaseAdmin.auth.admin.generateLink({
        type: "recovery",
        email: data.email,
        options: { redirectTo: data.redirectTo },
      });
      if (error || !linkData?.properties?.action_link) {
        // Missing user or other issue — silently succeed to avoid enumeration.
        console.warn("[auth-email] generateLink skipped:", error?.message);
        return { ok: true as const };
      }
      const actionLink = linkData.properties.action_link;
      const send = await sendEmail({
        from: FROM_CONTACT,
        to: data.email,
        subject: "Reset your Plugin Warehouse password",
        html: renderResetHtml(actionLink),
        text: `Reset your Plugin Warehouse password:\n\n${actionLink}\n\nThis link expires in 1 hour. If you didn't request it, ignore this email.`,
      });
      if (send.error) console.error("[auth-email] resend failed:", send.error);
      return { ok: true as const };
    } catch (e) {
      console.error("[auth-email] exception:", e);
      return { ok: true as const };
    }
  });

function renderResetHtml(link: string): string {
  const BG_DEEP = "#0A0018";
  const BG_CARD = "#13002C";
  const BORDER = "#2A0F5A";
  const TEXT = "#FFFFFF";
  const MUTED = "rgba(255,255,255,0.65)";
  const DIM = "rgba(255,255,255,0.45)";
  const ACCENT = "#FF003C";
  const ACCENT_GLOW = "#FF1F5C";
  return `<!doctype html>
<html><head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background:${BG_DEEP};font-family:'Helvetica Neue',Arial,sans-serif;color:${TEXT};">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${BG_DEEP};padding:40px 16px;">
    <tr><td align="center">
      <table role="presentation" width="560" cellspacing="0" cellpadding="0" style="max-width:560px;width:100%;background:${BG_CARD};border:1px solid ${BORDER};border-radius:16px;overflow:hidden;">
        <tr><td style="padding:28px 30px 8px 30px;">
          <div style="font-size:11px;letter-spacing:0.28em;color:${ACCENT};text-transform:uppercase;font-weight:800;margin-bottom:12px;">Reset your password</div>
          <h1 style="margin:0;font-size:32px;line-height:1.1;color:${TEXT};font-weight:900;letter-spacing:-0.02em;">Let's get you back in.</h1>
          <p style="margin:14px 0 0 0;font-size:15px;line-height:1.55;color:${MUTED};">Click the button below to set a new password. The link expires in 1 hour.</p>
        </td></tr>
        <tr><td style="padding:24px 30px 8px 30px;">
          <a href="${escapeHtml(link)}" style="display:inline-block;background:${ACCENT};background-image:linear-gradient(180deg, ${ACCENT_GLOW} 0%, ${ACCENT} 100%);color:#ffffff;text-decoration:none;padding:14px 22px;border-radius:10px;font-size:12px;font-weight:800;letter-spacing:0.14em;text-transform:uppercase;">Reset password →</a>
        </td></tr>
        <tr><td style="padding:18px 30px 26px 30px;">
          <div style="font-size:12px;color:${DIM};line-height:1.6;">Or paste this URL in your browser:<br/><span style="color:${MUTED};word-break:break-all;">${escapeHtml(link)}</span></div>
          <div style="margin-top:18px;font-size:12px;color:${DIM};line-height:1.6;">Didn't request this? You can safely ignore this email — your password won't change.</div>
        </td></tr>
        <tr><td style="padding:18px 30px 26px 30px;border-top:1px solid ${BORDER};background:${BG_DEEP};">
          <div style="font-size:10px;letter-spacing:0.24em;color:${DIM};text-transform:uppercase;font-weight:700;">Plugin Warehouse</div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}
