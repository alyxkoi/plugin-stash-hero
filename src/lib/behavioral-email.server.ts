// Behavioral email engine: abandoned cart + saved items sequences.
// Server-only. Invoked by the 15-minute scheduled job.
import { createHmac } from "crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sendEmail } from "./resend.server";
import {
  renderAbandonedCart,
  renderPriceDrop,
  renderSavedItemsNudge,
  SITE_URL,
  type EmailProduct,
} from "./behavioral-email-templates.server";

const FROM = "Plugin Warehouse <hello@thepluginwarehouse.com>";
const HOUR = 3600_000;
const DAY = 24 * HOUR;

type SequenceType = "abandoned_cart" | "saved_items";

export function normalizeEmail(e: string | null | undefined): string {
  return (e ?? "").trim().toLowerCase();
}

export function unsubToken(email: string): string {
  const secret = process.env.EMAIL_UNSUB_SECRET ?? "";
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
  // event-driven emails (saved-items price drop) may fire without the earlier step
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
  status: "sent" | "failed" | "skipped";
  skip_reason: string | null;
  attempts: number;
  sent_at: string | null;
};


// ---------- pricing ----------

type ActiveSale = { discount_pct: number; scope: string; categories: string[]; productIds: Set<string> };

async function loadActiveSales(): Promise<ActiveSale[]> {
  const nowIso = new Date().toISOString();
  const { data: sales } = await supabaseAdmin
    .from("sale_events")
    .select("id, discount_pct, scope, categories, start_at, end_at, status")
    .neq("status", "draft")
    .lte("start_at", nowIso)
    .gte("end_at", nowIso);
  const list = sales ?? [];
  if (list.length === 0) return [];
  const { data: junction } = await supabaseAdmin
    .from("sale_event_products")
    .select("sale_event_id, product_id")
    .in("sale_event_id", list.map((s) => s.id));
  return list.map((s) => ({
    discount_pct: s.discount_pct ?? 0,
    scope: s.scope as string,
    categories: (s.categories as string[]) ?? [],
    productIds: new Set((junction ?? []).filter((j) => j.sale_event_id === s.id).map((j) => j.product_id)),
  }));
}

type ProductRow = {
  id: string;
  slug: string;
  name: string;
  price: number;
  cover_url: string | null;
  category: string;
  status: string;
};

function effectivePrice(p: ProductRow, sales: ActiveSale[]): number {
  let best = 0;
  for (const s of sales) {
    const applies =
      s.scope === "all" ||
      (s.scope === "categories" && s.categories.includes(p.category)) ||
      (s.scope === "selected" && s.productIds.has(p.id));
    if (applies) best = Math.max(best, s.discount_pct ?? 0);
  }
  if (best <= 0) return Number(p.price);
  return Math.round(Number(p.price) * (1 - best / 100) * 100) / 100;
}

function toEmailProduct(p: ProductRow, price: number): EmailProduct {
  return { name: p.name, price, coverUrl: p.cover_url, slug: p.slug };
}

// ---------- shared lookups ----------

async function hasPurchased(email: string, productIds: string[], since?: string): Promise<boolean> {
  if (productIds.length === 0) return false;
  let q = supabaseAdmin
    .from("orders")
    .select("id, created_at, order_items!inner(product_id)")
    .in("status", ["completed", "partial"])
    .in("order_items.product_id", productIds);
  if (since) q = q.gte("created_at", since);
  const { data } = await q.limit(1);
  if (data && data.length > 0) {
    // Confirm the order belongs to this email
    const ids = data.map((o) => o.id);
    const { data: owned } = await supabaseAdmin
      .from("orders")
      .select("id, guest_email, user_id, profiles:user_id(email)")
      .in("id", ids);
    for (const o of owned ?? []) {
      const em = normalizeEmail(o.guest_email ?? (o as unknown as { profiles?: { email?: string } }).profiles?.email);
      if (em === email) return true;
    }
  }
  return false;
}

