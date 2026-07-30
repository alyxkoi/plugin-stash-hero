import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Gift, Search, X, Loader2, Wallet, Package, ChevronDown, Undo2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { DashCard } from "@/components/DashboardShell";
import {
  perksBootstrap, runGrantBatch, listGrantBatches, getBatchRecipients,
  revokePluginGrant, revokeGrantBatch,
  type PerkProduct, type PerkAccount, type GrantBatchRow, type BatchRecipient,
} from "@/lib/perks.functions";

export const Route = createFileRoute("/dashboard/perks")({
  validateSearch: (s: Record<string, unknown>): { customer?: string } => ({
    customer: typeof s.customer === "string" ? s.customer : undefined,
  }),
  head: () => ({ meta: [{ title: "Perks — Plugin Warehouse Admin" }] }),
  component: PerksPage,
});

const WHITE_BTN =
  "inline-flex items-center justify-center gap-2 min-h-[44px] px-5 rounded-lg bg-white text-black font-mono text-[11px] uppercase tracking-[0.14em] font-bold transition hover:bg-white/85 active:bg-white/70 active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white";
const QUIET_RED =
  "inline-flex items-center gap-1.5 min-h-[36px] px-3 rounded-lg border border-[#FF003C]/50 text-[#FF6A88] font-mono text-[10px] uppercase tracking-wider transition hover:border-[#FF003C] hover:text-white";
const INPUT =
  "w-full min-h-[44px] bg-white/5 border border-white/15 rounded-lg px-3 text-sm text-white placeholder:text-white/35 outline-none focus:border-[#FF003C]";

