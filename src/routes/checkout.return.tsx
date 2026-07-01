import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, Download } from "lucide-react";
import { getOrderBySession, guestDownloadUrl } from "@/lib/checkout.functions";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { actions } from "@/lib/store";

export const Route = createFileRoute("/checkout/return")({
  validateSearch: (s: Record<string, unknown>): { session_id?: string } => ({
    session_id: typeof s.session_id === "string" ? s.session_id : undefined,
  }),
  head: () => ({ meta: [{ title: "Order confirmed — Plugin Warehouse" }] }),
  component: CheckoutReturn,
});

type OrderView = {
  id: string; number: string; subtotal: number; discount: number; total: number;
  discount_code: string | null; created_at: string; user_id: string | null; guest_email: string | null;
};
type ItemView = {
  id: string; product_id: string | null; product_slug: string | null; name: string; price: number; cover_gradient: string | null; cover_url: string | null;
};

function CheckoutReturn() {
  const { session_id } = Route.useSearch();
  const [order, setOrder] = useState<OrderView | null>(null);
  const [items, setItems] = useState<ItemView[]>([]);
  const [status, setStatus] = useState<"loading" | "ok" | "missing" | "invalid">("loading");

  // Clear the local cart on landing here — webhook has also cleared server cart
  useEffect(() => { actions.clearCart(); }, []);

  useEffect(() => {
    if (!session_id) { setStatus("invalid"); return; }
    let cancelled = false;
    let attempts = 0;

    const poll = async () => {
      attempts += 1;
      try {
        const res = await getOrderBySession({ data: { sessionId: session_id } });
        if (cancelled) return;
        if (res.order) {
          setOrder(res.order as OrderView);
          setItems(res.items as ItemView[]);
          setStatus("ok");
          return;
        }
      } catch { /* retry */ }
      if (attempts < 20) setTimeout(poll, 1500);
      else if (!cancelled) setStatus("missing");
    };
    poll();
    return () => { cancelled = true; };
  }, [session_id]);

  async function download(productId: string | null, name: string) {
    if (!productId) { toast.error("Missing product id"); return; }
    const { data, error } = await supabase.functions.invoke("r2-download-url", { body: { productId } });
    if (error || !data?.url) { toast.error(data?.error ?? error?.message ?? "Download failed"); return; }
    const a = document.createElement("a");
    a.href = data.url;
    a.download = data.filename ?? `${name}.zip`;
    document.body.appendChild(a); a.click(); a.remove();
  }

  if (status === "invalid") {
    return <Frame><h1 className="text-3xl font-display mb-3">Missing session</h1><Link to="/shop" className="btn-ghost">Back to shop</Link></Frame>;
  }
  if (status === "loading") {
    return <Frame><h1 className="text-3xl font-display mb-3">Confirming your payment…</h1><p className="text-white/60">This usually takes a second or two.</p></Frame>;
  }
  if (status === "missing") {
    return <Frame>
      <h1 className="text-3xl font-display mb-3">Still confirming…</h1>
      <p className="text-white/60 mb-6">Your payment went through but we haven't received the confirmation yet. Refresh in a minute or check your account.</p>
      <Link to="/account/orders" className="btn-ghost">Go to my orders</Link>
    </Frame>;
  }

  return (
    <div className="min-h-screen bg-[var(--bg,#0b0316)] pt-16 pb-24">
      <div className="max-w-2xl mx-auto px-4">
        <div className="flex items-center gap-3 mb-6">
          <CheckCircle2 className="w-8 h-8 text-emerald-400" />
          <h1 className="font-display text-4xl">Order confirmed</h1>
        </div>
        <p className="text-white/60 mb-8">Order <span className="font-mono">{order!.number}</span> — download your files below. A copy will always live in your account.</p>

        <div className="space-y-3 mb-8">
          {items.map((it) => (
            <div key={it.id} className="flex gap-3 p-3 rounded-xl border border-white/10 bg-white/[0.03] items-center">
              <div className="w-14 h-14 rounded-lg shrink-0" style={{ background: it.cover_gradient ?? "#333" }} />
              <div className="flex-1 min-w-0">
                <div className="font-bold truncate">{it.name}</div>
                <div className="font-mono text-xs text-white/40">${Number(it.price).toFixed(2)}</div>
              </div>
              <button onClick={() => download(it.product_id, it.name)} className="btn-primary !text-xs !py-2 !px-4 inline-flex items-center gap-1.5">
                <Download className="w-4 h-4" /> Download
              </button>
            </div>
          ))}
        </div>

        <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-1 text-sm mb-8">
          <Row label="Subtotal" value={`$${Number(order!.subtotal).toFixed(2)}`} />
          {Number(order!.discount) > 0 && <Row label={`Discount${order!.discount_code ? ` (${order!.discount_code})` : ""}`} value={`-$${Number(order!.discount).toFixed(2)}`} />}
          <div className="h-px bg-white/10 my-2" />
          <Row label="Total" value={`$${Number(order!.total).toFixed(2)}`} bold />
        </div>

        <div className="flex gap-3">
          <Link to="/account/orders" className="btn-ghost">View my orders</Link>
          <Link to="/shop" className="btn-primary">Keep shopping →</Link>
        </div>
      </div>
    </div>
  );
}

function Frame({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-[var(--bg,#0b0316)] flex items-center justify-center px-4"><div className="max-w-md text-center">{children}</div></div>;
}
function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return <div className="flex justify-between"><span className="text-white/60">{label}</span><span className={`font-mono ${bold ? "font-black text-lg" : ""}`}>{value}</span></div>;
}
