// Behavioral email engine: abandoned cart + saved items sequences.
// Server-only. Invoked by the 15-minute scheduled job.
import { createHmac } from "crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sendEmail } from "./resend.server";
import {
  DEADLINE_CART_FALLBACK,
  DEADLINE_SAVED_FALLBACK,
  renderAbandonedCart,
  renderSavedItemsFinal,
  renderSavedItemsNudge,
  saleDeadlineText,
  SITE_URL,
  type EmailProduct,
} from "./behavioral-email-templates.server";


const FROM = "The Plugin Warehouse <hello@thepluginwarehouse.com>";
const HOUR = 3600_000;
const DAY = 24 * HOUR;

type SequenceType = "abandoned_cart" | "saved_items";

function assertDb(error: { message: string } | null, operation: string): void {
  if (error) throw new Error(`${operation}: ${error.message}`);
}

export function normalizeEmail(e: string | null | undefined): string {
  return (e ?? "").trim().toLowerCase();
}

export function unsubToken(email: string): string {
  const secret = process.env.EMAIL_UNSUB_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!secret) throw new Error("EMAIL_UNSUB_SECRET is not configured");
  return createHmac("sha256", secret).update(normalizeEmail(email)).digest("hex").slice(0, 32);
}

export function unsubUrl(email: string): string {
  const e = normalizeEmail(email);
  return `${SITE_URL}/unsubscribe?e=${encodeURIComponent(e)}&t=${unsubToken(e)}`;
}

type Candidate = {
  email: string;
  sequence: SequenceType;
  step: 1 | 2 | 3;
  triggerRef: string;
  // reserved: lets a step fire without the earlier step having been delivered
  exemptFromSequencing?: boolean;
  render: () => { subject: string; html: string; text: string };
  // guard evaluated again immediately before send
  guard: () => Promise<string | null>; // returns skip reason or null
};

type LogRow = {
  id: string;
  customer_email: string;
  sequence_type: SequenceType;
  step: number;
  trigger_ref: string;
  status: "sent" | "failed" | "skipped" | "deferred";
  skip_reason: string | null;
  attempts: number;
  sent_at: string | null;
};


// ---------- pricing ----------

type ActiveSale = {
  discount_pct: number;
  scope: string;
  categories: string[];
  productIds: Set<string>;
  end_at: string | null;
};

async function loadActiveSales(): Promise<ActiveSale[]> {
  const nowIso = new Date().toISOString();
  const { data: sales, error: salesError } = await supabaseAdmin
    .from("sale_events")
    .select("id, discount_pct, scope, categories, start_at, end_at, status")
    .in("status", ["active", "scheduled", "ended"])
    .lte("start_at", nowIso)
    .gte("end_at", nowIso);
  assertDb(salesError, "Load active sales");
  const list = sales ?? [];
  if (list.length === 0) return [];
  const { data: junction, error: junctionError } = await supabaseAdmin
    .from("sale_event_products")
    .select("sale_event_id, product_id")
    .in("sale_event_id", list.map((s) => s.id));
  assertDb(junctionError, "Load active sale products");
  return list.map((s) => ({
    discount_pct: s.discount_pct ?? 0,
    scope: s.scope as string,
    categories: (s.categories as string[]) ?? [],
    productIds: new Set((junction ?? []).filter((j) => j.sale_event_id === s.id).map((j) => j.product_id)),
    end_at: (s.end_at as string | null) ?? null,
  }));
}

type ProductRow = {
  id: string;
  slug: string;
  name: string;
  price: number;
  /** RETAIL — the developer's list price (products.compare_at_price). */
  compare_at_price: number | null;
  cover_url: string | null;
  category: string;
  status: string;
};

/** Best active sale for a product, or null when it is not on sale. */
function bestSale(p: ProductRow, sales: ActiveSale[]): ActiveSale | null {
  let best: ActiveSale | null = null;
  for (const s of sales) {
    const applies =
      s.scope === "all" ||
      (s.scope === "categories" && s.categories.includes(p.category)) ||
      (s.scope === "selected" && s.productIds.has(p.id));
    if (!applies) continue;
    if (!best || (s.discount_pct ?? 0) > (best.discount_pct ?? 0)) best = s;
  }
  return best && (best.discount_pct ?? 0) > 0 ? best : null;
}

