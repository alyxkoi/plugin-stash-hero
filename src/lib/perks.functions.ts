import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const BATCH_SIZE = 200;

export type PerkProduct = {
  id: string;
  name: string;
  price: number;
  is_free: boolean;
  cover_url: string | null;
  cover_gradient: string | null;
};

export type PerkAccount = {
  id: string;
  email: string;
  name: string | null;
};

export type GrantBatchRow = {
  id: string;
  type: "plugin" | "credit";
  summary: string;
  reason: string;
  recipient_count: number;
  granted_count: number;
  skipped_count: number;
  failed_count: number;
  status: string;
  created_at: string;
  completed_at: string | null;
  admin_name: string | null;
};

export type BatchRecipient = {
  id: string;
  customer_id: string;
  email: string | null;
  name: string | null;
  product_id: string | null;
  product_name: string | null;
  amount_cents: number | null;
  revoked_at: string | null;
};

async function assertAdmin(context: any) {
  const { supabase, userId } = context;
  const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (!isAdmin) throw new Error("Not authorized");
}

function chunk<T>(list: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

function displayName(p: { first_name?: string | null; last_name?: string | null; display_name?: string | null }) {
  const full = [p.first_name, p.last_name].filter(Boolean).join(" ").trim();
  return full || p.display_name || null;
}

/** Products + registered accounts for the Perks pickers. */
export const perksBootstrap = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ products: PerkProduct[]; accounts: PerkAccount[] } | { error: string }> => {
    try {
      await assertAdmin(context);
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const [{ data: products }, { data: profiles }] = await Promise.all([
        supabaseAdmin
          .from("products")
          .select("id, name, price, is_free, cover_url, cover_gradient")
          .neq("status", "archived")
          .order("name"),
        supabaseAdmin
          .from("profiles")
          .select("id, email, display_name, first_name, last_name")
          .order("email"),
      ]);
      return {
        products: (products ?? []).map((p: any) => ({
          id: p.id, name: p.name, price: Number(p.price ?? 0), is_free: !!p.is_free,
          cover_url: p.cover_url, cover_gradient: p.cover_gradient,
        })),
        accounts: (profiles ?? []).map((p: any) => ({ id: p.id, email: p.email, name: displayName(p) })),
      };
    } catch (e: any) {
      return { error: e?.message ?? "Failed to load Perks data" };
    }
  });

type RunInput = {
  kind: "plugin" | "credit";
  productIds?: string[];
  amountCents?: number;
  allAccounts: boolean;
  customerIds: string[];
  reason: string;
};

export type RunResult =
  | { batchId: string; granted: number; skipped: number; failed: number; errors: string[] }
  | { error: string };

/**
 * Executes a grant batch fully server-side in chunks of 200 rows.
 * Idempotent: plugin grants rely on the active-grant unique index, credit rows
 * on a per-batch idempotency key, so re-running never duplicates or double-credits.
 */
