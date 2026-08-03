/**
 * THE one shared customer-identity + new/returning calculation.
 *
 * A customer is identified ONLY by normalized email (lower(trim(email))) —
 * never by user_id / order id / session, because most checkouts are guest
 * checkouts with no user_id. Guest and account orders sharing an email are the
 * same person.
 *
 * Classification is computed once, server-side, by the `order_customer_identity`
 * view (see migrations): every order gets an `order_index` within its email,
 * ordered by created_at then id. index 1 = NEW, index >= 2 = RETURNING. ALL
 * orders count — including $0 / freebie / fully-discounted and refunded ones.
 *
 * Every dashboard surface that shows new vs returning must read from here.
 */

import { supabase } from "@/integrations/supabase/client";

export type OrderIdentity = {
  order_id: string;
  normalized_email: string;
  created_at: string;
  order_index: number;
  is_first_order: boolean;
  first_order_at: string;
};

/** order_id → identity classification. */
export type IdentityMap = Map<string, OrderIdentity>;

export async function fetchOrderIdentity(limit = 5000): Promise<IdentityMap> {
  const { data, error } = await supabase
    .from("order_customer_identity")
    .select("order_id, normalized_email, created_at, order_index, is_first_order, first_order_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.warn("[identity] fetch failed", error);
    return new Map();
  }
  const map: IdentityMap = new Map();
  for (const r of (data ?? []) as any[]) {
    if (!r.order_id) continue;
    map.set(r.order_id as string, {
      order_id: r.order_id,
      normalized_email: r.normalized_email,
      created_at: r.created_at,
      order_index: Number(r.order_index),
      is_first_order: !!r.is_first_order,
      first_order_at: r.first_order_at,
    });
  }
  return map;
}

/** Split a set of orders into NEW vs RETURNING order counts. */
export function splitNewReturning(
  orders: { id: string }[],
  identity: IdentityMap,
): { neu: number; returning: number } {
  let neu = 0;
  let returning = 0;
  for (const o of orders) {
    const row = identity.get(o.id);
    if (!row) continue;
    if (row.is_first_order) neu++;
    else returning++;
  }
  return { neu, returning };
}

/** Distinct emails whose FIRST EVER order falls inside [start, end]. */
export function newCustomersBetween(identity: IdentityMap, start: Date, end: Date): number {
  const seen = new Set<string>();
  for (const r of identity.values()) {
    if (!r.is_first_order) continue;
    const t = new Date(r.created_at).getTime();
    if (t >= start.getTime() && t <= end.getTime()) seen.add(r.normalized_email);
  }
  return seen.size;
}