async function optedOut(emails: string[]): Promise<Set<string>> {
  if (emails.length === 0) return new Set();
  const { data } = await supabaseAdmin
    .from("email_preferences")
    .select("customer_email, behavioral_emails_enabled, unsubscribed_at")
    .in("customer_email", emails);
  const out = new Set<string>();
  for (const r of data ?? []) {
    if (!r.behavioral_emails_enabled || r.unsubscribed_at) out.add(r.customer_email);
  }
  return out;
}

// ---------- main run ----------

// Skip reasons that represent a temporary suppression: the same (email, sequence,
// step, ref) may be retried on a later run.
const RETRYABLE_SKIPS = new Set(["frequency_cap", "prior_step_not_sent"]);

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

  const { data: settingsRows } = await supabaseAdmin
    .from("email_sequence_settings")
    .select("sequence_type, enabled");
  const enabled = new Map<string, boolean>((settingsRows ?? []).map((r) => [r.sequence_type, r.enabled]));

  const sales = await loadActiveSales();

  const { data: productRows } = await supabaseAdmin
    .from("products")
    .select("id, slug, name, price, cover_url, category, status")
    .eq("status", "published");
  const products = new Map<string, ProductRow>((productRows ?? []).map((p) => [p.id, p as ProductRow]));

  // Sequence progression: every step already delivered (real or dry-run).
  const { data: sentRows } = await supabaseAdmin
    .from("email_automation_log")
    .select("customer_email, sequence_type, step, trigger_ref")
    .eq("status", "sent")
    .gte("created_at", new Date(now - 60 * DAY).toISOString());
  const sentKeys = new Set<string>(
    (sentRows ?? []).map((r) => `${r.customer_email}|${r.sequence_type}|${r.step}|${r.trigger_ref}`),
  );

  const candidates: Candidate[] = [];

  if (enabled.get("abandoned_cart") !== false) {
    candidates.push(...(await buildCartCandidates(now, products, sales, sentKeys, dryRun)));
  }
  if (enabled.get("saved_items") !== false) {
    candidates.push(...(await buildSavedCandidates(now, products, sales, dryRun)));
  }

  const scoped = onlyEmail ? candidates.filter((c) => c.email === onlyEmail) : candidates;

  // Existing log rows for these (email, sequence, step, ref) combos
  const emails = Array.from(new Set(scoped.map((c) => c.email)));
  const existing = new Map<string, LogRow>();
  if (emails.length > 0) {
    const { data: logs } = await supabaseAdmin
      .from("email_automation_log")
      .select("id, customer_email, sequence_type, step, trigger_ref, status, skip_reason, attempts, sent_at")
      .in("customer_email", emails);
    for (const l of (logs ?? []) as LogRow[]) {
      existing.set(`${l.customer_email}|${l.sequence_type}|${l.step}|${l.trigger_ref}`, l);
    }
  }

  const opted = await optedOut(emails);

  // Frequency cap: last successful behavioral send per email (any sequence)
  const lastSent = new Map<string, number>();
  if (emails.length > 0) {
    const { data: recent } = await supabaseAdmin
      .from("email_automation_log")
      .select("customer_email, sent_at")
      .eq("status", "sent")
      .gte("sent_at", new Date(now - DAY).toISOString())
      .in("customer_email", emails);
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
    const prior = existing.get(key);

    if (prior && prior.status === "sent") continue;
    if (prior && prior.status === "skipped" && !RETRYABLE_SKIPS.has(prior.skip_reason ?? "")) continue;
    if (prior && prior.status === "failed" && prior.attempts >= 2) continue; // retried once already

    // strict sequencing: a step only fires once the previous step was delivered.
    // The saved-items price-drop email is event-driven and exempt by design.
    if (c.step > 1 && !c.exemptFromSequencing) {
      const prevKey = `${c.email}|${c.sequence}|${c.step - 1}|${c.triggerRef}`;
      if (!sentKeys.has(prevKey)) {
        await logSkip(c, "prior_step_not_sent", dryRun);
        stats.skipped++;
        continue;
      }
    }

    // opt-out
    if (opted.has(c.email)) {
      await logSkip(c, "unsubscribed", dryRun);
      stats.skipped++;
      continue;
    }

    // send-time guard
    const reason = await c.guard();
    if (reason) {
      await logSkip(c, reason, dryRun);
      stats.skipped++;
      continue;
    }

    // frequency cap: one behavioral email per address per 24h
    const last = lastSent.get(c.email) ?? 0;
    if (usedThisRun.has(c.email) || now - last < DAY) {
      await logSkip(c, "frequency_cap", dryRun);
      stats.deferred++;
      continue;
    }

    const mail = c.render();
    const res = dryRun
      ? { id: null as string | null, error: undefined as string | undefined }
      : await sendEmail({
          from: FROM,
          to: c.email,
          subject: mail.subject,
          html: mail.html,
          text: mail.text,
        });

    if (res.error) {
      await supabaseAdmin.from("email_automation_log").upsert(
        {
          customer_email: c.email,
          sequence_type: c.sequence,
          step: c.step,
          trigger_ref: c.triggerRef,
          status: "failed" as const,
          error: res.error.slice(0, 500),
          attempts: (prior?.attempts ?? 0) + 1,
          dry_run: dryRun,
        },
        { onConflict: "customer_email,sequence_type,step,trigger_ref" },
      );
      stats.failed++;
      continue;
    }

    await supabaseAdmin.from("email_automation_log").upsert(
      {
        customer_email: c.email,
        sequence_type: c.sequence,
        step: c.step,
        trigger_ref: c.triggerRef,
        status: "sent" as const,
        sent_at: new Date().toISOString(),
        resend_message_id: res.id ?? null,
        error: null,
        attempts: (prior?.attempts ?? 0) + 1,
        dry_run: dryRun,
      },
      { onConflict: "customer_email,sequence_type,step,trigger_ref" },
    );
    sentKeys.add(`${c.email}|${c.sequence}|${c.step}|${c.triggerRef}`);
    usedThisRun.add(c.email);
    lastSent.set(c.email, now);
    stats.sent++;
  }

  return stats;
}