/**
 * EFFECTIVE = STORE price (products.price) with the live sale percentage
 * applied. The sale percentage is NEVER applied to RETAIL.
 */
function effectivePrice(p: ProductRow, sales: ActiveSale[]): number {
  const s = bestSale(p, sales);
  if (!s) return Number(p.price);
  return Math.round(Number(p.price) * (1 - (s.discount_pct ?? 0) / 100) * 100) / 100;
}

/**
 * The struck-through price in every email is RETAIL (compare_at_price), not the
 * pre-sale store price. Null/zero/<= EFFECTIVE retail means "no retail gap" and
 * renders as an empty string.
 */
function toEmailProduct(p: ProductRow, price: number): EmailProduct {
  const retail = p.compare_at_price == null ? 0 : Number(p.compare_at_price);
  return {
    name: p.name,
    price,
    comparePrice: retail > price + 0.005 ? retail : null,
    coverUrl: p.cover_url,
    slug: p.slug,
  };
}

/**
 * DEADLINE_TEXT: real sale end date for the hero item, otherwise the
 * per-sequence fallback. Never invents scarcity.
 */
function deadlineFor(hero: ProductRow | undefined, sales: ActiveSale[], fallback: string): string {
  if (!hero) return fallback;
  const sale = bestSale(hero, sales);
  return (sale ? saleDeadlineText(sale.end_at) : null) ?? fallback;
}


// ---------- shared lookups ----------

async function hasPurchased(email: string, productIds: string[], since?: string): Promise<boolean> {
  if (productIds.length === 0) return false;

  // Identify this shopper's orders by normalized email (guest + account orders).
  let idq = supabaseAdmin
    .from("order_customer_identity")
    .select("order_id, created_at")
    .eq("normalized_email", email);
  if (since) idq = idq.gte("created_at", since);
  const { data: ids, error: idError } = await idq.limit(500);
  assertDb(idError, "Load purchase owners");
  const orderIds = (ids ?? []).map((r) => r.order_id).filter(Boolean) as string[];
  if (orderIds.length === 0) return false;

  const { data, error } = await supabaseAdmin
    .from("order_items")
    .select("order_id, product_id, orders!inner(status)")
    .in("order_id", orderIds)
    .in("product_id", productIds)
    .in("orders.status", ["completed", "partial"])
    .limit(1);
  assertDb(error, "Check completed purchases");
  return (data ?? []).length > 0;
}


async function optedOut(emails: string[]): Promise<Set<string>> {
  if (emails.length === 0) return new Set();
  const { data, error } = await supabaseAdmin
    .from("email_preferences")
    .select("customer_email, behavioral_emails_enabled, unsubscribed_at")
    .in("customer_email", emails);
  assertDb(error, "Load behavioral email preferences");
  const out = new Set<string>();
  for (const r of data ?? []) {
    if (!r.behavioral_emails_enabled || r.unsubscribed_at) out.add(r.customer_email);
  }
  return out;
}

// ---------- main run ----------

// TERMINAL: the candidate can never become eligible again. A log row is written
// and it permanently blocks retries.
const TERMINAL_SKIPS = new Set([
  "already_purchased",
  "purchased",
  "unsubscribed",
  "cart_empty",
  "no_longer_saved",
  "item_unsaved",
  "product_unavailable",
  "product_unpublished",
  "no_valid_email",
  "sequence_complete",
]);

/** Final step of each sequence. Hard stop, never exceeded. */
const FINAL_STEP: Record<SequenceType, number> = { abandoned_cart: 3, saved_items: 2 };

type PriorState = {
  sent: boolean;
  terminalReason: string | null;
  failedAttempts: number;
  deferredId: string | null;
};

const EMPTY_PRIOR: PriorState = { sent: false, terminalReason: null, failedAttempts: 0, deferredId: null };

