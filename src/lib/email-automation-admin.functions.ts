import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type SeqType = "abandoned_cart" | "saved_items";

async function assertAdmin(supabase: { rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown }> }, userId: string) {
  const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (data !== true) throw new Error("Forbidden");
}

export const getEmailAutomationStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase as never, context.userId);
    const supabase = context.supabase;
    const now = Date.now();
    const since30 = new Date(now - 30 * 86400_000).toISOString();
    const since7 = new Date(now - 7 * 86400_000).toISOString();

    const { data: logs } = await supabase
      .from("email_automation_log")
      .select("customer_email, sequence_type, step, status, skip_reason, sent_at, created_at, dry_run")
      .gte("created_at", since30)
      .order("created_at", { ascending: false })
      .limit(5000);

    const rows = logs ?? [];

    const bucket = (seq: SeqType) => {
      const mk = () => ({ 1: 0, 2: 0, 3: 0 } as Record<number, number>);
      const d7 = mk();
      const d30 = mk();
      let failed = 0;
      let skipped = 0;
      let dryRun = 0;
      for (const r of rows) {
        if (r.sequence_type !== seq) continue;
        if (r.dry_run) {
          dryRun++;
          continue;
        }
        if (r.status === "sent" && r.sent_at) {
          d30[r.step] = (d30[r.step] ?? 0) + 1;
          if (r.sent_at >= since7) d7[r.step] = (d7[r.step] ?? 0) + 1;
        } else if (r.status === "failed") failed++;
        else if (r.status === "skipped") skipped++;
      }
      return { last7: d7, last30: d30, failed, skipped, dryRun };
    };


    // Recovered orders: completed within 24h after a sequence email to that address
    const sentRows = rows.filter((r) => r.status === "sent" && r.sent_at);
    const emails = Array.from(new Set(sentRows.map((r) => r.customer_email)));
    const recovered: Record<SeqType, number> = { abandoned_cart: 0, saved_items: 0 };
    if (emails.length > 0) {
      const { data: idents } = await supabase
        .from("order_customer_identity")
        .select("normalized_email, created_at, status")
        .gte("created_at", since30)
        .in("normalized_email", emails);
      for (const r of sentRows) {
        const t = new Date(r.sent_at as string).getTime();
        const hit = (idents ?? []).some((o) => {
          if (o.normalized_email !== r.customer_email) return false;
          if (o.status !== "completed" && o.status !== "partial") return false;
          const ot = o.created_at ? new Date(o.created_at).getTime() : 0;
          return ot >= t && ot <= t + 86400_000;
        });

        if (hit) recovered[r.sequence_type as SeqType]++;
      }
    }

    const { data: settings } = await supabase.from("email_sequence_settings").select("sequence_type, enabled");

    const recentSkips = rows
      .filter((r) => r.status === "skipped")
      .slice(0, 12)
      .map((r) => ({
        email: r.customer_email,
        sequence: r.sequence_type as SeqType,
        step: r.step,
        reason: r.skip_reason ?? "unknown",
        at: r.created_at,
      }));

    return {
      abandoned_cart: { ...bucket("abandoned_cart"), recovered: recovered.abandoned_cart },
      saved_items: { ...bucket("saved_items"), recovered: recovered.saved_items },
      settings: Object.fromEntries((settings ?? []).map((s) => [s.sequence_type, s.enabled])) as Record<string, boolean>,
      recentSkips,
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