function money(cents: number) {
  return `$${(Math.abs(cents) / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function PerksPage() {
  const { customer } = Route.useSearch();
  const navigate = useNavigate();

  const [products, setProducts] = useState<PerkProduct[]>([]);
  const [accounts, setAccounts] = useState<PerkAccount[]>([]);
  const [loading, setLoading] = useState(true);

  const [kind, setKind] = useState<"plugin" | "credit">("plugin");
  const [pickedProducts, setPickedProducts] = useState<string[]>([]);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [allAccounts, setAllAccounts] = useState(false);
  const [pickedCustomers, setPickedCustomers] = useState<string[]>(customer ? [customer] : []);
  const [review, setReview] = useState(false);
  const [typed, setTyped] = useState("");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<{ granted: number; skipped: number; failed: number } | null>(null);

  const [batches, setBatches] = useState<GrantBatchRow[]>([]);

  const loadBatches = useCallback(async () => {
    const res = await listGrantBatches();
    if (!("error" in res)) setBatches(res.batches);
  }, []);

  useEffect(() => {
    (async () => {
      const res = await perksBootstrap();
      if ("error" in res) toast.error(res.error);
      else { setProducts(res.products); setAccounts(res.accounts); }
      await loadBatches();
      setLoading(false);
    })();
  }, [loadBatches]);

  // Keep a pre-selected customer from the Customers drawer deep-link.
  useEffect(() => {
    if (customer) setPickedCustomers((prev) => (prev.includes(customer) ? prev : [...prev, customer]));
  }, [customer]);

  const productMap = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const accountMap = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);

  const recipientCount = allAccounts ? accounts.length : pickedCustomers.length;
  const amountCents = Math.round(Number(amount || 0) * 100);
  const paidSelected = pickedProducts.some((id) => {
    const p = productMap.get(id);
    return p && !p.is_free && p.price > 0;
  });

  const canReview =
    reason.trim().length >= 3 &&
    recipientCount > 0 &&
    (kind === "plugin" ? pickedProducts.length > 0 : amountCents > 0);

  const needsTyped = allAccounts;
  const typedOk = !needsTyped || typed.trim().toUpperCase() === "GRANT" || typed.trim() === String(recipientCount);

  function resetForm() {
    setReview(false); setTyped(""); setPickedProducts([]); setAmount("");
    setReason(""); setAllAccounts(false); setPickedCustomers([]);
  }

  async function execute() {
    setRunning(true);
    setResult(null);
    try {
      const res = await runGrantBatch({
        data: {
          kind,
          productIds: kind === "plugin" ? pickedProducts : undefined,
          amountCents: kind === "credit" ? amountCents : undefined,
          allAccounts,
          customerIds: allAccounts ? [] : pickedCustomers,
          reason: reason.trim(),
        },
      });
      if ("error" in res) { toast.error(res.error); return; }
      setResult({ granted: res.granted, skipped: res.skipped, failed: res.failed });
      toast.success(`${res.granted.toLocaleString()} granted · ${res.skipped} skipped · ${res.failed} failed`);
      resetForm();
      await loadBatches();
    } catch (e: any) {
      toast.error(e?.message ?? "Grant failed");
    } finally {
      setRunning(false);
    }
  }

  if (loading) {
    return <div className="font-mono text-xs text-white/50 py-10">Loading perks…</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <span className="mt-1 w-9 h-9 shrink-0 rounded-lg bg-white/10 flex items-center justify-center">
          <Gift size={18} className="text-white" />
        </span>
        <div>
          <h2 className="font-display text-xl md:text-2xl tracking-wide">GIVE SOMETHING AWAY</h2>
          <p className="text-[12px] text-[#B8ACCC] mt-1 max-w-[60ch]">
            Grants are silent — no emails, no notifications. Plugins land in the customer's library, credit lands on their balance.
          </p>
        </div>
      </div>

      {result && (
        <div className="glass-card p-4">
          <div className="chromatic-edge" />
          <div className="relative z-10 font-mono text-[12px] text-white">
            {result.granted.toLocaleString()} granted
            <span className="text-white/30 mx-2">·</span>
            <span className="text-[#B8ACCC]">{result.skipped.toLocaleString()} skipped (already owned)</span>
            <span className="text-white/30 mx-2">·</span>
            <span className={result.failed ? "text-[#FF6A88]" : "text-[#B8ACCC]"}>{result.failed} failed</span>
          </div>
        </div>
      )}

      {!review ? (
        <DashCard>
          {/* what */}
          <div className="flex gap-2 mb-5">
            {(["plugin", "credit"] as const).map((k) => (
              <button
                key={k}
                onClick={() => setKind(k)}
                className={`min-h-[40px] px-4 rounded-lg font-mono text-[11px] uppercase tracking-wider transition inline-flex items-center gap-2 ${
                  kind === k ? "bg-white text-black font-bold" : "border border-white/15 text-[#C9BEDD] hover:text-white hover:border-white/30"
                }`}
              >
                {k === "plugin" ? <Package size={13} /> : <Wallet size={13} />}
                {k === "plugin" ? "Grant plugins" : "Grant store credit"}
              </button>
            ))}
          </div>

          {kind === "plugin" ? (
            <ProductPicker products={products} picked={pickedProducts} setPicked={setPickedProducts} />
          ) : (
            <label className="block max-w-[260px]">
              <span className="block text-[10px] font-mono uppercase tracking-wider text-[#B8ACCC] mb-1">Amount (USD)</span>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#B8ACCC] text-sm">$</span>
                <input
                  type="number" min="0.01" step="0.01" inputMode="decimal"
                  value={amount} onChange={(e) => setAmount(e.target.value)}
                  placeholder="25.00" className={`${INPUT} !pl-7`}
                />
              </div>
            </label>
          )}

          <div className="h-px bg-white/10 my-6" />

          <RecipientPicker
            accounts={accounts}
            picked={pickedCustomers}
            setPicked={setPickedCustomers}
            all={allAccounts}
            setAll={setAllAccounts}
          />

          <div className="h-px bg-white/10 my-6" />

          <label className="block">
            <span className="block text-[10px] font-mono uppercase tracking-wider text-[#B8ACCC] mb-1">Reason (required — stored for audit)</span>
            <input
              value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300}
              placeholder="holiday gift for everyone" className={INPUT}
            />
          </label>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button disabled={!canReview} onClick={() => { setTyped(""); setReview(true); }} className={WHITE_BTN}>
              Review grant
            </button>
            <span className="font-mono text-[11px] text-[#B8ACCC]">
              {recipientCount.toLocaleString()} recipient{recipientCount !== 1 ? "s" : ""}
            </span>
          </div>
        </DashCard>
      ) : (
        <DashCard title="REVIEW & CONFIRM">
          <div className="space-y-4">
            <div className="rounded-lg border border-white/12 bg-white/[0.02] p-4 space-y-3">
              <Row label="Granting">
                {kind === "credit"
                  ? `${money(amountCents)} store credit`
                  : pickedProducts.map((id) => productMap.get(id)?.name).filter(Boolean).join(", ")}
              </Row>
              <Row label="Recipients">
                <span className="font-display text-3xl md:text-4xl text-white leading-none">
                  {recipientCount.toLocaleString()}
                </span>{" "}
                <span className="text-[#B8ACCC] text-xs font-mono">
                  {allAccounts ? "ALL REGISTERED ACCOUNTS" : "SELECTED CUSTOMERS"}
                </span>
              </Row>
              <Row label="Reason">{reason.trim()}</Row>
              {kind === "credit" && (
                <Row label="Total credit issued">{money(amountCents * recipientCount)}</Row>
              )}
            </div>

            {allAccounts && kind === "plugin" && paidSelected && (
              <div className="flex gap-3 rounded-lg border border-[#FF003C]/50 bg-[#FF003C]/[0.07] p-4">
                <AlertTriangle size={18} className="text-[#FF6A88] shrink-0 mt-0.5" />
                <div className="text-[12px] text-white/90">
                  You are giving a <strong>paid</strong> plugin to every registered account. They keep permanent
                  download access unless the grant is revoked.
                </div>
              </div>
            )}

            {needsTyped && (
              <label className="block max-w-[320px]">
                <span className="block text-[10px] font-mono uppercase tracking-wider text-[#B8ACCC] mb-1">
                  Type <strong className="text-white">GRANT</strong> or <strong className="text-white">{recipientCount}</strong> to enable
                </span>
                <input value={typed} onChange={(e) => setTyped(e.target.value)} className={INPUT} placeholder="GRANT" />
              </label>
            )}

            <div className="flex flex-wrap gap-3">
              <button disabled={!typedOk || running} onClick={execute} className={WHITE_BTN}>
                {running ? <><Loader2 size={14} className="animate-spin" /> Granting…</> : "Confirm grant"}
              </button>
              <button
                onClick={() => setReview(false)} disabled={running}
                className="min-h-[44px] px-4 rounded-lg border border-white/20 text-[11px] font-mono uppercase tracking-wider text-[#C9BEDD] hover:text-white hover:border-white/40 transition disabled:opacity-50"
              >
                Back
              </button>
            </div>
            {running && (
              <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full w-1/3 bg-white/70 animate-[perks-progress_1.1s_ease-in-out_infinite]" />
              </div>
            )}
          </div>
        </DashCard>
      )}

      <DashCard title="GRANT HISTORY">
        {batches.length === 0 ? (
          <div className="font-mono text-[11px] text-[#B8ACCC]">No grants yet.</div>
        ) : (
          <ul className="space-y-2">
            {batches.map((b) => (
              <BatchRow key={b.id} batch={b} onChanged={loadBatches} />
            ))}
          </ul>
        )}
      </DashCard>

      <button
        onClick={() => navigate({ to: "/dashboard/customers" as any })}
        className="font-mono text-[11px] uppercase tracking-wider text-[#B8ACCC] hover:text-white transition"
      >
        ← Back to customers
      </button>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[9px] font-mono uppercase tracking-[0.18em] text-[#B8ACCC] mb-1">{label}</div>
      <div className="text-sm text-white">{children}</div>
    </div>
  );
}

function ProductPicker({
  products, picked, setPicked,
}: { products: PerkProduct[]; picked: string[]; setPicked: (v: string[]) => void }) {
  const [q, setQ] = useState("");
  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    const pool = term ? products.filter((p) => p.name.toLowerCase().includes(term)) : products;
    return pool.slice(0, 24);
  }, [q, products]);

  return (
    <div>
      <div className="text-[10px] font-mono uppercase tracking-wider text-[#B8ACCC] mb-2">Plugins</div>
      {picked.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {picked.map((id) => {
            const p = products.find((x) => x.id === id);
            return (
              <span key={id} className="inline-flex items-center gap-2 pl-1.5 pr-2 py-1 rounded-full border border-white/20 bg-white/[0.06]">
                <span
                  className="w-5 h-5 rounded-full bg-cover bg-center shrink-0"
                  style={{ background: p?.cover_url ? `url(${p.cover_url}) center/cover` : p?.cover_gradient ?? "#190737" }}
                />
                <span className="text-[11px] text-white max-w-[160px] truncate">{p?.name ?? id}</span>
                <button onClick={() => setPicked(picked.filter((x) => x !== id))} className="text-white/50 hover:text-white">
                  <X size={12} />
                </button>
              </span>
            );
          })}
        </div>
      )}
      <div className="relative mb-3">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search plugins…" className={`${INPUT} !pl-9`} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2 max-h-[280px] overflow-y-auto pr-1">
        {list.map((p) => {
          const on = picked.includes(p.id);
          return (
            <button
              key={p.id}
              onClick={() => setPicked(on ? picked.filter((x) => x !== p.id) : [...picked, p.id])}
              className={`flex items-center gap-3 p-2 rounded-lg border text-left transition ${
                on ? "border-white/70 bg-white/[0.10]" : "border-white/10 bg-white/[0.02] hover:border-white/30"
              }`}
            >
              <span
                className="w-9 h-9 rounded-md shrink-0"
                style={{ background: p.cover_url ? `url(${p.cover_url}) center/cover` : p.cover_gradient ?? "#190737" }}
              />
              <span className="min-w-0">
                <span className="block text-[12px] text-white truncate">{p.name}</span>
                <span className="block text-[10px] font-mono text-[#B8ACCC]">
                  {p.is_free || p.price === 0 ? "FREE" : `$${p.price.toFixed(2)}`}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function RecipientPicker({
  accounts, picked, setPicked, all, setAll,
}: {
  accounts: PerkAccount[]; picked: string[]; setPicked: (v: string[]) => void;
  all: boolean; setAll: (v: boolean) => void;
}) {
  const [q, setQ] = useState("");
  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return accounts.slice(0, 12);
    return accounts
      .filter((a) => a.email.toLowerCase().includes(term) || (a.name ?? "").toLowerCase().includes(term))
      .slice(0, 12);
  }, [q, accounts]);

  return (
    <div>
      <div className="text-[10px] font-mono uppercase tracking-wider text-[#B8ACCC] mb-2">Recipients</div>
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setAll(false)}
          className={`min-h-[38px] px-3 rounded-lg font-mono text-[10px] uppercase tracking-wider transition ${
            !all ? "bg-white text-black font-bold" : "border border-white/15 text-[#C9BEDD] hover:text-white"
          }`}
        >
          Specific customers
        </button>
        <button
          onClick={() => setAll(true)}
          className={`min-h-[38px] px-3 rounded-lg font-mono text-[10px] uppercase tracking-wider transition ${
            all ? "bg-white text-black font-bold" : "border border-white/15 text-[#C9BEDD] hover:text-white"
          }`}
        >
          All accounts ({accounts.length.toLocaleString()})
        </button>
      </div>

      {all ? (
        <div className="font-mono text-[11px] text-[#B8ACCC]">
          Every registered account — {accounts.length.toLocaleString()} recipients.
        </div>
      ) : (
        <>
          {picked.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {picked.map((id) => {
                const a = accounts.find((x) => x.id === id);
                return (
                  <span key={id} className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full border border-white/20 bg-white/[0.06]">
                    <span className="text-[11px] text-white max-w-[200px] truncate">{a?.name ?? a?.email ?? id}</span>
                    <button onClick={() => setPicked(picked.filter((x) => x !== id))} className="text-white/50 hover:text-white">
                      <X size={12} />
                    </button>
                  </span>
                );
              })}
            </div>
          )}
          <div className="relative mb-3">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or email…" className={`${INPUT} !pl-9`} />
          </div>
          <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
            {list.map((a) => {
              const on = picked.includes(a.id);
              return (
                <button
                  key={a.id}
                  onClick={() => setPicked(on ? picked.filter((x) => x !== a.id) : [...picked, a.id])}
                  className={`w-full flex items-center justify-between gap-3 p-2.5 rounded-lg border text-left transition ${
                    on ? "border-white/70 bg-white/[0.10]" : "border-white/10 bg-white/[0.02] hover:border-white/30"
                  }`}
                >
                  <span className="min-w-0">
                    <span className="block text-[12px] text-white truncate">{a.name ?? a.email}</span>
                    {a.name && <span className="block text-[10px] font-mono text-[#B8ACCC] truncate">{a.email}</span>}
                  </span>
                  {on && <span className="text-[10px] font-mono text-white/70">SELECTED</span>}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function BatchRow({ batch, onChanged }: { batch: GrantBatchRow; onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  const [recipients, setRecipients] = useState<BatchRecipient[] | null>(null);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next && !recipients) {
      const res = await getBatchRecipients({ data: { batchId: batch.id, type: batch.type } });
      if ("error" in res) toast.error(res.error);
      else setRecipients(res.recipients);
    }
  }

  async function revokeAll() {
    setBusy(true);
    const res = await revokeGrantBatch({ data: { batchId: batch.id } });
    setBusy(false);
    if ("error" in res) { toast.error(res.error); return; }
    toast.success(`Revoked ${res.revoked} grant${res.revoked !== 1 ? "s" : ""}`);
    setRecipients(null);
    if (open) {
      const r = await getBatchRecipients({ data: { batchId: batch.id, type: batch.type } });
      if (!("error" in r)) setRecipients(r.recipients);
    }
    onChanged();
  }

  async function revokeOne(grantId: string) {
    setBusy(true);
    try {
      const res = await revokePluginGrant({ data: { grantId } });
      if ("error" in res) { toast.error(res.error); return; }
      if (res.revoked === 0) { toast.error("That grant was already revoked"); }
      else toast.success("Grant revoked");
      setRecipients((prev) => prev?.map((r) => (r.id === grantId ? { ...r, revoked_at: new Date().toISOString() } : r)) ?? null);
      const r = await getBatchRecipients({ data: { batchId: batch.id, type: batch.type } });
      if (!("error" in r)) setRecipients(r.recipients);
      onChanged();
    } catch (e: any) {
      console.error("[perks] revoke failed", e);
      toast.error(e?.message ?? "Revoke failed");
    } finally {
      setBusy(false);
    }
  }


  return (
    <li className="rounded-lg border border-white/10 bg-white/[0.02]">
      <div className="p-3 flex flex-wrap items-center gap-3">
        <button onClick={toggle} className="flex items-center gap-2 min-w-0 flex-1 text-left">
          <ChevronDown size={14} className={`text-white/50 transition ${open ? "rotate-180" : ""}`} />
          <span className="min-w-0">
            <span className="block text-[12px] text-white truncate">{batch.summary}</span>
            <span className="block text-[10px] font-mono text-[#B8ACCC] truncate">
              {new Date(batch.created_at).toLocaleString("en", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}
              {" · "}{batch.recipient_count.toLocaleString()} recipients
              {batch.admin_name ? ` · ${batch.admin_name}` : ""}
              {" · "}{batch.reason}
            </span>
          </span>
        </button>
        <span className="font-mono text-[10px] text-[#B8ACCC] shrink-0">
          {batch.granted_count.toLocaleString()} granted · {batch.skipped_count} skipped
          {batch.failed_count ? ` · ${batch.failed_count} failed` : ""}
        </span>
        {batch.type === "plugin" && (
          <button onClick={revokeAll} disabled={busy} className={`${QUIET_RED} shrink-0`}>
            <Undo2 size={12} /> Revoke batch
          </button>
        )}
      </div>
      {open && (
        <div className="border-t border-white/10 p-3">
          {!recipients ? (
            <div className="font-mono text-[11px] text-[#B8ACCC]">Loading recipients…</div>
          ) : recipients.length === 0 ? (
            <div className="font-mono text-[11px] text-[#B8ACCC]">No recipient rows.</div>
          ) : (
            <ul className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
              {recipients.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center gap-2 text-[11px]">
                  <span className="text-white/85 min-w-0 truncate flex-1">{r.name ?? r.email ?? r.customer_id}</span>
                  <span className="font-mono text-[10px] text-[#B8ACCC]">
                    {r.product_name ?? (r.amount_cents != null ? money(r.amount_cents) : "")}
                  </span>
                  {batch.type === "plugin" && (
                    r.revoked_at ? (
                      <span className="font-mono text-[10px] text-white/40">REVOKED</span>
                    ) : (
                      <button onClick={() => revokeOne(r.id)} className={QUIET_RED}>Revoke</button>
                    )
                  )}
                </li>
              ))}
            </ul>
          )}
          {batch.type === "credit" && (
            <div className="mt-3 text-[10px] font-mono text-[#B8ACCC]">
              Credit is never revoked here — issue a negative adjustment on the customer's ledger instead.
            </div>
          )}
        </div>
      )}
    </li>
  );
}