export async function runBehavioralEmailJob(
  opts: { dryRun?: boolean; onlyEmail?: string } = {},
): Promise<{
  sent: number;
  failed: number;
  skipped: number;
  deferred: number;
  dryRun: boolean;
}> {
  const dryRun = opts.dryRun === true;
  const onlyEmail = normalizeEmail(opts.onlyEmail) || null;
  const now = Date.now();
  const stats = { sent: 0, failed: 0, skipped: 0, deferred: 0, dryRun };

  const { data: settingsRows, error: settingsError } = await supabaseAdmin
    .from("email_sequence_settings")
    .select("sequence_type, enabled");
  assertDb(settingsError, "Load behavioral email settings");
  const enabled = new Map<string, boolean>((settingsRows ?? []).map((r) => [r.sequence_type, r.enabled]));

  const sales = await loadActiveSales();

  const { data: productRows, error: productsError } = await supabaseAdmin
    .from("products")
    .select("id, slug, name, price, compare_at_price, cover_url, category, status")
    .eq("status", "published");
  assertDb(productsError, "Load published products");
  const products = new Map<string, ProductRow>((productRows ?? []).map((p) => [p.id, p as ProductRow]));

  // Delivery history: every step actually sent, with its send time. Relative
  // scheduling (step N due at step N-1 sent_at + interval) reads this.
  const { data: sentRows, error: sentRowsError } = await supabaseAdmin
    .from("email_automation_log")
    .select("customer_email, sequence_type, step, trigger_ref, sent_at")
    .eq("status", "sent")
    .eq("dry_run", false)
    .gte("created_at", new Date(now - 60 * DAY).toISOString());
  assertDb(sentRowsError, "Load behavioral delivery history");
  const sentKeys = new Set<string>();
  const sentAt = new Map<string, number>();
  for (const r of sentRows ?? []) {
    const key = `${r.customer_email}|${r.sequence_type}|${r.step}|${r.trigger_ref}`;
    sentKeys.add(key);
    const t = r.sent_at ? new Date(r.sent_at).getTime() : 0;
    if (t) sentAt.set(key, Math.max(sentAt.get(key) ?? 0, t));
  }

  const candidates: Candidate[] = [];

  if (dryRun || enabled.get("abandoned_cart") !== false) {
    candidates.push(...(await buildCartCandidates(now, products, sales, sentAt, dryRun)));
  }
  if (dryRun || enabled.get("saved_items") !== false) {
    candidates.push(...(await buildSavedCandidates(now, products, sales, sentAt)));
  }

  const scoped = onlyEmail ? candidates.filter((c) => c.email === onlyEmail) : candidates;

  // Prior log state per (email, sequence, step, ref). Only 'sent' and terminal
  // skips block; 'deferred' rows are bookkeeping and never block.
  const emails = Array.from(new Set(scoped.map((c) => c.email)));
  const existing = new Map<string, PriorState>();
  const completed = new Set<string>();
  if (emails.length > 0) {
    const { data: logs, error: logsError } = await supabaseAdmin
      .from("email_automation_log")
      .select("id, customer_email, sequence_type, step, trigger_ref, status, skip_reason, attempts, sent_at")
      .eq("dry_run", dryRun)
      .in("customer_email", emails);
    assertDb(logsError, "Load existing behavioral delivery logs");
    for (const l of (logs ?? []) as LogRow[]) {
      if (l.skip_reason === "sequence_complete") {
        completed.add(`${l.customer_email}|${l.sequence_type}|${l.trigger_ref}`);
        continue;
      }
      const key = `${l.customer_email}|${l.sequence_type}|${l.step}|${l.trigger_ref}`;
      const state = existing.get(key) ?? { ...EMPTY_PRIOR };
      if (l.status === "sent") state.sent = true;
      else if (l.status === "skipped" && TERMINAL_SKIPS.has(l.skip_reason ?? "")) {
        state.terminalReason = l.skip_reason ?? "skipped";
      } else if (l.status === "failed") {
        state.failedAttempts = Math.max(state.failedAttempts, l.attempts ?? 0);
      } else if (l.status === "deferred") {
        state.deferredId = l.id;
      }
      existing.set(key, state);
    }
  }

  const opted = await optedOut(emails);

  // Cross-sequence frequency cap: last behavioral send per address.
  const lastSent = new Map<string, number>();
  if (emails.length > 0) {
    const { data: recent, error: recentError } = await supabaseAdmin
      .from("email_automation_log")
      .select("customer_email, sent_at")
      .eq("status", "sent")
      .eq("dry_run", false)
      .gte("sent_at", new Date(now - DAY).toISOString())
      .in("customer_email", emails);
    assertDb(recentError, "Load behavioral frequency caps");
    for (const r of recent ?? []) {
      if (!r.sent_at) continue;
      const t = new Date(r.sent_at).getTime();
      lastSent.set(r.customer_email, Math.max(lastSent.get(r.customer_email) ?? 0, t));
    }
  }

  // Abandoned cart first (higher intent), then saved items
  scoped.sort((a, b) => (a.sequence === b.sequence ? 0 : a.sequence === "abandoned_cart" ? -1 : 1));

  const usedThisRun = new Set<string>();

  for (const c of scoped) {
    const key = `${c.email}|${c.sequence}|${c.step}|${c.triggerRef}`;
    const prior = existing.get(key) ?? EMPTY_PRIOR;

    if (prior.sent) continue;
    if (prior.terminalReason) continue;
    if (prior.failedAttempts >= 2) continue; // retried once already
    if (completed.has(`${c.email}|${c.sequence}|${c.triggerRef}`)) continue;
    if (c.step > FINAL_STEP[c.sequence]) continue; // hard stop

    // opt-out (terminal)
    if (opted.has(c.email)) {
      await logTerminal(c, "unsubscribed", dryRun);
      stats.skipped++;
      continue;
    }

    // send-time guard: terminal reasons block, anything else defers
    const reason = await c.guard();
    if (reason) {
      if (TERMINAL_SKIPS.has(reason)) {
        await logTerminal(c, reason, dryRun);
        stats.skipped++;
      } else {
        await logDeferred(c, reason, dryRun, prior.deferredId);
        stats.deferred++;
      }
      continue;
    }

    // Frequency cap applies ACROSS sequences only. A sequence already in
    // progress (step > 1, previous step delivered) is exempt: spacing inside a
    // sequence is enforced by the relative step intervals.
    const inProgress = c.step > 1;
    if (!inProgress && (usedThisRun.has(c.email) || now - (lastSent.get(c.email) ?? 0) < DAY)) {
      await logDeferred(c, "frequency_cap", dryRun, prior.deferredId);
      stats.deferred++;
      continue;
    }

    const mail = c.render();
    const res = dryRun
      ? { id: null as string | null, error: undefined as string | undefined }
      : await sendEmail({
          from: FROM,
          reply_to: "pluginwh@gmail.com",

          to: c.email,
          subject: mail.subject,
          html: mail.html,
          text: mail.text,
        });

    if (res.error) {
      const { error: logError } = await supabaseAdmin.from("email_automation_log").insert({
        customer_email: c.email,
        sequence_type: c.sequence,
        step: c.step,
        trigger_ref: c.triggerRef,
        status: "failed" as const,
        error: res.error.slice(0, 500),
        attempts: prior.failedAttempts + 1,
        dry_run: dryRun,
      });
      assertDb(logError, "Log failed behavioral delivery");
      stats.failed++;
      continue;
    }

    const sentIso = new Date().toISOString();
    const { error: logError } = await supabaseAdmin.from("email_automation_log").insert({
      customer_email: c.email,
      sequence_type: c.sequence,
      step: c.step,
      trigger_ref: c.triggerRef,
      status: "sent" as const,
      sent_at: sentIso,
      resend_message_id: res.id ?? null,
      error: null,
      attempts: prior.failedAttempts + 1,
      dry_run: dryRun,
    });
    // The partial unique index on delivered rows makes a duplicate send
    // structurally impossible; treat the conflict as "already delivered".
    if (logError && !/duplicate key|23505/i.test(logError.message)) {
      assertDb(logError, "Log successful behavioral delivery");
    }
    // Stale deferral rows for this exact step are no longer meaningful.
    if (prior.deferredId) {
      await supabaseAdmin.from("email_automation_log").delete().eq("id", prior.deferredId);
    }
    sentKeys.add(key);
    sentAt.set(key, Date.parse(sentIso));
    usedThisRun.add(c.email);
    lastSent.set(c.email, now);
    stats.sent++;

    // Hard stop: closing the sequence once its final step is delivered.
    if (c.step >= FINAL_STEP[c.sequence]) {
      await supabaseAdmin.from("email_automation_log").insert({
        customer_email: c.email,
        sequence_type: c.sequence,
        step: FINAL_STEP[c.sequence] + 1,
        trigger_ref: c.triggerRef,
        status: "skipped" as const,
        skip_reason: "sequence_complete",
        dry_run: dryRun,
      });
      completed.add(`${c.email}|${c.sequence}|${c.triggerRef}`);
    }
  }

  return stats;
}