export const runGrantBatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: RunInput) => {
    if (data.kind !== "plugin" && data.kind !== "credit") throw new Error("Invalid grant type");
    if (!data.reason || data.reason.trim().length < 3) throw new Error("A reason is required");
    if (data.reason.length > 300) throw new Error("Reason is too long");
    if (data.kind === "plugin") {
      if (!Array.isArray(data.productIds) || data.productIds.length === 0) throw new Error("Pick at least one plugin");
      if (data.productIds.length > 100) throw new Error("Too many plugins in one batch");
    } else {
      if (!Number.isInteger(data.amountCents) || (data.amountCents as number) <= 0) throw new Error("Enter an amount greater than $0");
      if ((data.amountCents as number) > 1_000_000) throw new Error("Amount is too large");
    }
    if (!data.allAccounts && (!Array.isArray(data.customerIds) || data.customerIds.length === 0)) {
      throw new Error("Pick at least one recipient");
    }
    return data;
  })
  .handler(async ({ data, context }): Promise<RunResult> => {
    try {
      await assertAdmin(context);
      const { userId } = context as any;
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

      // Resolve recipients
      let recipients: string[];
      if (data.allAccounts) {
        const { data: rows } = await supabaseAdmin.from("profiles").select("id");
        recipients = (rows ?? []).map((r: any) => r.id as string);
      } else {
        const { data: rows } = await supabaseAdmin
          .from("profiles").select("id").in("id", data.customerIds);
        recipients = (rows ?? []).map((r: any) => r.id as string);
      }
      recipients = [...new Set(recipients)];
      if (recipients.length === 0) return { error: "No valid recipients found" };

      const reason = data.reason.trim();
      let summary: string;
      let productNames: string[] = [];
      if (data.kind === "plugin") {
        const { data: prods } = await supabaseAdmin
          .from("products").select("id, name").in("id", data.productIds!);
        productNames = (prods ?? []).map((p: any) => p.name as string);
        if (productNames.length === 0) return { error: "No valid products found" };
        summary = `${productNames.length} plugin${productNames.length !== 1 ? "s" : ""}: ${productNames.join(", ")}`;
      } else {
        summary = `$${((data.amountCents as number) / 100).toFixed(2)} store credit`;
      }

      const { data: batch, error: batchErr } = await supabaseAdmin
        .from("grant_batches")
        .insert({
          type: data.kind,
          summary,
          reason,
          recipient_count: recipients.length,
          status: "running",
          created_by: userId,
        })
        .select("id")
        .single();
      if (batchErr || !batch) return { error: batchErr?.message ?? "Could not start batch" };
      const batchId = batch.id as string;

      let granted = 0;
      let skipped = 0;
      let failed = 0;

      const errors: string[] = [];

      try {
        if (data.kind === "plugin") {
          const validProductIds = (await supabaseAdmin
            .from("products").select("id").in("id", data.productIds!)).data?.map((p: any) => p.id as string) ?? [];

          // Already-active grants are skipped up front. The unique index is
          // PARTIAL (WHERE revoked_at IS NULL) so it cannot be used for
          // ON CONFLICT inference — we must never upsert here, or every insert
          // fails with 42P10. Plain inserts only, revoked_at stays NULL.
          const active = new Set<string>();
          for (const part of chunk(recipients, BATCH_SIZE)) {
            const { data: existing } = await supabaseAdmin
              .from("plugin_grants")
              .select("customer_id, product_id")
              .in("customer_id", part)
              .in("product_id", validProductIds)
              .is("revoked_at", null);
            for (const g of (existing ?? []) as any[]) active.add(`${g.customer_id}:${g.product_id}`);
          }

          const rows: Array<{
            customer_id: string; product_id: string; reason: string;
            granted_by: string; batch_id: string; revoked_at: null;
          }> = [];
          for (const customerId of recipients) {
            for (const productId of validProductIds) {
              if (active.has(`${customerId}:${productId}`)) { skipped += 1; continue; }
              rows.push({
                customer_id: customerId,
                product_id: productId,
                reason,
                granted_by: userId,
                batch_id: batchId,
                revoked_at: null,
              });
            }
          }

          for (const part of chunk(rows, BATCH_SIZE)) {
            const { data: inserted, error } = await supabaseAdmin
              .from("plugin_grants")
              .insert(part)
              .select("id");
            if (!error) { granted += (inserted ?? []).length; continue; }
            // A race or leftover duplicate poisons the whole chunk — retry row by row.
            for (const row of part) {
              const { error: rowErr } = await supabaseAdmin.from("plugin_grants").insert(row).select("id").single();
              if (!rowErr) { granted += 1; continue; }
              if ((rowErr as any).code === "23505") { skipped += 1; continue; }
              failed += 1;
              console.error("[perks] plugin grant insert failed", rowErr);
              if (errors.length < 3) errors.push(rowErr.message);
            }
          }
        } else {
          const amount = data.amountCents as number;
          const rows = recipients.map((customerId) => ({
            customer_id: customerId,
            amount_cents: amount,
            type: "grant" as const,
            reason,
            created_by: userId,
            batch_id: batchId,
            idempotency_key: `batch:${batchId}:${customerId}`,
          }));
          for (const part of chunk(rows, BATCH_SIZE)) {
            const { data: inserted, error } = await supabaseAdmin
              .from("store_credit_ledger")
              .upsert(part, { onConflict: "idempotency_key", ignoreDuplicates: true })
              .select("id");
            if (error) {
              failed += part.length;
              console.error("[perks] credit grant insert failed", error);
              if (errors.length < 3) errors.push(error.message);
              continue;
            }
            const n = (inserted ?? []).length;
            granted += n;
            skipped += part.length - n;
          }
        }
      } catch (e: any) {
        failed += 1;
        console.error("[perks] batch execution threw", e);
        if (errors.length < 3) errors.push(e?.message ?? "Unknown error");
      }


      await supabaseAdmin
        .from("grant_batches")
        .update({
          granted_count: granted,
          skipped_count: skipped,
          failed_count: failed,
          status: failed > 0 && granted === 0 ? "failed" : "complete",
          completed_at: new Date().toISOString(),
        })
        .eq("id", batchId);

      return { batchId, granted, skipped, failed, errors };
    } catch (e: any) {
      return { error: e?.message ?? "Grant failed" };
    }
  });

/** Recent grant batches for the history panel. */
export const listGrantBatches = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ batches: GrantBatchRow[] } | { error: string }> => {
    try {
      await assertAdmin(context);
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data } = await supabaseAdmin
        .from("grant_batches")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(40);
      const list = (data ?? []) as any[];
      const adminIds = [...new Set(list.map((b) => b.created_by).filter(Boolean))] as string[];
      const names = new Map<string, string>();
      if (adminIds.length) {
        const { data: profs } = await supabaseAdmin
          .from("profiles").select("id, email, display_name, first_name, last_name").in("id", adminIds);
        for (const p of profs ?? []) names.set(p.id as string, displayName(p as any) ?? (p.email as string));
      }
      return {
        batches: list.map((b) => ({
          id: b.id, type: b.type, summary: b.summary, reason: b.reason,
          recipient_count: b.recipient_count, granted_count: b.granted_count,
          skipped_count: b.skipped_count, failed_count: b.failed_count,
          status: b.status, created_at: b.created_at, completed_at: b.completed_at,
          admin_name: b.created_by ? names.get(b.created_by) ?? null : null,
        })),
      };
    } catch (e: any) {
      return { error: e?.message ?? "Failed to load grant history" };
    }
  });

