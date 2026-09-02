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

/** RETAIL as display text, or "" when there is no valid retail gap. */
function original(p: EmailProduct): string {
  return p.comparePrice != null && Number(p.comparePrice) > p.price
    ? money(Number(p.comparePrice))
    : "";
}

/** RETAIL when it exceeds EFFECTIVE, otherwise EFFECTIVE (keeps totals sane). */
function retail(p: EmailProduct): number {
  const c = p.comparePrice != null ? Number(p.comparePrice) : 0;
  return c > p.price ? c : p.price;
}

/** Savings percentage, always rounded DOWN so a discount is never overstated. */
function pctText(saved: number, base: number): string {
  if (base <= 0 || saved <= 0) return "";
  return `${Math.floor((saved / base) * 100)}%`;
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
      // Extras are rendered before the outer fill(), so the cart link must be
      // supplied per row or every extra thumbnail ends up with href="".
      CART_URL: cartUrl,
    })),
  );

  // No real retail gap across the cart: drop the struck total and the savings
  // figures entirely instead of rendering "$0.00" / "0% OFF".
  const pct = pctText(savings, retailTotal);
  if (savings <= 0 || !pct) {
    for (const needle of ["{{CART_ORIGINAL_TOTAL}}", "{{CART_SAVINGS_AMOUNT}}", "{{CART_SAVINGS_PCT}}"]) {
      html = removeRowContaining(html, needle, "innermost");
    }
  }

  html = fill(html, {
    HERO_IMAGE: cover(hero),
    HERO_NAME: escapeHtml(hero.name),
    HERO_URL: productUrl(hero, campaign),
    HERO_PRICE: money(hero.price),
    HERO_ORIGINAL: original(hero),
    CART_URL: cartUrl,
    CART_TOTAL: money(total),
    CART_ORIGINAL_TOTAL: pct ? money(retailTotal) : "",
    CART_SAVINGS_AMOUNT: pct ? money(savings) : "",
    CART_SAVINGS_PCT: pct,
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

// ---------- saved items step 2 (5-day final nudge) ----------

export function renderSavedItemsFinal(opts: {
  items: EmailProduct[];
  deadlineText?: string;
  unsubUrl: string;
}): Rendered {
  const campaign = "saved_items_step2";
  const ordered = orderByPrice(opts.items);
  const hero = ordered[0]!;
  const extras = ordered.slice(1);
  const heroUrl = productUrl(hero, campaign);
  const heroRetail = retail(hero);
  const heroOriginal = original(hero);

  let html = renderExtras(
    SAVED_2_HTML,
    extras.map((it) => ({
      ITEM_IMAGE: cover(it),
      ITEM_NAME: escapeHtml(it.name),
      ITEM_URL: productUrl(it, campaign),
      ITEM_PRICE: money(it.price),
      ITEM_ORIGINAL: original(it),
    })),
  );

  // Real sale deadline only; otherwise the whole indigo chip row goes away.
  const deadline = opts.deadlineText?.trim() ?? "";
  if (!deadline) html = removeRowContaining(html, "{{DEADLINE_TEXT}}");

  html = fill(html, {
    HERO_IMAGE: cover(hero),
    HERO_NAME: escapeHtml(hero.name),
    HERO_URL: heroUrl,
    HERO_PRICE: money(hero.price),
    HERO_ORIGINAL: heroOriginal,
    SAVED_PRICE: money(hero.price),
    SAVED_ORIGINAL: heroOriginal,
    SAVED_SAVINGS_PCT: pctText(heroRetail - hero.price, heroRetail),
    DEADLINE_TEXT: deadline,
    UNSUBSCRIBE_URL: opts.unsubUrl,
  });

  const subject = heroOriginal
    ? `${heroOriginal} or ${money(hero.price)}.`
    : `${money(hero.price)}. Still on your list.`;

  const text = [
    subject,
    "",
    ordered
      .map((i) => `\u2022 ${i.name} \u2014 ${money(i.price)}${original(i) ? ` (retails ${original(i)})` : ""}`)
      .join("\n"),
    "",
    heroUrl,
    deadline ? `\n${deadline}` : "",
    "",
    `Stop these reminders: ${opts.unsubUrl}`,
    "",
  ].join("\n");

  return { subject, html: finish(html), text };
}
