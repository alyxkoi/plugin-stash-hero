import { useEffect, useState } from "react";
import { DetailDrawer } from "./DetailDrawer";
import { StatusBadge } from "./DashboardShell";
import { StoreCreditPanel } from "./dashboard/StoreCreditPanel";
import { getAdminOrderDetail, type AdminOrderDetail } from "@/lib/orders-admin.functions";
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
                <Row label="Total" value={money(detail.total)} bold />
              </div>
            </div>
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
        </div>
      )}

    </DetailDrawer>
  );
}

/* ============================================================ */
/*  CUSTOMER DRAWER (with nested Order drawer)                   */
/* ============================================================ */
export type CustomerDrawerData = {
  key: string;
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
