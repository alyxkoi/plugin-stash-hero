import { useEffect, useState } from "react";
import { DetailDrawer } from "./DetailDrawer";
import { StatusBadge } from "./DashboardShell";
import { StoreCreditPanel } from "./dashboard/StoreCreditPanel";
import { getAdminOrderDetail, setOrderRefund, type AdminOrderDetail } from "@/lib/orders-admin.functions";
import { toast } from "sonner";
import { Mail, Phone, CreditCard, ExternalLink } from "lucide-react";


function money(n: number) {
  return `$${Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("en", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

/* ============================================================ */
/*  ORDER DRAWER                                                 */
/* ============================================================ */
export function OrderDrawer({
  orderId, open, onClose, onBack,
}: {
  orderId: string | null;
  open: boolean;
  onClose: () => void;
  onBack?: () => void;
}) {
  const [detail, setDetail] = useState<AdminOrderDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !orderId) return;
    setDetail(null); setError(null); setLoading(true);
    let cancelled = false;
    (async () => {
      try {
        const res = await getAdminOrderDetail({ data: { orderId } });
        if (cancelled) return;
        if ("error" in res) setError(res.error);
        else setDetail(res);
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Failed to load order");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [orderId, open]);

  const custName = detail
    ? [detail.customer.firstName, detail.customer.lastName].filter(Boolean).join(" ") || (detail.customer.email ?? "Guest")
    : "";

  return (
    <DetailDrawer
      open={open}
      onClose={onClose}
      onBack={onBack}
      eyebrow="Order"
      title={detail ? detail.number : loading ? "Loading…" : "Order"}
    >
      {loading && (
        <div className="py-16 text-center text-xs text-[#B8ACCC] font-mono">Loading order…</div>
      )}
      {error && !loading && (
        <div className="py-8 text-center text-xs text-[var(--accent-red-glow)] font-mono">{error}</div>
      )}
      {detail && (
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-3">
            <StatusBadge status={detail.status} />
            <div className="text-[10px] font-mono text-[#B8ACCC]">{fmtDate(detail.created_at)}</div>
          </div>

          {/* Customer */}
          <section>
            <SectionLabel>Customer</SectionLabel>
            <div className="rounded-lg border border-white/10 bg-white/[0.02] p-4 space-y-2">
              <div className="text-sm text-white font-medium">{custName || "—"}</div>
              <InfoRow icon={<Mail size={13} />} value={detail.customer.email} href={detail.customer.email ? `mailto:${detail.customer.email}` : undefined} />
              <InfoRow icon={<Phone size={13} />} value={detail.customer.phone} href={detail.customer.phone ? `tel:${detail.customer.phone}` : undefined} />
              <InfoRow
                icon={<CreditCard size={13} />}
                value={detail.payment?.method ?? null}
                placeholder="Payment method unavailable"
              />
            </div>
          </section>

          {/* Items */}
          <section>
            <SectionLabel>Plugins purchased</SectionLabel>
            <ul className="space-y-2">
              {detail.items.map((it) => (
                <li key={it.id} className="flex items-center gap-3 p-2 rounded-lg border border-white/10 bg-white/[0.02]">
                  <div
                    className="w-10 h-10 rounded-md shrink-0 bg-cover bg-center"
                    style={{
                      background: it.cover_url ? `url(${it.cover_url}) center/cover` : (it.cover_gradient || "linear-gradient(135deg,#FF003C,#0E0BD1)"),
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white truncate">{it.name}</div>
                  </div>
                  <div className="font-mono text-xs text-white/80 shrink-0">{money(it.price)}</div>
                </li>
              ))}
              {detail.items.length === 0 && (
                <li className="text-xs text-[#B8ACCC] font-mono py-3">No items on this order.</li>
              )}
            </ul>
          </section>

          {/* Totals */}
          <section>
            <SectionLabel>Totals</SectionLabel>
            <div className="rounded-lg border border-white/10 bg-white/[0.02] p-4 font-mono text-xs space-y-1">
              <Row label="Subtotal" value={money(detail.subtotal)} />
              {detail.discount > 0 && (
                <Row label={`Discount${detail.discount_code ? ` · ${detail.discount_code}` : ""}`} value={`−${money(detail.discount)}`} accent />
              )}
              {detail.credit_applied > 0 && (
                <Row label="Store credit" value={`−${money(detail.credit_applied)}`} accent />
              )}
              <div className="border-t border-white/10 mt-2 pt-2">
                <Row label="Charged" value={money(detail.total)} bold={detail.refunded === 0} />
              </div>
              {detail.refunded > 0 && (
                <>
                  <Row label="Refunded" value={`−${money(detail.refunded)}`} accent />
                  <div className="border-t border-white/10 mt-2 pt-2">
                    <Row label="Net revenue" value={money(detail.net_total)} bold />
                  </div>
                </>
              )}
            </div>
            {detail.refunded > 0 && (
              <div className="mt-2 text-[10px] font-mono text-[#B8ACCC]">
                {detail.net_total === 0 ? "Fully refunded" : "Partially refunded"}
                {detail.refunded_at ? ` · ${fmtDate(detail.refunded_at)}` : ""}
                {detail.refund_note ? ` · ${detail.refund_note}` : ""}
              </div>
            )}
            {detail.credit_applied > 0 && detail.status === "refunded" && (
              <div className="mt-2 rounded-lg border border-white/15 bg-white/[0.03] p-3 text-[11px] text-[#C9BEDD]">
                This order used {money(detail.credit_applied)} in store credit. Refunding in Stripe does not restore it —
                re-grant it manually from the customer drawer if appropriate.
              </div>
            )}
          </section>

          {/* Refund → Stripe (hidden on $0 orders and orders with no payment) */}
          {detail.stripe_payment_intent_id && detail.total > 0 && (
            <a
              href={`https://dashboard.stripe.com/${detail.stripe_mode === "test" ? "test/" : ""}payments/${detail.stripe_payment_intent_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full min-h-[48px] rounded-lg border border-white/20 text-[11px] font-mono uppercase tracking-wider text-[#C9BEDD] hover:border-[var(--accent-red)]/60 hover:text-white transition"
            >
              Refund order in Stripe <ExternalLink size={13} />
            </a>
          )}

          <ManualRefund
            detail={detail}
            onDone={(patch: Partial<AdminOrderDetail>) => setDetail((d) => (d ? { ...d, ...patch } : d))}
          />

        </div>
      )}

    </DetailDrawer>
  );
}

