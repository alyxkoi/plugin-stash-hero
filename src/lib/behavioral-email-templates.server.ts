// Behavioral email templates (abandoned cart + saved items).
// Server-only. The HTML lives verbatim in behavioral-email-html.server.ts;
// this module only fills variables, repeats the extra-items row and builds
// the plain-text alternative.
import { escapeHtml } from "./resend.server";
import {
  CART_1_HTML,
  CART_2_HTML,
  CART_3_HTML,
  SAVED_1_HTML,
  SAVED_2_HTML,

} from "./behavioral-email-html.server";
import {
  fill,
  money,
  removeEmptyChips,
  removeRowContaining,
  renderExtras,
} from "./email-render.server";

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

function productUrl(p: { slug?: string | null }, campaign: string) {
  const base = p.slug ? `${SITE_URL}/shop/p/${p.slug}` : `${SITE_URL}/shop`;
  return `${base}?utm_source=email&utm_campaign=${campaign}`;
}

/**
 * Product covers are stored at full size on the R2 custom domain, so the same
 * URL serves the 508px hero panel and the 128px+ retina thumbnail. No
 * thumbnail/resize variant is ever used here.
 */
function cover(p: { coverUrl?: string | null }) {
  return p.coverUrl && p.coverUrl.startsWith("http") ? p.coverUrl : FALLBACK_COVER;
}

function original(p: EmailProduct): string {
  return p.comparePrice != null && Number(p.comparePrice) > p.price
    ? money(Number(p.comparePrice))
    : "";
}

function retail(p: EmailProduct): number {
  const c = p.comparePrice != null ? Number(p.comparePrice) : 0;
  return c > p.price ? c : p.price;
}