/** Terminal suppression: written once, blocks every future attempt. */
async function logTerminal(c: Candidate, reason: string, dryRun: boolean) {
  const { data: dupe } = await supabaseAdmin
    .from("email_automation_log")
    .select("id")
    .eq("customer_email", c.email)
    .eq("sequence_type", c.sequence)
    .eq("step", c.step)
    .eq("trigger_ref", c.triggerRef)
    .eq("dry_run", dryRun)
    .eq("status", "skipped")
    .eq("skip_reason", reason)
    .maybeSingle();
  if (dupe) return;
  const { error } = await supabaseAdmin.from("email_automation_log").insert({
    customer_email: c.email,
    sequence_type: c.sequence,
    step: c.step,
    trigger_ref: c.triggerRef,
    status: "skipped" as const,
    skip_reason: reason,
    dry_run: dryRun,
  });
  assertDb(error, "Log skipped behavioral delivery");
}

/**
 * Deferral: observability only. One row per (email, sequence, step, ref) that is
 * refreshed each run and NEVER blocks a later send attempt.
 */
async function logDeferred(c: Candidate, reason: string, dryRun: boolean, existingId: string | null) {
  if (existingId) {
    const { error } = await supabaseAdmin
      .from("email_automation_log")
      .update({ skip_reason: reason, updated_at: new Date().toISOString() })
      .eq("id", existingId);
    assertDb(error, "Refresh deferred behavioral delivery");
    return;
  }
  const { error } = await supabaseAdmin.from("email_automation_log").insert({
    customer_email: c.email,
    sequence_type: c.sequence,
    step: c.step,
    trigger_ref: c.triggerRef,
    status: "deferred" as const,
    skip_reason: reason,
    dry_run: dryRun,
  });
  assertDb(error, "Log deferred behavioral delivery");
}



