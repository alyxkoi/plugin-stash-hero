// Behavioral email templates (abandoned cart + saved items).
// Server-only. The HTML lives verbatim in behavioral-email-html.server.ts;
// this module only fills variables, repeats the extra-items row and builds
// the plain-text alternative.
import { escapeHtml } from "./resend.server";
import {
  CART_1_HTML,
  CART_2_HTML,
  CART_3_HTML,
  PRICE_DROP_HTML,
  SAVED_1_HTML,
} from "./behavioral-email-html.server";

export const SITE_URL = "https://thepluginwarehouse.com";

export type EmailProduct = {
  name: string;
  price: number;
  /** pre-discount price, when the item is on sale */
  comparePrice?: number | null;
  coverUrl?: string | null;
  slug?: string | null;
};

export type DropProduct = EmailProduct & { oldPrice: number; newPrice: number };

const FALLBACK_COVER = `${SITE_URL}/og-cover.jpg`;

function money(n: number) {
  return n === 0 ? "FREE" : `$${n.toFixed(2)}`;
}

function productUrl(p: { slug?: string | null }, campaign: string) {
  const base = p.slug ? `${SITE_URL}/shop/p/${p.slug}` : `${SITE_URL}/shop`;
  return `${base}?utm_source=email&utm_campaign=${campaign}`;
}

function cover(p: { coverUrl?: string | null }) {
  return p.coverUrl && p.coverUrl.startsWith("http") ? p.coverUrl : FALLBACK_COVER;
}

// ---------- tiny mustache-ish renderer ----------

/** Removes a {{#NAME}}…{{/NAME}} block, or unwraps it when `keep` is true. */
function block(html: string, name: string, keep: boolean): string {
  const re = new RegExp(`\\{\\{#${name}\\}\\}([\\s\\S]*?)\\{\\{/${name}\\}\\}`, "g");
  return html.replace(re, (_m, inner: string) => (keep ? inner : ""));
}

/** Repeats the markup between the REPEAT markers once per row. */
function repeatRows(html: string, rows: Record<string, string>[]): string {
  const start = html.indexOf("<!-- REPEAT PER EXTRA ITEM -->");
  const endMarker = "<!-- END REPEAT -->";
  const end = html.indexOf(endMarker);
  if (start === -1 || end === -1) return html;
  const tpl = html.slice(start + "<!-- REPEAT PER EXTRA ITEM -->".length, end);
  const body = rows.map((r) => fill(tpl, r)).join("");
  return html.slice(0, start) + body + html.slice(end + endMarker.length);
}

function fill(html: string, vars: Record<string, string>): string {
  return html.replace(/\{\{([A-Z0-9_]+)\}\}/g, (_m, k: string) => vars[k] ?? "");
}

function setPreheader(html: string, preview: string): string {
  return html.replace(
    /(<div style="display:none;max-height:0;[^"]*">)([\s\S]*?)(<\/div>)/,
    (_m, a: string, _b: string, c: string) => `${a}${escapeHtml(preview)}${c}`,
  );
}

function render(
  tpl: string,
  opts: {
    preview: string;
    vars: Record<string, string>;
    heroOldPrice: boolean;
    extras: Record<string, string>[];
  },
): string {
  let html = setPreheader(tpl, opts.preview);
  html = block(html, "HERO_OLD_PRICE", opts.heroOldPrice);
  html = block(html, "EXTRA_ITEMS", opts.extras.length > 0);
  if (opts.extras.length > 0) html = repeatRows(html, opts.extras);
  return fill(html, opts.vars);
}

// ---------- deadline text ----------

/**
 * Formats a real sale end date, e.g. `PRICE ENDS SUNDAY 11:59PM CT`.
 * Returns null when there is no end date to quote.
 */
export function saleDeadlineText(endAt: string | null | undefined): string | null {
  if (!endAt) return null;
  const d = new Date(endAt);
  if (Number.isNaN(d.getTime())) return null;
  const day = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    weekday: "long",
  }).format(d);
  const time = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
    .format(d)
    .replace(/\s/g, "")
    .toUpperCase();
  return `PRICE ENDS ${day.toUpperCase()} ${time} CT`;
}

export const DEADLINE_CART_FALLBACK = "YOUR CART CLEARS IN 7 DAYS";
export const DEADLINE_SAVED_FALLBACK = "PRICES CHANGE WITHOUT NOTICE";
export const DEADLINE_DROP_FALLBACK = "WHILE IT LASTS";

// ---------- copy table (README) ----------

const CART_COPY: Record<1 | 2 | 3, { subject: string; preview: string; tpl: string }> = {
  1: {
    subject: "You left something behind 🛒",
    preview: "Your cart's still holding it — for now.",
    tpl: CART_1_HTML,
  },
  2: {
    subject: "Your cart's getting cold 🧊",
    preview: "Prices move. Carts clear. This one's been sitting.",
    tpl: CART_2_HTML,
  },
  3: {
    subject: "Last call on your cart ⏳",
    preview: "Final reminder before it clears.",
    tpl: CART_3_HTML,
  },
};

type Rendered = { subject: string; html: string; text: string };

function plainList(items: EmailProduct[]) {
  return items.map((i) => `• ${i.name} — ${money(i.price)}`).join("\n");
}

/** Highest-priced item first. */
function orderByPrice<T extends EmailProduct>(items: T[]): T[] {
  return [...items].sort((a, b) => b.price - a.price);
}

// ---------- abandoned cart (steps 1-3) ----------

