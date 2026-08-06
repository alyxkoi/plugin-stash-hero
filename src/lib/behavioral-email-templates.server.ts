// Behavioral email templates (abandoned cart + saved items).
// Server-only. Table-based HTML, bgcolor on every panel, dark-mode hardened.
// Brand: dark amethyst liquid glass. No CSS gradients. No first-name merge tags.
import { escapeHtml } from "./resend.server";

const BG = "#0B0018";
const PANEL = "#190737";
const PANEL_DEEP = "#120428";
const BORDER = "#2C1152";
const ACCENT = "#FF003C";
const BLUE = "#0E0BD1";
const TEXT = "#FFFFFF";
const LAV = "#C9BEDD";
const LAV_DIM = "#B8ACCC";

const HEAD_FONT = "'Anton','Helvetica Neue',Arial Black,Arial,sans-serif";
const BODY_FONT = "'Dosis','Helvetica Neue',Arial,sans-serif";

export const SITE_URL = "https://thepluginwarehouse.com";

export type EmailProduct = {
  name: string;
  price: number;
  comparePrice?: number | null;
  coverUrl?: string | null;
  slug?: string | null;
};

function money(n: number) {
  return n === 0 ? "FREE" : `$${n.toFixed(2)}`;
}

function shell(opts: {
  preheader: string;
  eyebrow: string;
  headline: string;
  intro: string;
  bodyHtml: string;
  ctaLabel: string;
  ctaUrl: string;
  unsubUrl: string;
}) {
  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<meta name="color-scheme" content="dark light"/>
<meta name="supported-color-schemes" content="dark light"/>
<link href="https://fonts.googleapis.com/css2?family=Anton&family=Dosis:wght@400;600;700&display=swap" rel="stylesheet"/>
<title>${escapeHtml(opts.headline)}</title>
</head>
<body style="margin:0;padding:0;background:${BG};color:${TEXT};font-family:${BODY_FONT};" bgcolor="${BG}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${BG};">${escapeHtml(opts.preheader)}</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" bgcolor="${BG}" style="background:${BG};padding:28px 14px;">
<tr><td align="center" bgcolor="${BG}">
  <table role="presentation" width="600" cellspacing="0" cellpadding="0" bgcolor="${PANEL}" style="max-width:600px;width:100%;background:${PANEL};border:1px solid ${BORDER};border-radius:18px;overflow:hidden;">

    <tr><td bgcolor="${PANEL_DEEP}" style="background:${PANEL_DEEP};padding:20px 28px;border-bottom:1px solid ${BORDER};">
      <img src="${SITE_URL}/__l5e/assets-v1/fa4d9bc4-3fe5-40bc-9957-596235a7d11e/logo.png" alt="Plugin Warehouse" height="34" style="display:block;height:34px;width:auto;border:0;" />
    </td></tr>

    <tr><td bgcolor="${PANEL}" style="background:${PANEL};padding:34px 28px 6px 28px;">
      <div style="font-family:${BODY_FONT};font-size:11px;font-weight:700;letter-spacing:0.26em;text-transform:uppercase;color:${ACCENT};margin-bottom:12px;">${escapeHtml(opts.eyebrow)}</div>
      <h1 style="margin:0;font-family:${HEAD_FONT};font-weight:900;font-size:34px;line-height:1.06;letter-spacing:-0.01em;color:${TEXT};text-transform:uppercase;">${escapeHtml(opts.headline)}</h1>
      <p style="margin:14px 0 0 0;font-family:${BODY_FONT};font-size:16px;line-height:1.55;color:${LAV};">${escapeHtml(opts.intro)}</p>
    </td></tr>

    <tr><td bgcolor="${PANEL}" style="background:${PANEL};padding:22px 28px 4px 28px;">${opts.bodyHtml}</td></tr>

    <tr><td bgcolor="${PANEL}" style="background:${PANEL};padding:22px 28px 34px 28px;">
      <a href="${opts.ctaUrl}" style="display:inline-block;background:${ACCENT};color:#ffffff;text-decoration:none;padding:15px 26px;border-radius:10px;font-family:${BODY_FONT};font-size:13px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;">${escapeHtml(opts.ctaLabel)}</a>
    </td></tr>

    <tr><td bgcolor="${PANEL_DEEP}" style="background:${PANEL_DEEP};padding:20px 28px 24px 28px;border-top:1px solid ${BORDER};">
      <div style="font-family:${BODY_FONT};font-size:12px;line-height:1.6;color:${LAV_DIM};">
        Questions? <a href="${SITE_URL}/contact-us" style="color:${ACCENT};text-decoration:none;font-weight:700;">Contact us</a>.
      </div>
      <div style="margin-top:12px;font-family:${BODY_FONT};font-size:11px;color:${LAV_DIM};">
        <a href="${opts.unsubUrl}" style="color:${LAV_DIM};text-decoration:underline;">Unsubscribe from reminder emails</a> · Plugin Warehouse
      </div>
    </td></tr>

  </table>
</td></tr></table>
</body></html>`;
}

function itemRows(items: EmailProduct[]) {
  return items
    .map(
      (it) => `
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" bgcolor="${PANEL_DEEP}" style="background:${PANEL_DEEP};border:1px solid ${BORDER};border-radius:14px;margin-bottom:10px;">
    <tr>
      ${
        it.coverUrl
          ? `<td width="84" valign="top" bgcolor="${PANEL_DEEP}" style="background:${PANEL_DEEP};padding:14px 0 14px 14px;">
        <img src="${it.coverUrl}" alt="${escapeHtml(it.name)}" width="72" height="72" style="display:block;width:72px;height:72px;border:1px solid ${BORDER};border-radius:10px;object-fit:cover;" />
      </td>`
          : ""
      }
      <td valign="middle" bgcolor="${PANEL_DEEP}" style="background:${PANEL_DEEP};padding:16px 18px;">
        <div style="font-family:${HEAD_FONT};font-weight:900;font-size:18px;line-height:1.2;color:${TEXT};text-transform:uppercase;">${escapeHtml(it.name)}</div>
        <div style="font-family:${BODY_FONT};font-size:15px;font-weight:700;color:${LAV};margin-top:6px;">${money(it.price)}</div>
      </td>
    </tr>
  </table>`,
    )
    .join("");
}

function plainList(items: EmailProduct[]) {
  return items.map((i) => `• ${i.name} — ${money(i.price)}`).join("\n");
}

const CART_COPY: Record<number, { subject: string; eyebrow: string; headline: string; intro: string }> = {
  1: {
    subject: "You left something in your cart 🛒",
    eyebrow: "Still in your cart",
    headline: "Your cart is waiting",
    intro: "Looks like something pulled you away. No rush — your picks are still right where you left them.",
  },
  2: {
    subject: "Still thinking about this one? 👀",
    eyebrow: "Day two",
    headline: "One session away",
    intro:
      "This is the kind of tool you reach for on every project — once it's in your chain, it stays there. Your cart is still saved.",
  },
  3: {
    subject: "Last call on your cart 🚪",
    eyebrow: "Final nudge",
    headline: "Last call",
    intro:
      "This is the last reminder we'll send about this cart. If the timing isn't right, no worries — it'll be here when it is.",
  },
};

export function renderAbandonedCart(opts: {
  step: 1 | 2 | 3;
  items: EmailProduct[];
  total: number;
  unsubUrl: string;
}): { subject: string; html: string; text: string } {
  const c = CART_COPY[opts.step]!;
  const ctaUrl = `${SITE_URL}/checkout?utm_source=email&utm_campaign=abandoned_cart_step${opts.step}`;
  const body = `${itemRows(opts.items)}
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr>
    <td style="padding:14px 2px 0 2px;font-family:${BODY_FONT};font-size:11px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:${LAV_DIM};">Cart total</td>
    <td align="right" style="padding:14px 2px 0 2px;font-family:${HEAD_FONT};font-weight:900;font-size:26px;color:${TEXT};">${money(opts.total)}</td>
  </tr></table>`;

  return {
    subject: c.subject,
    html: shell({
      preheader: `${opts.items.length} item${opts.items.length === 1 ? "" : "s"} still in your Plugin Warehouse cart.`,
      eyebrow: c.eyebrow,
      headline: c.headline,
      intro: c.intro,
      bodyHtml: body,
      ctaLabel: "Complete your order →",
      ctaUrl,
      unsubUrl: opts.unsubUrl,
    }),
    text: `${c.headline.toUpperCase()}\n\n${c.intro}\n\n${plainList(opts.items)}\n\nCart total: ${money(opts.total)}\nComplete your order: ${ctaUrl}\n\nUnsubscribe from reminder emails: ${opts.unsubUrl}\n`,
  };
}

export function renderSavedItemsNudge(opts: {
  items: EmailProduct[];
  unsubUrl: string;
}): { subject: string; html: string; text: string } {
  const first = opts.items[0];
  const ctaUrl = first?.slug
    ? `${SITE_URL}/shop/p/${first.slug}?utm_source=email&utm_campaign=saved_items_step1`
    : `${SITE_URL}/shop?utm_source=email&utm_campaign=saved_items_step1`;
  return {
    subject: "Still on your mind? It's saved 💭",
    html: shell({
      preheader: "Your saved plugin is still waiting in your library shortlist.",
      eyebrow: "Saved for later",
      headline: "Still thinking about it?",
      intro: "You saved this a few days back. It's still here, still ready whenever you are.",
      bodyHtml: itemRows(opts.items),
      ctaLabel: "Take another look →",
      ctaUrl,
      unsubUrl: opts.unsubUrl,
    }),
    text: `STILL THINKING ABOUT IT?\n\nYou saved this a few days back.\n\n${plainList(opts.items)}\n\n${ctaUrl}\n\nUnsubscribe from reminder emails: ${opts.unsubUrl}\n`,
  };
}

export function renderPriceDrop(opts: {
  item: EmailProduct;
  oldPrice: number;
  newPrice: number;
  unsubUrl: string;
}): { subject: string; html: string; text: string } {
  const pct = opts.oldPrice > 0 ? Math.round(((opts.oldPrice - opts.newPrice) / opts.oldPrice) * 100) : 0;
  const ctaUrl = opts.item.slug
    ? `${SITE_URL}/shop/p/${opts.item.slug}?utm_source=email&utm_campaign=saved_items_price_drop`
    : `${SITE_URL}/shop?utm_source=email&utm_campaign=saved_items_price_drop`;

  const body = `
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" bgcolor="${PANEL_DEEP}" style="background:${PANEL_DEEP};border:1px solid ${BORDER};border-radius:14px;">
    <tr><td bgcolor="${PANEL_DEEP}" style="background:${PANEL_DEEP};padding:22px 20px;" align="center">
      ${opts.item.coverUrl ? `<img src="${opts.item.coverUrl}" alt="${escapeHtml(opts.item.name)}" width="120" height="120" style="display:block;margin:0 auto 16px auto;width:120px;height:120px;border:1px solid ${BORDER};border-radius:12px;object-fit:cover;" />` : ""}
      <div style="font-family:${HEAD_FONT};font-weight:900;font-size:20px;line-height:1.2;color:${TEXT};text-transform:uppercase;">${escapeHtml(opts.item.name)}</div>
      <div style="font-family:${BODY_FONT};font-size:16px;color:${LAV_DIM};margin-top:12px;"><s>$${opts.oldPrice.toFixed(2)}</s></div>
      <div style="font-family:${HEAD_FONT};font-weight:900;font-size:52px;line-height:1;color:${ACCENT};margin-top:4px;">${money(opts.newPrice)}</div>
      ${pct > 0 ? `<div style="display:inline-block;margin-top:14px;background:${BLUE};color:#ffffff;font-family:${BODY_FONT};font-size:12px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;padding:8px 14px;border-radius:8px;">${pct}% off right now</div>` : ""}
    </td></tr>
  </table>`;

  return {
    subject: `Price drop: ${opts.item.name} is ${money(opts.newPrice)} 📉`,
    html: shell({
      preheader: `${opts.item.name} dropped from $${opts.oldPrice.toFixed(2)} to ${money(opts.newPrice)}.`,
      eyebrow: "Price drop",
      headline: "The price just dropped",
      intro: "One of your saved plugins got cheaper. Here's the new number.",
      bodyHtml: body,
      ctaLabel: "Grab it now →",
      ctaUrl,
      unsubUrl: opts.unsubUrl,
    }),
    text: `PRICE DROP\n\n${opts.item.name}\nWas $${opts.oldPrice.toFixed(2)} — now ${money(opts.newPrice)}${pct > 0 ? ` (${pct}% off)` : ""}\n\n${ctaUrl}\n\nUnsubscribe from reminder emails: ${opts.unsubUrl}\n`,
  };
}