/* ============================================================ */
/*  MANUAL REFUND OVERRIDE                                       */
/* ============================================================ */
/**
 * Stripe-charged orders are updated automatically by the `charge.refunded`
 * webhook. This is the override for orders that never went through Stripe
 * (free / store-credit-only / off-platform) or to correct a mismatch. It writes
 * through the same routine, so both paths land on the same numbers.
 */
function ManualRefund({
  detail, onDone,
}: {
  detail: AdminOrderDetail;
  onDone: (patch: Partial<AdminOrderDetail>) => void;
}) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(() => (detail.refunded > 0 ? detail.refunded.toFixed(2) : detail.total.toFixed(2)));
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (value: number) => {
    setSaving(true);
    try {
      const res = await setOrderRefund({ data: { orderId: detail.id, refundedAmount: value, note: note.trim() || null } });
      if ("error" in res) { toast.error(res.error); return; }
      onDone({
        status: res.status,
        refunded: res.refunded,
        net_total: res.net_total,
        refunded_at: res.refunded > 0 ? new Date().toISOString() : null,
        refund_note: note.trim() || detail.refund_note,
      });
      toast.success(res.refunded === 0 ? "Refund cleared" : `Recorded ${money(res.refunded)} refunded`);
      setOpen(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Could not record refund");
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full min-h-[44px] rounded-lg border border-dashed border-white/15 text-[10px] font-mono uppercase tracking-[0.16em] text-[#B8ACCC] hover:border-white/35 hover:text-white transition"
      >
        {detail.refunded > 0 ? "Adjust recorded refund" : "Record refund manually"}
      </button>
    );
  }

  return (
    <section className="rounded-lg border border-[var(--accent-red)]/35 bg-[var(--accent-red)]/[0.05] p-4 space-y-3">
      <SectionLabel>Record refund</SectionLabel>
      <p className="text-[11px] text-[#C9BEDD] leading-relaxed">
        Enter the <strong className="text-white">total</strong> amount refunded on this order (max {money(detail.total)}).
        Stripe refunds sync here on their own — use this only for orders that never went through Stripe, or to correct a mismatch.
      </p>
      <div className="flex gap-2">
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
          inputMode="decimal"
          className="w-28 bg-white/5 border border-white/15 rounded-lg px-3 py-2 font-mono text-xs text-white outline-none focus:border-[var(--accent-red)]"
        />
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Reason (optional)"
          className="flex-1 min-w-0 bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-[var(--accent-red)]"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          disabled={saving}
          onClick={() => submit(Math.min(Number(amount) || 0, detail.total))}
          className="min-h-[40px] px-4 rounded-lg bg-[var(--accent-red)] text-[10px] font-mono uppercase tracking-[0.16em] text-white disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save refund"}
        </button>
        {detail.refunded > 0 && (
          <button
            disabled={saving}
            onClick={() => submit(0)}
            className="min-h-[40px] px-4 rounded-lg border border-white/20 text-[10px] font-mono uppercase tracking-[0.16em] text-[#C9BEDD] hover:text-white disabled:opacity-50"
          >
            Clear refund
          </button>
        )}
        <button
          onClick={() => setOpen(false)}
          className="min-h-[40px] px-4 rounded-lg text-[10px] font-mono uppercase tracking-[0.16em] text-white/50 hover:text-white"
        >
          Cancel
        </button>
      </div>
    </section>
  );
}

