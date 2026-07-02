import { escapeHtml } from "./resend.server";

type OrderItem = { name: string; price: number; downloadUrl: string };

// Brand palette (kept inline for email-client safety)
const BG_DEEP = "#0A0018";
const BG_CARD = "#13002C";
const BG_ROW = "#1F0540";
const BORDER = "#2A0F5A";
const TEXT = "#FFFFFF";
const MUTED = "rgba(255,255,255,0.65)";
const DIM = "rgba(255,255,255,0.45)";
const ACCENT = "#FF003C";
const ACCENT_GLOW = "#FF1F5C";

export function renderOrderConfirmation(opts: {
  orderNumber: string;
  customerEmail: string;
  items: OrderItem[];
  total: number;
  orderUrl: string;
}): { html: string; text: string; subject: string } {
  const { orderNumber, items, total, orderUrl } = opts;

  const rows = items
    .map(
      (it, idx) => `
      <tr>
        <td colspan="2" style="padding:${idx === 0 ? "0" : "10px"} 0 0 0;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${BG_ROW};border:1px solid ${BORDER};border-radius:14px;">
            <tr>
              <td style="padding:20px 22px;">
                <div style="font-family:'Helvetica Neue',Arial,sans-serif;font-size:10px;letter-spacing:0.22em;color:${DIM};text-transform:uppercase;font-weight:700;margin-bottom:8px;">Plugin</div>
                <div style="font-family:'Helvetica Neue',Arial,sans-serif;font-size:18px;line-height:1.25;color:${TEXT};font-weight:800;letter-spacing:-0.01em;">${escapeHtml(it.name)}</div>
                <div style="font-family:'JetBrains Mono',ui-monospace,Menlo,monospace;font-size:13px;color:${MUTED};margin-top:6px;">$${it.price.toFixed(2)}</div>
                <div style="margin-top:16px;">
                  <a href="${it.downloadUrl}" style="display:inline-block;background:${ACCENT};background-image:linear-gradient(180deg, ${ACCENT_GLOW} 0%, ${ACCENT} 100%);color:#ffffff;text-decoration:none;padding:11px 18px;border-radius:10px;font-family:'Helvetica Neue',Arial,sans-serif;font-size:12px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;">Download ↓</a>
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>`,
    )
    .join("");

  const html = `<!doctype html>
<html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Order ${escapeHtml(orderNumber)}</title></head>
<body style="margin:0;padding:0;background:${BG_DEEP};font-family:'Helvetica Neue',Arial,sans-serif;color:${TEXT};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${BG_DEEP};">Your Plugin Warehouse order ${escapeHtml(orderNumber)} — download links inside.</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${BG_DEEP};padding:36px 16px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%;background:${BG_CARD};border:1px solid ${BORDER};border-radius:20px;overflow:hidden;">

        <!-- Brand bar -->
        <tr><td style="padding:22px 32px;border-bottom:1px solid ${BORDER};background:${BG_DEEP};">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td>
                <img src="https://plugin-stash-hero.lovable.app/__l5e/assets-v1/fa4d9bc4-3fe5-40bc-9957-596235a7d11e/logo.png" alt="Plugin Warehouse" height="40" style="display:block;height:40px;width:auto;border:0;outline:none;text-decoration:none;" />
              </td>
              <td align="right" style="font-family:'JetBrains Mono',ui-monospace,Menlo,monospace;font-size:11px;color:${DIM};letter-spacing:0.1em;">
                ${escapeHtml(orderNumber)}
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- Headline -->
        <tr><td style="padding:44px 32px 8px 32px;">
          <div style="font-family:'Helvetica Neue',Arial,sans-serif;font-size:11px;letter-spacing:0.28em;color:${ACCENT};text-transform:uppercase;font-weight:800;margin-bottom:14px;">Order confirmed</div>
          <h1 style="margin:0;font-family:'Helvetica Neue',Arial,sans-serif;font-size:38px;line-height:1.05;color:${TEXT};font-weight:900;letter-spacing:-0.02em;">You're loaded up.</h1>
          <p style="margin:14px 0 0 0;font-size:15px;line-height:1.55;color:${MUTED};">
            Your plugins are ready. Grab them below — the links stay tied to this order, so hang on to this email.
          </p>
        </td></tr>

        <!-- Items -->
        <tr><td style="padding:28px 32px 8px 32px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:separate;border-spacing:0;">
            ${rows}
          </table>
        </td></tr>

        <!-- Total -->
        <tr><td style="padding:24px 32px 8px 32px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-top:1px dashed ${BORDER};">
            <tr>
              <td style="padding:22px 0 0 0;font-family:'Helvetica Neue',Arial,sans-serif;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:${DIM};font-weight:700;">Total paid</td>
              <td align="right" style="padding:22px 0 0 0;font-family:'JetBrains Mono',ui-monospace,Menlo,monospace;font-size:26px;font-weight:800;color:${TEXT};letter-spacing:-0.01em;">$${total.toFixed(2)}</td>
            </tr>
          </table>
        </td></tr>

        <!-- CTA -->
        <tr><td style="padding:24px 32px 40px 32px;">
          <a href="${orderUrl}" style="display:inline-block;background:transparent;color:${TEXT};border:1px solid ${BORDER};padding:13px 22px;border-radius:10px;text-decoration:none;font-size:12px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;">View order page →</a>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:22px 32px 26px 32px;background:${BG_DEEP};border-top:1px solid ${BORDER};">
          <div style="font-family:'Helvetica Neue',Arial,sans-serif;font-size:12px;line-height:1.6;color:${DIM};">
            Questions, refunds, missing files — reply to this email or write to
            <a href="mailto:hello@thepluginwarehouse.com" style="color:${ACCENT_GLOW};text-decoration:none;">hello@thepluginwarehouse.com</a>.
          </div>
          <div style="margin-top:14px;font-family:'Helvetica Neue',Arial,sans-serif;font-size:10px;letter-spacing:0.24em;color:${DIM};text-transform:uppercase;font-weight:700;">
            Plugin Warehouse · Sounds that hit.
          </div>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body></html>`;

  const text = `PLUGIN WAREHOUSE — Order ${orderNumber}\n\nYou're loaded up. Your downloads:\n\n${items
    .map((i) => `• ${i.name} — $${i.price.toFixed(2)}\n  ${i.downloadUrl}`)
    .join("\n\n")}\n\nTotal paid: $${total.toFixed(2)}\nOrder page: ${orderUrl}\n\nQuestions: hello@thepluginwarehouse.com\n`;

  return { html, text, subject: `Order ${orderNumber} — your Plugin Warehouse downloads` };
}

