/**
 * THE one shared revenue calculation.
 *
 * Every dashboard, analytics card, chart, customer total and campaign stat must
 * derive money from these helpers so numbers can never disagree.
 *
 * Rules:
 *  - An order counts as a sale while its status is `completed` or `partial`
 *    (partial = partially refunded). `refunded` = fully refunded, `pending` =
 *    not paid; neither counts.
 *  - Net revenue = order total − refunded amount. Historical refunds therefore
 *    shrink past periods, which is the intended behaviour.
 *  - Refunds are stored in cents (`refunded_amount_cents`) to avoid float drift.
 */

export type RevenueOrder = {
  total: number | string | null;
  status: string;
  refunded_amount_cents?: number | null;
};

/** Columns any query must select to be able to compute net revenue. */
export const REVENUE_COLUMNS = "total, status, refunded_amount_cents" as const;

export const SALE_STATUSES = ["completed", "partial"] as const;

export function countsAsSale(o: RevenueOrder): boolean {
  return (SALE_STATUSES as readonly string[]).includes(o.status);
}

export function isFullyRefunded(o: RevenueOrder): boolean {
  return o.status === "refunded";
}

export function totalCents(o: RevenueOrder): number {
  return Math.max(0, Math.round(Number(o.total || 0) * 100));
}

export function refundedCents(o: RevenueOrder): number {
  return Math.min(totalCents(o), Math.max(0, Number(o.refunded_amount_cents || 0)));
}

/** Net money kept for this order, in cents. 0 for anything that isn't a sale. */
export function netCents(o: RevenueOrder): number {
  if (!countsAsSale(o)) return 0;
  return Math.max(0, totalCents(o) - refundedCents(o));
}

/** Net money kept for this order, in dollars. */
export function netRevenue(o: RevenueOrder): number {
  return netCents(o) / 100;
}

/** Sum of net revenue across orders, in dollars. */
export function sumNetRevenue(orders: RevenueOrder[]): number {
  return orders.reduce((s, o) => s + netCents(o), 0) / 100;
}

/** Orders that count as sales (excludes pending and fully refunded). */
export function saleOrders<T extends RevenueOrder>(orders: T[]): T[] {
  return orders.filter(countsAsSale);
}

/**
 * Fraction of the order still kept (1 = untouched, 0 = fully refunded).
 * Used to pro-rate per-line-item revenue on partially refunded orders.
 */
export function keptRatio(o: RevenueOrder): number {
  const t = totalCents(o);
  if (!countsAsSale(o) || t === 0) return countsAsSale(o) ? 1 : 0;
  return netCents(o) / t;
}

/**
 * Allocate an order's net dollar revenue across its line items by their stored
 * price weights. The weights may be dollars or cents; only their proportion is
 * used, which prevents a cents field from being displayed as dollar revenue.
 */
export function allocateLineRevenue(
  o: RevenueOrder,
  items: { price: number | string | null }[],
): number[] {
  if (items.length === 0) return [];
  const revenue = netRevenue(o);
  const weights = items.map((item) => Math.max(0, Number(item.price || 0)));
  const weightTotal = weights.reduce((sum, value) => sum + value, 0);
  if (weightTotal <= 0) return items.map(() => revenue / items.length);
  return weights.map((weight) => revenue * (weight / weightTotal));
}

export function formatMoney(n: number, opts?: { decimals?: boolean }) {
  const d = opts?.decimals ? 2 : 0;
  return `$${Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d })}`;
}