/* ============================================================ */
/*  CUSTOMER DRAWER (with nested Order drawer)                   */
/* ============================================================ */
export type CustomerDrawerData = {
  key: string;
  /** auth user id — required for store credit (account holders only) */
  userId?: string | null;
  name: string | null;
  email: string;
  phone?: string | null;
  hasAccount: boolean;
  memberSince: string;
  totalSpent: number;
  completedCount: number;
  ordersCount: number;
  orders: { id: string; number: string; total: number; status: string; created_at: string }[];
};


export function CustomerDrawer({
  customer, open, onClose,
}: {
  customer: CustomerDrawerData | null;
  open: boolean;
  onClose: () => void;
}) {
  const [openOrderId, setOpenOrderId] = useState<string | null>(null);
  const aov = customer && customer.completedCount > 0 ? customer.totalSpent / customer.completedCount : 0;

  return (
    <>
      <DetailDrawer
        open={open && !openOrderId}
        onClose={onClose}
        eyebrow="Customer"
        title={customer?.name || customer?.email || "Customer"}
      >
        {customer && (
          <div className="space-y-6">
            {/* Contact */}
            <section>
              <SectionLabel>General info</SectionLabel>
              <div className="rounded-lg border border-white/10 bg-white/[0.02] p-4 space-y-2">
                <InfoRow icon={<Mail size={13} />} value={customer.email} href={`mailto:${customer.email}`} />
                <InfoRow icon={<Phone size={13} />} value={customer.phone ?? null} href={customer.phone ? `tel:${customer.phone}` : undefined} placeholder="No phone on file" />
                <div className="text-[10px] font-mono text-[#B8ACCC] pt-1">
                  Member since {new Date(customer.memberSince).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" })}
                </div>
              </div>
            </section>

            {/* Lifetime */}
            <section>
              <SectionLabel>Lifetime totals</SectionLabel>
              <div className="grid grid-cols-3 gap-2">
                <MiniStat label="Spent" value={money(customer.totalSpent)} />
                <MiniStat label="Orders" value={String(customer.completedCount)} />
                <MiniStat label="AOV" value={money(aov)} />
              </div>
            </section>

            {/* Store credit */}
            {customer.userId ? (
              <StoreCreditPanel customerId={customer.userId} />
            ) : (
              <section>
                <SectionLabel>Store credit</SectionLabel>
                <div className="rounded-lg border border-white/10 bg-white/[0.02] p-4 text-[11px] font-mono text-[#B8ACCC]">
                  Guest checkout — store credit requires an account.
                </div>
              </section>
            )}



            {/* Recent orders */}
            <section>
              <SectionLabel>Recent orders</SectionLabel>
              {customer.orders.length === 0 ? (
                <div className="text-xs text-[#B8ACCC] py-2 font-mono">No orders yet.</div>
              ) : (
                <ul className="space-y-2">
                  {customer.orders.slice(0, 8).map(o => (
                    <li key={o.id}>
                      <button
                        onClick={() => setOpenOrderId(o.id)}
                        className="w-full text-left p-3 rounded-lg border border-white/10 bg-white/[0.02] hover:border-[var(--accent-red)]/50 hover:bg-white/[0.04] transition"
                      >
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="font-mono text-xs text-white">{o.number}</span>
                          <div className="flex items-center gap-2">
                            <StatusBadge status={o.status} />
                            <span className="font-mono text-xs text-white">{money(Number(o.total))}</span>
                          </div>
                        </div>
                        <div className="text-[10px] font-mono text-[#B8ACCC]">{fmtDate(o.created_at)}</div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </DetailDrawer>

      <OrderDrawer
        open={!!openOrderId}
        orderId={openOrderId}
        onClose={() => { setOpenOrderId(null); onClose(); }}
        onBack={() => setOpenOrderId(null)}
      />
    </>
  );
}

/* ============================================================ */
/*  helpers                                                      */
/* ============================================================ */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-[#B8ACCC] mb-2">
      {children}
    </div>
  );
}
function InfoRow({ icon, value, href, placeholder = "—" }: { icon: React.ReactNode; value: string | null; href?: string; placeholder?: string }) {
  const empty = !value;
  const inner = (
    <span className={`text-sm truncate ${empty ? "text-white/40 italic" : "text-white hover:text-[var(--accent-red-glow)]"}`}>
      {value ?? placeholder}
    </span>
  );
  return (
    <div className="flex items-center gap-2 min-w-0">
      <span className="text-[#B8ACCC] shrink-0">{icon}</span>
      {href && !empty ? <a href={href} className="min-w-0 flex-1 truncate">{inner}</a> : <span className="min-w-0 flex-1">{inner}</span>}
    </div>
  );
}
function Row({ label, value, bold, accent }: { label: string; value: string; bold?: boolean; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className={accent ? "text-[var(--accent-red-glow)]" : "text-white/60"}>{label}</span>
      <span className={`${bold ? "text-white text-base" : accent ? "text-[var(--accent-red-glow)]" : "text-white"}`}>{value}</span>
    </div>
  );
}
function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
      <div className="text-[9px] font-mono uppercase tracking-wider text-[#B8ACCC] mb-1">{label}</div>
      <div className="font-mono text-sm text-white truncate">{value}</div>
    </div>
  );
}