// ---------- abandoned cart ----------

async function buildCartCandidates(
  now: number,
  products: Map<string, ProductRow>,
  sales: ActiveSale[],
  sentKeys: Set<string>,
  dryRun: boolean,
): Promise<Candidate[]> {
  const { data: items, error: itemsError } = await supabaseAdmin
    .from("cart_items")
    .select("id, user_id, product_id, created_at, updated_at")
    .gte("updated_at", new Date(now - 30 * DAY).toISOString());
  assertDb(itemsError, "Load abandoned carts");
  if (!items || items.length === 0) return [];

  const byUser = new Map<string, typeof items>();
  for (const it of items) {
    const arr = byUser.get(it.user_id) ?? [];
    arr.push(it);
    byUser.set(it.user_id, arr as typeof items);
  }

  const userIds = Array.from(byUser.keys());
  const { data: profs, error: profilesError } = await supabaseAdmin
    .from("profiles")
    .select("id, email")
    .in("id", userIds);
  assertDb(profilesError, "Load abandoned-cart recipients");
  const emailByUser = new Map<string, string>((profs ?? []).map((p) => [p.id, normalizeEmail(p.email)]));

  const out: Candidate[] = [];

  for (const [userId, rows] of byUser) {
    const email = emailByUser.get(userId) ?? "";
    const activity = Math.max(...rows.map((r) => new Date(r.updated_at ?? r.created_at).getTime()));
    const age = now - activity;
    // Stale carts (older than a week) are past the sequence window — never back-blast them.
    if (age > 7 * DAY) continue;
    // Elapsed time only sets the CEILING; progression decides the actual step.
    const ageStep: 1 | 2 | 3 | null =
      age >= 72 * HOUR ? 3 : age >= 24 * HOUR ? 2 : age >= 1 * HOUR ? 1 : null;

    if (!ageStep) continue;

    const triggerRef = `${userId}:${new Date(activity).toISOString()}`;

    if (!email) {
      // Unrecoverable cart — log once so it is auditable.
      const { error: logError } = await supabaseAdmin.from("email_automation_log").upsert(
        {
          customer_email: `unknown:${userId}`,
          sequence_type: "abandoned_cart" as const,
          step: ageStep,
          trigger_ref: triggerRef,
          status: "skipped" as const,
          skip_reason: "no_valid_email",
          dry_run: dryRun,
        },
        { onConflict: "customer_email,sequence_type,step,trigger_ref,dry_run", ignoreDuplicates: true },
      );
      assertDb(logError, "Log abandoned cart without email");
      continue;
    }

    // highest step already delivered for this exact trigger
    let prevSent = 0;
    for (const s of [1, 2, 3]) {
      if (sentKeys.has(`${email}|abandoned_cart|${s}|${triggerRef}`)) prevSent = s;
    }
    const step = Math.min(ageStep, prevSent + 1) as 1 | 2 | 3;
    if (step > 3) continue;

    // Audit the fact that a later step was time-eligible but held back.
    if (step < ageStep) {
      const { error: logError } = await supabaseAdmin.from("email_automation_log").upsert(
        {
          customer_email: email,
          sequence_type: "abandoned_cart" as const,
          step: ageStep,
          trigger_ref: triggerRef,
          status: "skipped" as const,
          skip_reason: "prior_step_not_sent",
          dry_run: dryRun,
        },
        { onConflict: "customer_email,sequence_type,step,trigger_ref,dry_run" },
      );
      assertDb(logError, "Log deferred abandoned-cart step");
    }

    const productIds = rows.map((r) => r.product_id);
    const live = productIds.map((id) => products.get(id)).filter(Boolean) as ProductRow[];
    if (live.length === 0) continue;
    // One email per customer: highest-priced item is the hero, the rest batch below it.
    const byPrice = [...live].sort((a, b) => effectivePrice(b, sales) - effectivePrice(a, sales));
    const emailItems = byPrice.map((p) => toEmailProduct(p, effectivePrice(p, sales)));
    const deadlineText = deadlineFor(byPrice[0], sales, DEADLINE_CART_FALLBACK);

    out.push({
      email,
      sequence: "abandoned_cart",
      step,
      triggerRef,
      render: () =>
        renderAbandonedCart({ step, items: emailItems, deadlineText, unsubUrl: unsubUrl(email) }),


      guard: async () => {
        const { data: still, error: stillError } = await supabaseAdmin
          .from("cart_items")
          .select("product_id")
          .eq("user_id", userId);
        assertDb(stillError, "Recheck abandoned cart");
        if (!still || still.length === 0) return "cart_empty";
        const liveNow = still.map((s) => products.get(s.product_id)).filter(Boolean);
        if (liveNow.length === 0) return "product_unavailable";
        if (await hasPurchased(email, productIds, new Date(activity).toISOString())) return "already_purchased";
        return null;
      },
    });
  }

  return out;
}

