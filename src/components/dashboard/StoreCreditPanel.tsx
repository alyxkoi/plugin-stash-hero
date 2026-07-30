import { useCallback, useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Gift } from "lucide-react";
import { adminGetStoreCredit, type CreditSnapshot } from "@/lib/store-credit.functions";

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
          <Link
            to="/dashboard/perks"
            search={{ customer: customerId }}
            className="inline-flex items-center gap-2 min-h-[40px] px-4 rounded-lg bg-white text-black font-mono text-[10px] uppercase tracking-[0.14em] font-bold transition hover:bg-white/85 active:bg-white/70"
          >
            <Gift size={13} /> Manage in Perks →
          </Link>
        </div>
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
