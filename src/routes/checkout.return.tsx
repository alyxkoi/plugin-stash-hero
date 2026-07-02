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
  const { user } = useAuth();
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
    // Logged-in path: use edge fn with auth
    if (user) {
      const { data, error } = await supabase.functions.invoke("r2-download-url", { body: { productId } });
      if (error || !data?.url) { toast.error(data?.error ?? error?.message ?? "Download failed"); return; }
      triggerDownload(data.url, data.filename ?? `${name}.zip`);
      return;
    }
    // Guest path: verify via session_id
    if (!session_id) { toast.error("Missing session id"); return; }
    const res = await guestDownloadUrl({ data: { sessionId: session_id, productId } });
    if (res.error || !res.url) { toast.error(res.error ?? "Download failed"); return; }
    triggerDownload(res.url, res.filename ?? `${name}.zip`);
  }

  function triggerDownload(url: string, filename: string) {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
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

  const isGuest = !order!.user_id;

  return (
    <div className="min-h-screen bg-[var(--bg-base)] pt-14 pb-24 relative overflow-hidden">
      {/* Ambient glow */}
      <div aria-hidden className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 w-[900px] h-[600px] rounded-full blur-3xl opacity-30" style={{ background: "radial-gradient(closest-side, var(--accent-red) 0%, transparent 70%)" }} />

      <div className="max-w-2xl mx-auto px-4 relative">
        <Link to="/shop" className="text-white/50 text-sm hover:text-white">← Back to shop</Link>

        <div className="mt-8 mb-10">
          <div className="text-[11px] font-black tracking-[0.28em] uppercase text-[var(--accent-red-glow)] mb-4 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> Order confirmed
          </div>
          <h1 className="font-display text-5xl md:text-6xl font-black tracking-tight leading-[1.02]">You're loaded up.</h1>
          <p className="mt-4 text-white/60 text-base">
            Order <span className="font-mono text-white/90">{order!.number}</span> — grab your files below. We also emailed the links to{" "}
            <span className="text-white/90">{order!.guest_email ?? "your inbox"}</span>.
          </p>
        </div>

        {/* Items */}
        <div className="space-y-3 mb-8">
          {items.map((it) => (
            <div key={it.id} className="flex gap-4 p-4 rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur items-center">
              <div className="w-16 h-16 rounded-xl shrink-0 overflow-hidden relative border border-white/10" style={{ background: it.cover_gradient ?? "#1F0540" }}>
                {it.cover_url && <img src={it.cover_url} alt={it.name} loading="lazy" className="absolute inset-0 w-full h-full object-cover" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] tracking-[0.22em] uppercase text-white/40 font-bold mb-1">Plugin</div>
                <div className="font-bold truncate text-base">{it.name}</div>
                <div className="font-mono text-xs text-white/50 mt-0.5">${Number(it.price).toFixed(2)}</div>
              </div>
              <button onClick={() => download(it.product_id, it.name)} className="btn-primary !text-xs !py-2.5 !px-4 inline-flex items-center gap-1.5">
                <Download className="w-4 h-4" /> Download
              </button>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-1.5 text-sm mb-8">
          <Row label="Subtotal" value={`$${Number(order!.subtotal).toFixed(2)}`} />
          {Number(order!.discount) > 0 && <Row label={`Discount${order!.discount_code ? ` (${order!.discount_code})` : ""}`} value={`-$${Number(order!.discount).toFixed(2)}`} />}
          <div className="h-px bg-white/10 my-2.5" />
          <div className="flex justify-between items-baseline">
            <span className="text-[11px] tracking-[0.22em] uppercase text-white/50 font-bold">Total paid</span>
            <span className="font-mono text-2xl font-black">${Number(order!.total).toFixed(2)}</span>
          </div>
        </div>

        {/* Guest vs user footer */}
        {isGuest ? (
          <div className="p-5 rounded-2xl border border-[var(--accent-red)]/25 bg-[var(--accent-red)]/[0.06] mb-8">
            <div className="text-sm font-bold mb-1">Want your downloads on tap?</div>
            <p className="text-white/60 text-sm mb-3">
              Create an account with <span className="text-white/90">{order!.guest_email}</span> and this order lands in your library — no re-downloading email links.
            </p>
            <Link to="/signup" search={{ email: order!.guest_email ?? "" } as any} className="btn-primary !text-xs !py-2 !px-4">Create account</Link>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-3">
          {!isGuest && <Link to="/account/orders" className="btn-ghost">View my orders</Link>}
          <Link to="/shop" className="btn-primary">Keep shopping →</Link>
        </div>
      </div>
    </div>
  );
}

function Frame({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-[var(--bg-base)] flex items-center justify-center px-4"><div className="max-w-md text-center">{children}</div></div>;
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return <div className="flex justify-between"><span className="text-white/60">{label}</span><span className={`font-mono ${bold ? "font-black text-lg" : ""}`}>{value}</span></div>;
}
