import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type SeqType = "abandoned_cart" | "saved_items";

export const RANGE_KEYS = ["7d", "14d", "30d", "wtd", "mtd"] as const;
export type RangeKey = (typeof RANGE_KEYS)[number];

async function assertAdmin(supabase: { rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown }> }, userId: string) {
  const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (data !== true) throw new Error("Forbidden");
}

/* ---- Central-time (America/Chicago) range boundaries ------------------- */

const TZ = "America/Chicago";
const PARTS_FMT = new Intl.DateTimeFormat("en-US", {
  timeZone: TZ,
  hour12: false,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  weekday: "short",
});
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function centralParts(d: Date) {
  const p = Object.fromEntries(PARTS_FMT.formatToParts(d).map((x) => [x.type, x.value])) as Record<string, string>;
  return {
    y: Number(p.year),
    m: Number(p.month),
    d: Number(p.day),
    h: Number(p.hour) % 24,
    mi: Number(p.minute),
    s: Number(p.second),
    dow: WEEKDAYS.indexOf(p.weekday ?? "Sun"),
  };
}

/** Offset (ms) between Central wall-clock time and UTC at instant `d`. */
function centralOffset(d: Date) {
  const p = centralParts(d);
  return Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi, p.s) - d.getTime();
}

/** UTC instant of Central midnight, `daysBack` days before today. */
function centralMidnight(daysBack: number): Date {
  const now = new Date();
  const p = centralParts(now);
  const localMidnight = Date.UTC(p.y, p.m - 1, p.d) - daysBack * 86400_000;
  let inst = new Date(localMidnight - centralOffset(now));
  // refine once so DST transitions inside the window stay correct
  inst = new Date(localMidnight - centralOffset(inst));
  return inst;
}

/** [from, to) in UTC for a range key. Week starts Sunday; all math in Central. */
export function rangeBounds(range: RangeKey): { from: Date; to: Date } {
  const now = new Date();
  const p = centralParts(now);
  let daysBack: number;
  if (range === "7d") daysBack = 6;
  else if (range === "14d") daysBack = 13;
  else if (range === "30d") daysBack = 29;
  else if (range === "wtd") daysBack = p.dow;
  else daysBack = p.d - 1;
  return { from: centralMidnight(daysBack), to: new Date(now.getTime() + 60_000) };
}

/* ---- stats ------------------------------------------------------------- */

export type StepStat = { sequence: SeqType; step: number; sent: number; sales: number; netCents: number };
export type SeqOutcome = { sequence: SeqType; skipped: number; failed: number; dryRun: number };
export type SkipRow = {
  email: string;
  sequence: SeqType;
  step: number;
  reason: string;
  at: string;
  dryRun: boolean;
};

export const getEmailAutomationStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ range: z.enum(RANGE_KEYS).default("30d") }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase as never, context.userId);
    const supabase = context.supabase;
    const { from, to } = rangeBounds(data.range);

    const { data: stats, error } = await supabase.rpc("admin_behavioral_email_stats", {
      _from: from.toISOString(),
      _to: to.toISOString(),
    });
    if (error) throw new Error(error.message);

    const payload = (stats ?? {}) as {
      steps?: StepStat[];
      outcomes?: SeqOutcome[];
      recentSkips?: SkipRow[];
    };

    const { data: settings } = await supabase
      .from("email_sequence_settings")
      .select("sequence_type, enabled");

    return {
      range: data.range,
      from: from.toISOString(),
      to: to.toISOString(),
      steps: payload.steps ?? [],
      outcomes: payload.outcomes ?? [],
      recentSkips: payload.recentSkips ?? [],
      settings: Object.fromEntries((settings ?? []).map((s) => [s.sequence_type, s.enabled])) as Record<
        string,
        boolean
      >,
    };
  });

export const setEmailSequenceEnabled = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ sequence: z.enum(["abandoned_cart", "saved_items"]), enabled: z.boolean() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase as never, context.userId);
    const { error } = await context.supabase
      .from("email_sequence_settings")
      .update({ enabled: data.enabled })
      .eq("sequence_type", data.sequence);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

// Dry-run: evaluates every rule and writes dry-run log rows without calling Resend.
// Optionally scoped to a single designated test address.
export const runEmailAutomationDryRun = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ onlyEmail: z.string().trim().email().optional() }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase as never, context.userId);
    const { runBehavioralEmailJob } = await import("@/lib/behavioral-email.server");
    return await runBehavioralEmailJob({ dryRun: true, onlyEmail: data.onlyEmail });
  });

export const TEST_TEMPLATES = ["cart_1h", "cart_24h", "cart_72h", "saved_3day", "saved_5day"] as const;
export type TestTemplateKey = (typeof TEST_TEMPLATES)[number];

// One-off test send. Uses sample product data only: it never reads a customer's
// cart/saved items, never writes to email_automation_log and never counts in stats.
export const sendBehavioralTestEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        template: z.enum(TEST_TEMPLATES),
        to: z.string().trim().email(),
        multipleItems: z.boolean().default(false),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase as never, context.userId);
    const { sendBehavioralTestEmail: send } = await import("@/lib/behavioral-email-test.server");
    const res = await send({ template: data.template, to: data.to, multipleItems: data.multipleItems });
    if (res.error) throw new Error(res.error);
    return { ok: true as const, to: data.to, subject: res.subject };
  });
