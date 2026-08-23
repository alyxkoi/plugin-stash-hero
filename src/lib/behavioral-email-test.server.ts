// One-off test sends for the five behavioral templates. Server-only.
// Reads product covers only; never touches cart/saved/customer rows and never
// writes to email_automation_log, so test sends cannot affect stats.
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sendEmail } from "./resend.server";
import {
  DEADLINE_CART_FALLBACK,
  DEADLINE_DROP_FALLBACK,
  DEADLINE_SAVED_FALLBACK,
  renderAbandonedCart,
  renderPriceDrop,
  renderSavedItemsNudge,
  saleDeadlineText,
  type DropProduct,
  type EmailProduct,
} from "./behavioral-email-templates.server";

const FROM = "The Plugin Warehouse <hello@thepluginwarehouse.com>";
const REPLY_TO = "pluginwh@gmail.com";

export type TestTemplate = "cart_1h" | "cart_24h" | "cart_72h" | "saved_3day" | "price_drop";

/** Real published products with a full-size cover, priciest first. */
async function sampleProducts(limit: number): Promise<EmailProduct[]> {
  const { data } = await supabaseAdmin
    .from("products")
    .select("name, price, compare_at_price, cover_url, slug")
    .eq("status", "published")
    .not("cover_url", "is", null)
    .gt("price", 0)
    .order("price", { ascending: false })
    .limit(limit);

  const rows = (data ?? []).map((p) => ({
    name: p.name,
    price: Number(p.price),
    comparePrice: p.compare_at_price != null ? Number(p.compare_at_price) : null,
    coverUrl: p.cover_url,
    slug: p.slug,
  }));

  if (rows.length === 0) {
    // last resort so a test send still renders end to end
    return [{ name: "Sample Plugin", price: 39, comparePrice: 79, coverUrl: null, slug: null }].slice(
      0,
      limit,
    );
  }
  // guarantee a struck-through price on the hero
  const hero = rows[0]!;
  if (hero.comparePrice == null || hero.comparePrice <= hero.price) {
    hero.comparePrice = Math.round(hero.price * 1.6 * 100) / 100;
  }
  return rows;
}

/** Deadline from the soonest active sale, else the per-sequence fallback. */
async function deadline(fallback: string): Promise<string> {
  const { data } = await supabaseAdmin
    .from("sale_events")
    .select("end_at")
    .eq("status", "active")
    .order("end_at", { ascending: true })
    .limit(1);
  return saleDeadlineText(data?.[0]?.end_at) ?? fallback;
}

export async function sendBehavioralTestEmail(opts: {
  template: TestTemplate;
  to: string;
  multipleItems: boolean;
}): Promise<{ id?: string; error?: string; subject: string }> {
  const count = opts.multipleItems ? 3 : 1;
  const items = await sampleProducts(count);
  // Test sends use a harmless placeholder unsubscribe target — no real token.
  const unsubscribeUrl = "https://thepluginwarehouse.com/unsubscribe?preview=1";

  let mail: { subject: string; html: string; text: string };

  if (opts.template === "price_drop") {
    const drops: DropProduct[] = items.map((it, i) => {
      const oldPrice = Math.round(it.price * (i === 0 ? 1.6 : 1.3) * 100) / 100;
      return { ...it, oldPrice, newPrice: it.price };
    });
    mail = renderPriceDrop({
      items: drops,
      deadlineText: await deadline(DEADLINE_DROP_FALLBACK),
      unsubUrl: unsubscribeUrl,
    });
  } else if (opts.template === "saved_3day") {
    mail = renderSavedItemsNudge({
      items,
      deadlineText: await deadline(DEADLINE_SAVED_FALLBACK),
      unsubUrl: unsubscribeUrl,
    });
  } else {
    const step = opts.template === "cart_1h" ? 1 : opts.template === "cart_24h" ? 2 : 3;
    mail = renderAbandonedCart({
      step: step as 1 | 2 | 3,
      items,
      deadlineText: await deadline(DEADLINE_CART_FALLBACK),
      unsubUrl: unsubscribeUrl,
    });
  }

  const subject = `[TEST] ${mail.subject}`;
  const res = await sendEmail({
    from: FROM,
    reply_to: REPLY_TO,
    to: opts.to,
    subject,
    html: mail.html,
    text: mail.text,
  });

  return { ...res, subject };
}