function pctText(saved: number, base: number): string {
  if (base <= 0 || saved <= 0) return "";
  return `${Math.round((saved / base) * 100)}%`;
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

// Deadlines are never invented: with no real sale end date the chip row is
// removed instead of showing filler copy.
export const DEADLINE_CART_FALLBACK = "";
export const DEADLINE_SAVED_FALLBACK = "";
export const DEADLINE_DROP_FALLBACK = "";

// ---------- copy table (README) ----------

const CART_COPY: Record<1 | 2 | 3, { subject: (total: string) => string; tpl: string }> = {
  1: { subject: (t) => `${t}. Still in your cart.`, tpl: CART_1_HTML },
  2: { subject: () => "One day later.", tpl: CART_2_HTML },
  3: { subject: () => "Last one from us.", tpl: CART_3_HTML },
};

type Rendered = { subject: string; html: string; text: string };

/** Highest-priced item first. */
function orderByPrice<T extends EmailProduct>(items: T[]): T[] {
  return [...items].sort((a, b) => b.price - a.price);
}

function finish(html: string): string {
  return removeEmptyChips(html);
}

// ---------- abandoned cart (steps 1-3) ----------

export function renderAbandonedCart(opts: {
  step: 1 | 2 | 3;
  items: EmailProduct[];
  deadlineText?: string;
  unsubUrl: string;
}): Rendered {
  const c = CART_COPY[opts.step];
  const campaign = `abandoned_cart_step${opts.step}`;
  const ordered = orderByPrice(opts.items);
  const hero = ordered[0]!;
  const extras = ordered.slice(1);
  const cartUrl = `${SITE_URL}/checkout?utm_source=email&utm_campaign=${campaign}`;

  const total = ordered.reduce((s, i) => s + i.price, 0);
  const retailTotal = ordered.reduce((s, i) => s + retail(i), 0);
  const savings = Math.max(0, retailTotal - total);

  let html = renderExtras(
    c.tpl,
    extras.map((it) => ({
      ITEM_IMAGE: cover(it),
      ITEM_NAME: escapeHtml(it.name),
      ITEM_URL: productUrl(it, campaign),
      ITEM_PRICE: money(it.price),
      ITEM_ORIGINAL: original(it),
    })),
  );

  html = fill(html, {
    HERO_IMAGE: cover(hero),
    HERO_NAME: escapeHtml(hero.name),
    HERO_URL: productUrl(hero, campaign),
    HERO_PRICE: money(hero.price),
    HERO_ORIGINAL: original(hero),
    CART_URL: cartUrl,
    CART_TOTAL: money(total),
    CART_ORIGINAL_TOTAL: money(retailTotal),
    CART_SAVINGS_AMOUNT: money(savings),
    CART_SAVINGS_PCT: pctText(savings, retailTotal),
    UNSUBSCRIBE_URL: opts.unsubUrl,
  });

  const text = [
    `${ordered.length === 1 ? "Your item is" : "Your items are"} still in your cart.`,
    "",
    ordered
      .map((i) => `• ${i.name} — ${money(i.price)}${original(i) ? ` (was ${original(i)})` : ""}`)
      .join("\n"),
    "",
    `Cart total: ${money(total)}${savings > 0 ? ` (${money(savings)} off retail)` : ""}`,
    "",
    `Finish checkout: ${cartUrl}`,
    "",
    `Stop these reminders: ${opts.unsubUrl}`,
    "",
  ].join("\n");

  return { subject: c.subject(money(total)), html: finish(html), text };
}

// ---------- saved items step 1 (3-day nudge) ----------

export function renderSavedItemsNudge(opts: {
  items: EmailProduct[];
  deadlineText?: string;
  unsubUrl: string;
}): Rendered {
  const campaign = "saved_items_step1";
  const ordered = orderByPrice(opts.items);
  const hero = ordered[0]!;
  const extras = ordered.slice(1);
  const heroUrl = productUrl(hero, campaign);
  const heroRetail = retail(hero);

  let html = renderExtras(
    SAVED_1_HTML,
    extras.map((it) => ({
      ITEM_IMAGE: cover(it),
      ITEM_NAME: escapeHtml(it.name),
      ITEM_URL: productUrl(it, campaign),
      ITEM_PRICE: money(it.price),
      ITEM_ORIGINAL: original(it),
    })),
  );

  html = fill(html, {
    HERO_IMAGE: cover(hero),
    HERO_NAME: escapeHtml(hero.name),
    HERO_URL: heroUrl,
    HERO_PRICE: money(hero.price),
    HERO_ORIGINAL: original(hero),
    SAVED_PRICE: money(hero.price),
    SAVED_ORIGINAL: original(hero),
    SAVED_SAVINGS_PCT: pctText(heroRetail - hero.price, heroRetail),
    UNSUBSCRIBE_URL: opts.unsubUrl,
  });

  const text = [
    "Still on your saved list.",
    "",
    ordered
      .map((i) => `• ${i.name} — ${money(i.price)}${original(i) ? ` (was ${original(i)})` : ""}`)
      .join("\n"),
    "",
    heroUrl,
    "",
    `Stop these reminders: ${opts.unsubUrl}`,
    "",
  ].join("\n");

  return { subject: "Still on your list.", html: finish(html), text };
}

// ---------- saved items step 2 (price drop) ----------

export function renderPriceDrop(opts: {
  items: DropProduct[];
  deadlineText?: string;
  unsubUrl: string;
}): Rendered {
  const campaign = "saved_items_price_drop";
  // Only items whose price actually fell belong in this email.
  const dropped = opts.items.filter((i) => i.newPrice < i.oldPrice - 0.005);
  const pctOf = (i: DropProduct) => (i.oldPrice > 0 ? (i.oldPrice - i.newPrice) / i.oldPrice : 0);
  const ordered = [...dropped].sort((a, b) => pctOf(b) - pctOf(a));
  const hero = ordered[0]!;
  const extras = ordered.slice(1);
  const heroUrl = productUrl(hero, campaign);
  const pct = Math.round(pctOf(hero) * 100);

  let html = renderExtras(
    PRICE_DROP_HTML,
    extras.map((it) => ({
      ITEM_IMAGE: cover(it),
      ITEM_NAME: escapeHtml(it.name),
      ITEM_URL: productUrl(it, campaign),
      ITEM_PRICE: money(it.newPrice),
      ITEM_ORIGINAL: money(it.oldPrice),
    })),
  );

  // Real sale deadline only; otherwise the whole indigo chip row goes away.
  const deadline = opts.deadlineText?.trim() ?? "";
  if (!deadline) html = removeRowContaining(html, "{{DEADLINE_TEXT}}");

  html = fill(html, {
    HERO_IMAGE: cover(hero),
    HERO_NAME: escapeHtml(hero.name),
    HERO_URL: heroUrl,
    OLD_PRICE: money(hero.oldPrice),
    NEW_PRICE: money(hero.newPrice),
    DROP_PCT: pct > 0 ? `${pct}%` : "",
    DEADLINE_TEXT: deadline,
    UNSUBSCRIBE_URL: opts.unsubUrl,
  });

  const text = [
    `${money(hero.oldPrice)} became ${money(hero.newPrice)}.`,
    "",
    `${hero.name} — now ${money(hero.newPrice)}, was ${money(hero.oldPrice)}${pct > 0 ? ` (${pct}% off)` : ""}`,
    extras
      .map((e) => `• ${e.name} — now ${money(e.newPrice)}, was ${money(e.oldPrice)}`)
      .join("\n"),
    "",
    heroUrl,
    deadline ? `\n${deadline}` : "",
    "",
    `Stop these reminders: ${opts.unsubUrl}`,
    "",
  ].join("\n");

  return {
    subject: `${money(hero.oldPrice)} became ${money(hero.newPrice)}.`,
    html: finish(html),
    text,
  };
}