export function renderContactNotification(opts: {
  name: string;
  email: string;
  subject: string;
  message: string;
}): { html: string; text: string; subject: string } {
  const { name, email, subject, message } = opts;
  const html = `<!doctype html>
<html><head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background:${BG_DEEP};font-family:'Helvetica Neue',Arial,sans-serif;color:${TEXT};">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${BG_DEEP};padding:40px 16px;">
    <tr><td align="center">
      <table role="presentation" width="560" cellspacing="0" cellpadding="0" style="max-width:560px;width:100%;background:${BG_CARD};border:1px solid ${BORDER};border-radius:16px;overflow:hidden;">
        <tr><td style="padding:24px 30px 8px 30px;border-bottom:1px solid ${BORDER};">
          <div style="font-size:11px;letter-spacing:0.24em;color:${DIM};text-transform:uppercase;font-weight:800;">Plugin Warehouse · Contact</div>
          <h1 style="margin:10px 0 0 0;font-size:22px;line-height:1.25;color:${TEXT};font-weight:800;">${escapeHtml(subject)}</h1>
        </td></tr>
        <tr><td style="padding:18px 30px;color:${MUTED};font-size:14px;">
          <div style="margin-bottom:4px;"><span style="color:${DIM};">From:</span> <strong style="color:${TEXT};">${escapeHtml(name)}</strong></div>
          <div><span style="color:${DIM};">Reply to:</span> <a href="mailto:${escapeHtml(email)}" style="color:${ACCENT_GLOW};text-decoration:none;">${escapeHtml(email)}</a></div>
        </td></tr>
        <tr><td style="padding:6px 30px 30px 30px;">
          <div style="background:${BG_DEEP};border:1px solid ${BORDER};border-radius:10px;padding:18px;color:#e5e5e5;font-size:15px;line-height:1.55;white-space:pre-wrap;">${escapeHtml(message)}</div>
          <div style="margin-top:14px;color:${DIM};font-size:12px;">Hit reply to respond directly to ${escapeHtml(email)}.</div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  const text = `New contact form submission\n\nFrom: ${name} <${email}>\nSubject: ${subject}\n\n${message}\n\nReply directly to ${email}.`;
  return { html, text, subject: `[Contact] ${subject} — ${name}` };
}
