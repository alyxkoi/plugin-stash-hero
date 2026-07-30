import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type CreditEntry = {
  id: string;
  amount_cents: number;
  type: string;
  reason: string | null;
  order_id: string | null;
  order_number: string | null;
  created_by_name: string | null;
  created_at: string;
  balance_after_cents: number;
};

export type CreditSnapshot = {
  balance_cents: number;
  entries: CreditEntry[];
};

async function loadLedger(customerId: string): Promise<CreditSnapshot> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: rows } = await supabaseAdmin
    .from("store_credit_ledger")
    .select("id, amount_cents, type, reason, order_id, created_by, created_at")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: true });

  const list = (rows ?? []) as Array<{
    id: string; amount_cents: number; type: string; reason: string | null;
    order_id: string | null; created_by: string | null; created_at: string;
  }>;

  const orderIds = [...new Set(list.map((r) => r.order_id).filter(Boolean))] as string[];
  const adminIds = [...new Set(list.map((r) => r.created_by).filter(Boolean))] as string[];

  const orderNumbers = new Map<string, string>();
  if (orderIds.length > 0) {
    const { data } = await supabaseAdmin.from("orders").select("id, number").in("id", orderIds);
    for (const o of data ?? []) orderNumbers.set(o.id as string, o.number as string);
  }
  const adminNames = new Map<string, string>();
  if (adminIds.length > 0) {
    const { data } = await supabaseAdmin
      .from("profiles")
      .select("id, email, display_name, first_name, last_name")
      .in("id", adminIds);
    for (const p of data ?? []) {
      const full = [p.first_name, p.last_name].filter(Boolean).join(" ");
      adminNames.set(p.id as string, full || (p.display_name as string) || (p.email as string));
    }
  }

  let running = 0;
  const entries: CreditEntry[] = list.map((r) => {
    running += r.amount_cents;
    return {
      id: r.id,
      amount_cents: r.amount_cents,
      type: r.type,
      reason: r.reason,
      order_id: r.order_id,
      order_number: r.order_id ? orderNumbers.get(r.order_id) ?? null : null,
      created_by_name: r.created_by ? adminNames.get(r.created_by) ?? null : null,
      created_at: r.created_at,
      balance_after_cents: running,
    };
  });

  return { balance_cents: running, entries: entries.reverse() };
}

/** Customer-facing: my own balance + history. */
export const getMyStoreCredit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<CreditSnapshot> => {
    const { userId } = context as any;
    return loadLedger(userId as string);
  });

async function assertAdmin(context: any) {
  const { supabase, userId } = context;
  const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (!isAdmin) throw new Error("Not authorized");
}

/** Admin: read any customer's balance + history. */
export const adminGetStoreCredit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { customerId: string }) => {
    if (!/^[0-9a-f-]{36}$/i.test(data?.customerId ?? "")) throw new Error("Invalid customerId");
    return data;
  })
  .handler(async ({ data, context }): Promise<CreditSnapshot | { error: string }> => {
    try {
      await assertAdmin(context);
      return await loadLedger(data.customerId);
    } catch (e: any) {
      return { error: e?.message ?? "Failed to load store credit" };
    }
  });

/** Admin: grant (positive) or deduct (negative) store credit. */
export const adminAdjustStoreCredit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { customerId: string; amountCents: number; reason: string }) => {
    if (!/^[0-9a-f-]{36}$/i.test(data?.customerId ?? "")) throw new Error("Invalid customerId");
    if (!Number.isInteger(data.amountCents) || data.amountCents === 0) throw new Error("Enter a non-zero amount");
    if (Math.abs(data.amountCents) > 1_000_000) throw new Error("Amount is too large");
    if (!data.reason || data.reason.trim().length < 3) throw new Error("A reason is required");
    if (data.reason.length > 300) throw new Error("Reason is too long");
    return data;
  })
  .handler(async ({ data, context }): Promise<{ balance_cents: number } | { error: string }> => {
    try {
      await assertAdmin(context);
      const { supabase } = context as any;
      const { data: bal, error } = await supabase.rpc("admin_grant_store_credit", {
        _customer_id: data.customerId,
        _amount_cents: data.amountCents,
        _reason: data.reason.trim(),
        _type: data.amountCents > 0 ? "grant" : "adjustment",
      });
      if (error) return { error: error.message };
      return { balance_cents: Number(bal ?? 0) };
    } catch (e: any) {
      return { error: e?.message ?? "Failed to adjust store credit" };
    }
  });

/**
 * Guest checkout hint: does an account with this email hold store credit?
 * Returns a boolean only — never the amount — so it can prompt a sign-in
 * without leaking balances.
 */
export const guestEmailHasCredit = createServerFn({ method: "POST" })
  .inputValidator((data: { email: string }) => {
    if (!data?.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) throw new Error("Invalid email");
    return { email: data.email.trim().toLowerCase() };
  })
  .handler(async ({ data }): Promise<{ hasCredit: boolean }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: prof } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .ilike("email", data.email)
      .maybeSingle();
    if (!prof) return { hasCredit: false };
    const { data: rows } = await supabaseAdmin
      .from("store_credit_ledger")
      .select("amount_cents")
      .eq("customer_id", prof.id as string);
    const balance = (rows ?? []).reduce((n: number, r: any) => n + Number(r.amount_cents || 0), 0);
    return { hasCredit: balance > 0 };
  });