// ---------- saved items ----------
// Batched per customer: one nudge email and one price-drop email per address,
// never one per saved item.

async function buildSavedCandidates(
  now: number,
  products: Map<string, ProductRow>,
  sales: ActiveSale[],
  _dryRun: boolean,
): Promise<Candidate[]> {
  const { data: saved, error: savedError } = await supabaseAdmin
    .from("saved_items")
    .select("id, user_id, product_id, price_at_save, saved_at");
  assertDb(savedError, "Load saved items");
  if (!saved || saved.length === 0) return [];

  const userIds = Array.from(new Set(saved.map((s) => s.user_id)));
  const { data: profs, error: profilesError } = await supabaseAdmin
    .from("profiles")
    .select("id, email")
    .in("id", userIds);
  assertDb(profilesError, "Load saved-item recipients");
  const emailByUser = new Map<string, string>((profs ?? []).map((p) => [p.id, normalizeEmail(p.email)]));

  // Saved-items step 2 is sent at most once per saved item, ever.
  const { data: sentStep2, error: sentStep2Error } = await supabaseAdmin
    .from("email_automation_log")
    .select("trigger_ref")
    .eq("sequence_type", "saved_items")
    .eq("step", 2)
    .eq("status", "sent")
    .eq("dry_run", false);
  assertDb(sentStep2Error, "Load saved-item final-nudge history");
  const step2Done = new Set<string>();
  for (const r of sentStep2 ?? []) {
    for (const id of (r.trigger_ref ?? "").replace(/^s2:/, "").split(",")) {
      if (id) step2Done.add(id);
    }
  }

  type SavedRow = { id: string; product_id: string; price_at_save: number | null; saved_at: string };
  const byUser = new Map<string, { email: string; rows: SavedRow[] }>();
  for (const s of saved) {
    const email = emailByUser.get(s.user_id) ?? "";
    if (!email) continue;
    if (!products.get(s.product_id)) continue;
    const entry = byUser.get(s.user_id) ?? { email, rows: [] };
    entry.rows.push({
      id: s.id,
      product_id: s.product_id,
      price_at_save: s.price_at_save == null ? null : Number(s.price_at_save),
      saved_at: s.saved_at,
    });
    byUser.set(s.user_id, entry);
  }

  const out: Candidate[] = [];

  for (const [userId, { email, rows }] of byUser) {
    // guard shared by both saved-items emails, scoped to the batched item ids
    const guardFor = (savedIds: string[], productIds: string[]) => async (): Promise<string | null> => {
      const { data: still, error: stillError } = await supabaseAdmin
        .from("saved_items")
        .select("id")
        .eq("user_id", userId)
        .in("id", savedIds);
      assertDb(stillError, "Recheck saved items");
      if (!still || still.length === 0) return "no_longer_saved";
      if (productIds.every((id) => !products.get(id))) return "product_unavailable";
      if (await hasPurchased(email, productIds)) return "already_purchased";
      return null;
    };

    // ---- STEP 2: 5-day final nudge (timer driven, never a price change)
    const final5 = rows
      .filter((r) => {
        if (step2Done.has(r.id)) return false;
        const age = now - new Date(r.saved_at).getTime();
        return age >= 5 * DAY && age <= 30 * DAY;
      })
      .sort((a, b) => new Date(a.saved_at).getTime() - new Date(b.saved_at).getTime());

    if (final5.length > 0) {
      const byPrice = [...final5].sort(
        (a, b) =>
          effectivePrice(products.get(b.product_id)!, sales) -
          effectivePrice(products.get(a.product_id)!, sales),
      );
      const items: EmailProduct[] = byPrice.map((r) => {
        const product = products.get(r.product_id)!;
        return toEmailProduct(product, effectivePrice(product, sales));
      });
      const deadlineText = deadlineFor(
        products.get(byPrice[0]!.product_id),
        sales,
        DEADLINE_SAVED_FALLBACK,
      );
      out.push({
        email,
        sequence: "saved_items",
        step: 2,
        // same anchor as step 1 so sequencing holds and it fires once per item
        triggerRef: `s2:${final5.map((r) => r.id).join(",")}`,
        exemptFromSequencing: true,
        render: () => renderSavedItemsFinal({ items, deadlineText, unsubUrl: unsubUrl(email) }),
        guard: guardFor(
          final5.map((r) => r.id),
          final5.map((r) => r.product_id),
        ),
      });
    }

    // ---- STEP 1: 3-day nudge across every eligible saved item
    const eligible = rows
      .filter((r) => {
        const age = now - new Date(r.saved_at).getTime();
        return age >= 3 * DAY && age <= 30 * DAY;
      })
      .sort((a, b) => new Date(a.saved_at).getTime() - new Date(b.saved_at).getTime());

    if (eligible.length > 0) {
      const byPrice = [...eligible].sort(
        (a, b) =>
          effectivePrice(products.get(b.product_id)!, sales) -
          effectivePrice(products.get(a.product_id)!, sales),
      );
      const items = byPrice.map((r) => {
        const product = products.get(r.product_id)!;
        return toEmailProduct(product, effectivePrice(product, sales));
      });
      const deadlineText = deadlineFor(
        products.get(byPrice[0]!.product_id),
        sales,
        DEADLINE_SAVED_FALLBACK,
      );
      out.push({
        email,
        sequence: "saved_items",
        step: 1,
        // oldest eligible saved item anchors the trigger so the nudge fires once
        triggerRef: eligible[0]!.id,
        render: () => renderSavedItemsNudge({ items, deadlineText, unsubUrl: unsubUrl(email) }),
        guard: guardFor(
          eligible.map((r) => r.id),
          eligible.map((r) => r.product_id),
        ),
      });
    }
  }

  return out;
}
