import { escapeHtml } from "./resend.server";

type OrderItem = { name: string; price: number; downloadUrl: string };

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
      (it) => `
      <tr>
        <td style="padding:16px 0;border-bottom:1px solid #262626;color:#f5f5f5;font-size:15px;">
          <div style="font-weight:600;margin-bottom:6px;">${escapeHtml(it.name)}</div>
          <a href="${it.downloadUrl}" style="display:inline-block;background:#ff003c;color:#fff;text-decoration:none;padding:8px 14px;border-radius:6px;font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;">Download plugin ↓</a>
        </td>
        <td style="padding:16px 0;border-bottom:1px solid #262626;color:#f5f5f5;font-size:15px;text-align:right;vertical-align:top;font-variant-numeric:tabular-nums;">$${it.price.toFixed(2)}</td>
      </tr>`,
    )
    .join("");

  const html = `<!doctype html>
<html><head><meta charset="utf-8"/><title>Order ${escapeHtml(orderNumber)}</title></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#f5f5f5;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0a0a0a;padding:40px 16px;">
    <tr><td align="center">
      <table role="presentation" width="560" cellspacing="0" cellpadding="0" style="max-width:560px;width:100%;background:#111111;border:1px solid #262626;border-radius:12px;overflow:hidden;">
        <tr><td style="padding:32px 32px 8px 32px;">
          <div style="font-size:11px;letter-spacing:0.2em;color:#a3a3a3;text-transform:uppercase;font-weight:700;">Plugin Warehouse</div>
          <h1 style="margin:12px 0 4px 0;font-size:28px;line-height:1.1;color:#fff;font-weight:900;letter-spacing:-0.01em;">Order confirmed.</h1>
          <div style="color:#a3a3a3;font-size:14px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;">${escapeHtml(orderNumber)}</div>
        </td></tr>
        <tr><td style="padding:24px 32px 8px 32px;color:#d4d4d4;font-size:15px;line-height:1.5;">
          Thanks for the purchase — your plugins are ready. Download links are below. Save them; they stay tied to this order.
        </td></tr>
        <tr><td style="padding:8px 32px 24px 32px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
            ${rows}
            <tr>
              <td style="padding:20px 0 0 0;color:#a3a3a3;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;">Total paid</td>
              <td style="padding:20px 0 0 0;color:#fff;font-size:20px;font-weight:800;text-align:right;font-variant-numeric:tabular-nums;">$${total.toFixed(2)}</td>
            </tr>
          </table>
        </td></tr>
        <tr><td style="padding:16px 32px 32px 32px;">
          <a href="${orderUrl}" style="display:inline-block;background:transparent;color:#fff;border:1px solid #404040;padding:12px 20px;border-radius:8px;text-decoration:none;font-size:13px;font-weight:600;letter-spacing:0.04em;">View order page →</a>
        </td></tr>
        <tr><td style="padding:20px 32px;background:#0a0a0a;border-top:1px solid #262626;color:#737373;font-size:12px;line-height:1.6;">
          Need help? Reply to this email or reach us at <a href="mailto:support@thepluginwarehouse.com" style="color:#a3a3a3;">support@thepluginwarehouse.com</a>.<br/>
          © Plugin Warehouse
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  const text = `Plugin Warehouse — Order ${orderNumber}\n\nThanks for the purchase. Downloads:\n\n${items
    .map((i) => `• ${i.name} — $${i.price.toFixed(2)}\n  ${i.downloadUrl}`)
    .join("\n\n")}\n\nTotal paid: $${total.toFixed(2)}\nOrder page: ${orderUrl}\n`;

  return { html, text, subject: `Your Plugin Warehouse order ${orderNumber}` };
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
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#f5f5f5;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0a0a0a;padding:40px 16px;">
    <tr><td align="center">
      <table role="presentation" width="560" cellspacing="0" cellpadding="0" style="max-width:560px;width:100%;background:#111111;border:1px solid #262626;border-radius:12px;overflow:hidden;">
        <tr><td style="padding:28px 32px 8px 32px;">
          <div style="font-size:11px;letter-spacing:0.2em;color:#a3a3a3;text-transform:uppercase;font-weight:700;">Plugin Warehouse · Contact form</div>
          <h1 style="margin:10px 0 0 0;font-size:22px;line-height:1.2;color:#fff;font-weight:800;">${escapeHtml(subject)}</h1>
        </td></tr>
        <tr><td style="padding:16px 32px;color:#d4d4d4;font-size:14px;">
          <div style="margin-bottom:4px;"><span style="color:#a3a3a3;">From:</span> <strong style="color:#fff;">${escapeHtml(name)}</strong></div>
          <div><span style="color:#a3a3a3;">Reply to:</span> <a href="mailto:${escapeHtml(email)}" style="color:#ff003c;text-decoration:none;">${escapeHtml(email)}</a></div>
        </td></tr>
        <tr><td style="padding:8px 32px 32px 32px;">
          <div style="background:#0a0a0a;border:1px solid #262626;border-radius:8px;padding:18px;color:#e5e5e5;font-size:15px;line-height:1.55;white-space:pre-wrap;">${escapeHtml(message)}</div>
          <div style="margin-top:16px;color:#737373;font-size:12px;">Hit reply in Gmail to respond directly to ${escapeHtml(email)}.</div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  const text = `New contact form submission\n\nFrom: ${name} <${email}>\nSubject: ${subject}\n\n${message}\n\nReply directly to ${email}.`;
  return { html, text, subject: `[Contact] ${subject} — ${name}` };
}