export function renderAbandonedCart(opts: {
  step: 1 | 2 | 3;
  items: EmailProduct[];
  deadlineText: string;
  unsubUrl: string;
}): Rendered {
  const c = CART_COPY[opts.step];
  const campaign = `abandoned_cart_step${opts.step}`;
  const ordered = orderByPrice(opts.items);
  const hero = ordered[0]!;
  const extras = ordered.slice(1);
  const ctaUrl = `${SITE_URL}/checkout?utm_source=email&utm_campaign=${campaign}`;

  const html = render(c.tpl, {
    preview: c.preview,
    heroOldPrice: hero.comparePrice != null && Number(hero.comparePrice) > hero.price,
    extras: extras.map((it) => ({
      ITEM_IMAGE: cover(it),
      ITEM_NAME: escapeHtml(it.name),
      ITEM_URL: productUrl(it, campaign),
      ITEM_PRICE: money(it.price),
    })),
    vars: {
      HERO_IMAGE: cover(hero),
      HERO_NAME: escapeHtml(hero.name),
      HERO_URL: productUrl(hero, campaign),
      HERO_PRICE: money(hero.price),
      HERO_OLD_PRICE: hero.comparePrice != null ? money(Number(hero.comparePrice)) : "",
      CTA_URL: ctaUrl,
      DEADLINE_TEXT: opts.deadlineText,
      UNSUBSCRIBE_URL: opts.unsubUrl,
    },
  });

  return {
    subject: c.subject,
    html,
    text: `${c.preview}\n\n${plainList(ordered)}\n\nFinish checkout: ${ctaUrl}\n\n${opts.deadlineText}\n\nStop these reminders: ${opts.unsubUrl}\n`,
  };
}

// ---------- saved items step 1 (3-day nudge) ----------

export function renderSavedItemsNudge(opts: {
  items: EmailProduct[];
  deadlineText: string;
  unsubUrl: string;
}): Rendered {
  const campaign = "saved_items_step1";
  const ordered = orderByPrice(opts.items);
  const hero = ordered[0]!;
  const extras = ordered.slice(1);
  const heroUrl = productUrl(hero, campaign);

  const html = render(SAVED_1_HTML, {
    preview: "You saved it for a reason.",
    heroOldPrice: hero.comparePrice != null && Number(hero.comparePrice) > hero.price,
    extras: extras.map((it) => ({
      ITEM_IMAGE: cover(it),
      ITEM_NAME: escapeHtml(it.name),
      ITEM_URL: productUrl(it, campaign),
      ITEM_PRICE: money(it.price),
    })),
    vars: {
      HERO_IMAGE: cover(hero),
      HERO_NAME: escapeHtml(hero.name),
      HERO_URL: heroUrl,
      HERO_PRICE: money(hero.price),
      HERO_OLD_PRICE: hero.comparePrice != null ? money(Number(hero.comparePrice)) : "",
      CTA_URL: heroUrl,
      DEADLINE_TEXT: opts.deadlineText,
      UNSUBSCRIBE_URL: opts.unsubUrl,
    },
  });

  return {
    subject: "Still thinking about it? 👀",
    html,
    text: `You saved it for a reason.\n\n${plainList(ordered)}\n\n${heroUrl}\n\n${opts.deadlineText}\n\nStop these reminders: ${opts.unsubUrl}\n`,
  };
}

// ---------- saved items step 2 (price drop) ----------

export function renderPriceDrop(opts: {
  items: DropProduct[];
  deadlineText: string;
  unsubUrl: string;
}): Rendered {
  const campaign = "saved_items_price_drop";
  const pctOf = (i: DropProduct) =>
    i.oldPrice > 0 ? (i.oldPrice - i.newPrice) / i.oldPrice : 0;
  const ordered = [...opts.items].sort((a, b) => pctOf(b) - pctOf(a));
  const hero = ordered[0]!;
  const extras = ordered.slice(1);
  const pct = Math.round(pctOf(hero) * 100);
  const heroUrl = productUrl(hero, campaign);

  const html = render(PRICE_DROP_HTML, {
    preview: `${hero.name} just dropped to ${money(hero.newPrice)}. Was ${money(hero.oldPrice)}.`,
    heroOldPrice: true,
    extras: extras.map((it) => ({
      ITEM_IMAGE: cover(it),
      ITEM_NAME: escapeHtml(it.name),
      ITEM_URL: productUrl(it, campaign),
      ITEM_OLD_PRICE: money(it.oldPrice),
      ITEM_NEW_PRICE: money(it.newPrice),
    })),
    vars: {
      HERO_IMAGE: cover(hero),
      HERO_NAME: escapeHtml(hero.name),
      HERO_URL: heroUrl,
      HERO_OLD_PRICE: money(hero.oldPrice),
      HERO_NEW_PRICE: money(hero.newPrice),
      HERO_PERCENT_OFF: `${pct}%`,
      DROP_INTRO:
        extras.length > 0
          ? `${ordered.length} of your saved plugins just got cheaper. Here's the biggest drop.`
          : "One of your saved plugins just got cheaper.",
      DEADLINE_TEXT: opts.deadlineText,
      UNSUBSCRIBE_URL: opts.unsubUrl,
    },
  });

  return {
    subject: "That plugin you saved got cheaper 📉",
    html,
    text: `${hero.name}\nWas ${money(hero.oldPrice)} — now ${money(hero.newPrice)}${pct > 0 ? ` (${pct}% off)` : ""}\n\n${extras.map((e) => `• ${e.name} — was ${money(e.oldPrice)}, now ${money(e.newPrice)}`).join("\n")}\n\n${heroUrl}\n\n${opts.deadlineText}\n\nStop these reminders: ${opts.unsubUrl}\n`,
  };
}
