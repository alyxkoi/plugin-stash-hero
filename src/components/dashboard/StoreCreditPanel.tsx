import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Minus, Loader2 } from "lucide-react";
import { adminGetStoreCredit, adminAdjustStoreCredit, type CreditSnapshot } from "@/lib/store-credit.functions";

function money(cents: number) {
  const v = Math.abs(cents) / 100;
  return `${cents < 0 ? "−" : ""}$${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("en", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

export function StoreCreditPanel({ customerId }: { customerId: string }) {
  const [snap, setSnap] = useState<CreditSnapshot | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [mode, setMode] = useState<null | "add" | "deduct">(null);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setErr(null);
    try {
      const res = await adminGetStoreCredit({ data: { customerId } });
      if ("error" in res) setErr(res.error);
      else setSnap(res);
    } catch (e: any) {
      setErr(e?.message ?? "Failed to load store credit");
    }
  }, [customerId]);

  useEffect(() => { load(); }, [load]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const dollars = Number(amount);
    if (!Number.isFinite(dollars) || dollars <= 0) { toast.error("Enter an amount greater than $0."); return; }
    if (reason.trim().length < 3) { toast.error("A reason is required."); return; }
    setSaving(true);
    try {
      const cents = Math.round(dollars * 100) * (mode === "deduct" ? -1 : 1);
      const res = await adminAdjustStoreCredit({ data: { customerId, amountCents: cents, reason: reason.trim() } });
      if ("error" in res) { toast.error(res.error); return; }
      toast.success(mode === "deduct" ? `Removed ${money(Math.abs(cents))} of credit` : `Granted ${money(cents)} of credit`);
      setAmount(""); setReason(""); setMode(null);
      await load();
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't update store credit");
    } finally {
      setSaving(false);
    }
  }

  const balance = snap?.balance_cents ?? 0;

  return (
    <section>
      <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-[#B8ACCC] mb-2">Store credit</div>

      <div
        className={`rounded-lg border p-4 ${balance > 0 ? "border-[#FF003C]/45 bg-[#FF003C]/[0.06]" : "border-white/10 bg-white/[0.02]"}`}
      >
        <div className="flex items-end justify-between gap-3 flex-wrap">
          <div>
            <div className="text-[9px] font-mono uppercase tracking-wider text-[#B8ACCC] mb-1">Current balance</div>
            <div className="font-display text-3xl md:text-4xl leading-none text-white">
              {snap ? money(balance) : "…"}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { setMode(mode === "add" ? null : "add"); setAmount(""); setReason(""); }}
              className="inline-flex items-center gap-1.5 min-h-[40px] px-3 rounded-lg text-[11px] font-mono uppercase tracking-wider bg-[#FF003C] text-white hover:brightness-110 transition"
            >
              <Plus size={13} /> Add credit
            </button>
            <button
              type="button"
              onClick={() => { setMode(mode === "deduct" ? null : "deduct"); setAmount(""); setReason(""); }}
              className="inline-flex items-center gap-1.5 min-h-[40px] px-3 rounded-lg text-[11px] font-mono uppercase tracking-wider border border-white/20 text-[#C9BEDD] hover:border-white/40 hover:text-white transition"
            >
              <Minus size={13} /> Deduct
            </button>
          </div>
        </div>

        {mode && (
          <form onSubmit={submit} className="mt-4 pt-4 border-t border-white/10 space-y-3">
            <div className="text-[10px] font-mono uppercase tracking-wider text-[#B8ACCC]">
              {mode === "add" ? "Grant store credit" : "Remove store credit"}
            </div>
            <label className="block">
              <span className="block text-[10px] font-mono uppercase tracking-wider text-[#B8ACCC] mb-1">Amount (USD)</span>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#B8ACCC] text-sm">$</span>
                <input
                  type="number" min="0.01" step="0.01" inputMode="decimal" required
                  value={amount} onChange={(e) => setAmount(e.target.value)}
                  placeholder="25.00"
                  className="w-full min-h-[44px] bg-white/5 border border-white/15 rounded-lg pl-7 pr-3 text-sm text-white outline-none focus:border-[#FF003C]"
                />
              </div>
            </label>
            <label className="block">
              <span className="block text-[10px] font-mono uppercase tracking-wider text-[#B8ACCC] mb-1">Reason (required)</span>
              <input
                required minLength={3} maxLength={300}
                value={reason} onChange={(e) => setReason(e.target.value)}
                placeholder="goodwill — support issue"
                className="w-full min-h-[44px] bg-white/5 border border-white/15 rounded-lg px-3 text-sm text-white outline-none focus:border-[#FF003C]"
              />
            </label>
            <div className="flex gap-2">
              <button
                type="submit" disabled={saving}
                className={`flex-1 min-h-[44px] rounded-lg text-[11px] font-mono uppercase tracking-wider transition disabled:opacity-60 ${mode === "add" ? "bg-[#FF003C] text-white" : "border border-[#FF003C]/60 text-[#FF6A88]"}`}
              >
                {saving ? <Loader2 size={14} className="animate-spin inline" /> : mode === "add" ? "Confirm grant" : "Confirm removal"}
              </button>
              <button
                type="button" onClick={() => setMode(null)}
                className="min-h-[44px] px-4 rounded-lg border border-white/20 text-[11px] font-mono uppercase tracking-wider text-[#C9BEDD]"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      {err && <div className="mt-2 text-[11px] font-mono text-[#FF6A88]">{err}</div>}

      <div className="mt-3">
        <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-[#B8ACCC] mb-2">Credit history</div>
        {!snap ? (
          <div className="text-[11px] font-mono text-[#B8ACCC] py-2">Loading…</div>
        ) : snap.entries.length === 0 ? (
          <div className="text-[11px] font-mono text-[#B8ACCC] py-2">No credit activity yet.</div>
        ) : (
          <ul className="space-y-2">
            {snap.entries.map((e) => (
              <li key={e.id} className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#B8ACCC]">{e.type}</span>
                  <span className={`font-mono text-sm ${e.amount_cents < 0 ? "text-[#FF6A88]" : "text-emerald-300"}`}>
                    {e.amount_cents > 0 ? "+" : ""}{money(e.amount_cents)}
                  </span>
                </div>
                {e.reason && <div className="text-xs text-white/80 mt-1">{e.reason}</div>}
                <div className="text-[10px] font-mono text-[#B8ACCC] mt-1">
                  {fmtDate(e.created_at)}
                  {e.created_by_name && <> · by {e.created_by_name}</>}
                  {e.order_number && <> · {e.order_number}</>}
                  <> · bal {money(e.balance_after_cents)}</>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