async function logSkip(c: Candidate, reason: string, dryRun: boolean) {
  // Retryable suppressions must be able to change on a later run, so they are
  // upserted (not ignored) and re-evaluated next time.
  const retryable = RETRYABLE_SKIPS.has(reason);
  await supabaseAdmin.from("email_automation_log").upsert(
    {
      customer_email: c.email,
      sequence_type: c.sequence,
      step: c.step,
      trigger_ref: c.triggerRef,
      status: "skipped" as const,
      skip_reason: reason,
      dry_run: dryRun,
    },
    { onConflict: "customer_email,sequence_type,step,trigger_ref", ignoreDuplicates: !retryable },
  );
}


// ---------- abandoned cart ----------

async function buildCartCandidates(
  now: number,
  products: Map<string, ProductRow>,
  sales: ActiveSale[],
  sentKeys: Set<string>,
  dryRun: boolean,
): Promise<Candidate[]> {
  const { data: items } = await supabaseAdmin
    .from("cart_items")
    .select("id, user_id, product_id, created_at, updated_at")
    .gte("updated_at", new Date(now - 30 * DAY).toISOString());
  if (!items || items.length === 0) return [];

  const byUser = new Map<string, typeof items>();
  for (const it of items) {
    const arr = byUser.get(it.user_id) ?? [];
    arr.push(it);
    byUser.set(it.user_id, arr as typeof items);
  }

  const userIds = Array.from(byUser.keys());
  const { data: profs } = await supabaseAdmin.from("profiles").select("id, email").in("id", userIds);
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
      await supabaseAdmin.from("email_automation_log").upsert(
        {
          customer_email: `unknown:${userId}`,
          sequence_type: "abandoned_cart" as const,
          step: ageStep,
          trigger_ref: triggerRef,
          status: "skipped" as const,
          skip_reason: "no_valid_email",
          dry_run: dryRun,
        },
        { onConflict: "customer_email,sequence_type,step,trigger_ref", ignoreDuplicates: true },
      );
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
      await supabaseAdmin.from("email_automation_log").upsert(
        {
          customer_email: email,
          sequence_type: "abandoned_cart" as const,
          step: ageStep,
          trigger_ref: triggerRef,
          status: "skipped" as const,
          skip_reason: "prior_step_not_sent",
          dry_run: dryRun,
        },
        { onConflict: "customer_email,sequence_type,step,trigger_ref" },
      );
    }

    const productIds = rows.map((r) => r.product_id);
    const live = productIds.map((id) => products.get(id)).filter(Boolean) as ProductRow[];
    const emailItems = live.map((p) => toEmailProduct(p, effectivePrice(p, sales)));
    const total = emailItems.reduce((s, i) => s + i.price, 0);

    out.push({
      email,
      sequence: "abandoned_cart",
      step,
      triggerRef,
      render: () => renderAbandonedCart({ step, items: emailItems, total, unsubUrl: unsubUrl(email) }),

      guard: async () => {
        const { data: still } = await supabaseAdmin
          .from("cart_items")
          .select("product_id")
          .eq("user_id", userId);
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

async function buildSavedCandidates(
  now: number,
  products: Map<string, ProductRow>,
  sales: ActiveSale[],
  _dryRun: boolean,
): Promise<Candidate[]> {
  const { data: saved } = await supabaseAdmin
    .from("saved_items")
    .select("id, user_id, product_id, price_at_save, saved_at");
  if (!saved || saved.length === 0) return [];

  const userIds = Array.from(new Set(saved.map((s) => s.user_id)));
  const { data: profs } = await supabaseAdmin.from("profiles").select("id, email").in("id", userIds);
  const emailByUser = new Map<string, string>((profs ?? []).map((p) => [p.id, normalizeEmail(p.email)]));

  // 30-day cap on price-drop alerts per saved item
  const { data: recentDrops } = await supabaseAdmin
    .from("email_automation_log")
    .select("trigger_ref, sent_at")
    .eq("sequence_type", "saved_items")
    .eq("step", 2)
    .eq("status", "sent")
    .gte("sent_at", new Date(now - 30 * DAY).toISOString());
  const dropRecently = new Set((recentDrops ?? []).map((r) => r.trigger_ref.split(":")[0]));

  const out: Candidate[] = [];

  for (const s of saved) {
    const email = emailByUser.get(s.user_id) ?? "";
    if (!email) continue;
    const product = products.get(s.product_id);
    if (!product) continue;

    const current = effectivePrice(product, sales);
    const savedPrice = s.price_at_save == null ? null : Number(s.price_at_save);

    const stillSavedAndUnbought = async (): Promise<string | null> => {
      const { data: row } = await supabaseAdmin.from("saved_items").select("id").eq("id", s.id).maybeSingle();
      if (!row) return "no_longer_saved";
      if (!products.get(s.product_id)) return "product_unavailable";
      if (await hasPurchased(email, [s.product_id])) return "already_purchased";
      return null;
    };

    // STEP 2 — price drop (event driven, takes precedence over the slow nudge)
    if (savedPrice != null && savedPrice > 0 && current < savedPrice - 0.005 && !dropRecently.has(s.id)) {
      out.push({
        email,
        sequence: "saved_items",
        step: 2,
        triggerRef: `${s.id}:${Math.round(current * 100)}`,
        exemptFromSequencing: true,
        render: () =>
          renderPriceDrop({
            item: toEmailProduct(product, current),
            oldPrice: savedPrice,
            newPrice: current,
            unsubUrl: unsubUrl(email),
          }),
        guard: stillSavedAndUnbought,
      });
    }

    // STEP 1 — 3 days after saving
    const age = now - new Date(s.saved_at).getTime();
    if (age >= 3 * DAY && age <= 30 * DAY) {
      out.push({
        email,
        sequence: "saved_items",
        step: 1,
        triggerRef: s.id,
        render: () =>
          renderSavedItemsNudge({ items: [toEmailProduct(product, current)], unsubUrl: unsubUrl(email) }),
        guard: stillSavedAndUnbought,
      });
    }
  }

  return out;
}