/** Individual recipients inside one batch. */
export const getBatchRecipients = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { batchId: string; type: "plugin" | "credit" }) => {
    if (!/^[0-9a-f-]{36}$/i.test(data?.batchId ?? "")) throw new Error("Invalid batchId");
    return data;
  })
  .handler(async ({ data, context }): Promise<{ recipients: BatchRecipient[] } | { error: string }> => {
    try {
      await assertAdmin(context);
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

      const rows: BatchRecipient[] = [];
      if (data.type === "plugin") {
        const { data: grants } = await supabaseAdmin
          .from("plugin_grants")
          .select("id, customer_id, product_id, revoked_at")
          .eq("batch_id", data.batchId)
          .order("granted_at", { ascending: true })
          .limit(1000);
        const list = (grants ?? []) as any[];
        const custIds = [...new Set(list.map((g) => g.customer_id))];
        const prodIds = [...new Set(list.map((g) => g.product_id))];
        const [{ data: profs }, { data: prods }] = await Promise.all([
          custIds.length ? supabaseAdmin.from("profiles").select("id, email, display_name, first_name, last_name").in("id", custIds) : Promise.resolve({ data: [] as any[] }),
          prodIds.length ? supabaseAdmin.from("products").select("id, name").in("id", prodIds) : Promise.resolve({ data: [] as any[] }),
        ]);
        const pMap = new Map((profs ?? []).map((p: any) => [p.id, p]));
        const prMap = new Map((prods ?? []).map((p: any) => [p.id, p.name]));
        for (const g of list) {
          const prof = pMap.get(g.customer_id);
          rows.push({
            id: g.id, customer_id: g.customer_id,
            email: prof?.email ?? null, name: prof ? displayName(prof) : null,
            product_id: g.product_id, product_name: prMap.get(g.product_id) ?? null,
            amount_cents: null, revoked_at: g.revoked_at,
          });
        }
      } else {
        const { data: ledger } = await supabaseAdmin
          .from("store_credit_ledger")
          .select("id, customer_id, amount_cents")
          .eq("batch_id", data.batchId)
          .limit(1000);
        const list = (ledger ?? []) as any[];
        const custIds = [...new Set(list.map((g) => g.customer_id))];
        const { data: profs } = custIds.length
          ? await supabaseAdmin.from("profiles").select("id, email, display_name, first_name, last_name").in("id", custIds)
          : { data: [] as any[] };
        const pMap = new Map((profs ?? []).map((p: any) => [p.id, p]));
        for (const g of list) {
          const prof = pMap.get(g.customer_id);
          rows.push({
            id: g.id, customer_id: g.customer_id,
            email: prof?.email ?? null, name: prof ? displayName(prof) : null,
            product_id: null, product_name: null,
            amount_cents: g.amount_cents, revoked_at: null,
          });
        }
      }
      return { recipients: rows };
    } catch (e: any) {
      return { error: e?.message ?? "Failed to load recipients" };
    }
  });

/** Soft-revoke a single plugin grant. */
export const revokePluginGrant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { grantId: string }) => {
    if (!/^[0-9a-f-]{36}$/i.test(data?.grantId ?? "")) throw new Error("Invalid grantId");
    return data;
  })
  .handler(async ({ data, context }): Promise<{ revoked: number } | { error: string }> => {
    try {
      await assertAdmin(context);
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: rows, error } = await supabaseAdmin
        .from("plugin_grants")
        .update({ revoked_at: new Date().toISOString() })
        .eq("id", data.grantId)
        .is("revoked_at", null)
        .select("id");
      if (error) return { error: error.message };
      return { revoked: (rows ?? []).length };
    } catch (e: any) {
      return { error: e?.message ?? "Revoke failed" };
    }
  });

/** Soft-revoke every active plugin grant in a batch. */
export const revokeGrantBatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { batchId: string }) => {
    if (!/^[0-9a-f-]{36}$/i.test(data?.batchId ?? "")) throw new Error("Invalid batchId");
    return data;
  })
  .handler(async ({ data, context }): Promise<{ revoked: number } | { error: string }> => {
    try {
      await assertAdmin(context);
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: rows, error } = await supabaseAdmin
        .from("plugin_grants")
        .update({ revoked_at: new Date().toISOString() })
        .eq("batch_id", data.batchId)
        .is("revoked_at", null)
        .select("id");
      if (error) return { error: error.message };
      return { revoked: (rows ?? []).length };
    } catch (e: any) {
      return { error: e?.message ?? "Revoke failed" };
    }
  });
