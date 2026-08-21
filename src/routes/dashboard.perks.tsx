import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Search,
  X,
  Loader2,
  Wallet,
  Package,
  ChevronDown,
  Undo2,
  AlertTriangle,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { ChargedPanel, DashCard, DashboardShell } from "@/components/DashboardShell";
import {
  perksBootstrap,
  runGrantBatch,
  listGrantBatches,
  getBatchRecipients,
  revokePluginGrant,
  revokeGrantBatch,
  type PerkProduct,
  type PerkAccount,
  type GrantBatchRow,
  type BatchRecipient,
} from "@/lib/perks.functions";

export const Route = createFileRoute("/dashboard/perks")({
  validateSearch: (
    s: Record<string, unknown>,
  ): { customer?: string; kind?: "plugin" | "credit" } => ({
    customer: typeof s.customer === "string" ? s.customer : undefined,
    kind: s.kind === "credit" ? "credit" : s.kind === "plugin" ? "plugin" : undefined,
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
  const { customer, kind: requestedKind } = Route.useSearch();
  const navigate = useNavigate();

  const [products, setProducts] = useState<PerkProduct[]>([]);
  const [accounts, setAccounts] = useState<PerkAccount[]>([]);
  const [loading, setLoading] = useState(true);

  const [kind, setKind] = useState<"plugin" | "credit">(requestedKind ?? "plugin");
  const [pickedProducts, setPickedProducts] = useState<string[]>([]);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [allAccounts, setAllAccounts] = useState(false);
  const [pickedCustomers, setPickedCustomers] = useState<string[]>(customer ? [customer] : []);
  const [review, setReview] = useState(false);
  const [typed, setTyped] = useState("");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<{ granted: number; skipped: number; failed: number } | null>(
    null,
  );

  const [batches, setBatches] = useState<GrantBatchRow[]>([]);

  const loadBatches = useCallback(async () => {
    const res = await listGrantBatches();
    if (!("error" in res)) setBatches(res.batches);
  }, []);

  useEffect(() => {
    (async () => {
      const res = await perksBootstrap();
      if ("error" in res) toast.error(res.error);
      else {
        setProducts(res.products);
        setAccounts(res.accounts);
      }
      await loadBatches();
      setLoading(false);
    })();
  }, [loadBatches]);

  // Keep a pre-selected customer from the Customers drawer deep-link.
  useEffect(() => {
    if (customer)
      setPickedCustomers((prev) => (prev.includes(customer) ? prev : [...prev, customer]));
  }, [customer]);

  useEffect(() => {
    if (requestedKind) setKind(requestedKind);
  }, [requestedKind]);

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
  const typedOk =
    !needsTyped ||
    typed.trim().toUpperCase() === "GRANT" ||
    typed.trim() === String(recipientCount);
  const pluginRetailCents =
    pickedProducts.reduce(
      (sum, id) => sum + Math.round(Number(productMap.get(id)?.price || 0) * 100),
      0,
    ) * recipientCount;
  const grantValueCents = kind === "credit" ? amountCents * recipientCount : pluginRetailCents;
  const disabledReason =
    reason.trim().length < 3
      ? "Add an audit reason"
      : recipientCount === 0
        ? "Pick at least one recipient"
        : kind === "plugin" && pickedProducts.length === 0
          ? "Pick at least one plugin"
          : kind === "credit" && amountCents <= 0
            ? "Enter a credit amount"
            : null;

  function resetForm() {
    setReview(false);
    setTyped("");
    setPickedProducts([]);
    setAmount("");
    setReason("");
    setAllAccounts(false);
    setPickedCustomers([]);
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
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      setResult({ granted: res.granted, skipped: res.skipped, failed: res.failed });
      if (res.failed > 0) {
        console.error("[perks] grant batch errors", res.errors);
        toast.error(`${res.failed} failed${res.errors[0] ? ` — ${res.errors[0]}` : ""}`);
      }
      if (res.granted > 0)
        toast.success(`${res.granted.toLocaleString()} granted · ${res.skipped} skipped`);
      else if (res.failed === 0) toast.info(`Nothing to grant — ${res.skipped} already owned`);
      resetForm();
      await loadBatches();
    } catch (e: any) {
      toast.error(e?.message ?? "Grant failed");
    } finally {
      setRunning(false);
    }
  }

  if (loading) {
    return (
      <DashboardShell title="Perks">
        <div className="font-mono text-xs text-white/50 py-10">Loading perks…</div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell title="Perks">
      <div className="space-y-6">
        {result && (
          <div className="dash-inline-success" role="status">
            <strong>{result.granted.toLocaleString()} granted</strong>
            <span>{result.skipped.toLocaleString()} skipped (already owned)</span>
            <span className={result.failed ? "text-[var(--st-danger)]" : ""}>
              {result.failed} failed
            </span>
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          <div className="xl:col-span-8 space-y-6">
            {!review ? (
              <>
                <DashCard title="1. What">
                  <div className="dash-segmented mb-5" role="group" aria-label="Grant type">
                    {(["plugin", "credit"] as const).map((value) => (
                      <button
                        type="button"
                        key={value}
                        onClick={() => setKind(value)}
                        aria-pressed={kind === value}
                        className="inline-flex items-center gap-2 !min-h-10 !px-4"
                      >
                        {value === "plugin" ? <Package size={14} /> : <Wallet size={14} />}
                        {value === "plugin" ? "Plugins" : "Store credit"}
                      </button>
                    ))}
                  </div>

                  {kind === "plugin" ? (
                    <ProductPicker
                      products={products}
                      picked={pickedProducts}
                      setPicked={setPickedProducts}
                    />
                  ) : (
                    <label className="block max-w-[280px]">
                      <span className="dash-table-label mb-1 block">Amount (USD)</span>
                      <span className="relative block">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]">
                          $
                        </span>
                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          inputMode="decimal"
                          value={amount}
                          onChange={(event) => setAmount(event.target.value)}
                          placeholder="25.00"
                          className={`${INPUT} !pl-7`}
                        />
                      </span>
                    </label>
                  )}
                </DashCard>

                <DashCard title="2. Who">
                  <RecipientPicker
                    accounts={accounts}
                    picked={pickedCustomers}
                    setPicked={setPickedCustomers}
                    all={allAccounts}
                    setAll={setAllAccounts}
                  />
                </DashCard>
              </>
            ) : (
              <DashCard title="Review grant">
                <div className="space-y-4">
                  <div className="rounded-[var(--r-element)] border border-[var(--border)] bg-[var(--surface-2)] p-4 space-y-3">
                    <Row label="Granting">
                      {kind === "credit"
                        ? `${money(amountCents)} store credit`
                        : pickedProducts
                            .map((id) => productMap.get(id)?.name)
                            .filter(Boolean)
                            .join(", ")}
                    </Row>
                    <Row label="Recipients">
                      <span className="font-mono text-3xl text-[var(--c-people)]">
                        {recipientCount.toLocaleString()}
                      </span>{" "}
                      <span className="text-xs text-[var(--text-tertiary)]">
                        {allAccounts ? "all registered accounts" : "selected customers"}
                      </span>
                    </Row>
                    <Row label="Audit reason">{reason.trim()}</Row>
                    <Row label="Retail value">{money(grantValueCents)}</Row>
                  </div>

                  {allAccounts && kind === "plugin" && paidSelected && (
                    <div className="flex gap-3 rounded-[var(--r-element)] border border-[var(--st-danger)]/45 bg-[var(--st-danger)]/[0.08] p-4">
                      <AlertTriangle size={18} className="shrink-0 text-[var(--st-danger)]" />
                      <p className="text-sm text-[var(--text-secondary)]">
                        You are giving a paid plugin to every registered account. Access remains
                        permanent unless the grant is revoked.
                      </p>
                    </div>
                  )}

                  {needsTyped && (
                    <label className="block max-w-[360px]">
                      <span className="dash-table-label mb-1 block">
                        Type GRANT or {recipientCount} to enable
                      </span>
                      <input
                        value={typed}
                        onChange={(event) => setTyped(event.target.value)}
                        className={INPUT}
                        placeholder="GRANT"
                      />
                    </label>
                  )}

                  <button
                    type="button"
                    onClick={() => setReview(false)}
                    disabled={running}
                    className="btn-ghost !px-4 !text-xs"
                  >
                    Back to selection
                  </button>
                  {running && (
                    <div className="h-1.5 overflow-hidden rounded-full bg-[var(--surface-3)]">
                      <div className="h-full w-1/3 bg-[var(--c-people)] animate-[perks-progress_1.1s_ease-in-out_infinite]" />
                    </div>
                  )}
                </div>
              </DashCard>
            )}
          </div>

          <div className="xl:col-span-4 xl:sticky xl:top-[96px]">
            <ChargedPanel domain="people" title="Grant summary" className="dash-grant-summary">
              <div className="dash-grant-summary-body">
                <div>
                  <span>{kind === "plugin" ? "Plugins" : "Store credit"}</span>
                  <strong>
                    {kind === "plugin"
                      ? pickedProducts.length.toLocaleString()
                      : money(amountCents)}
                  </strong>
                  {kind === "plugin" && (
                    <small>
                      {pickedProducts
                        .map((id) => productMap.get(id)?.name)
                        .filter(Boolean)
                        .slice(0, 3)
                        .join(", ") || "Nothing selected"}
                    </small>
                  )}
                </div>
                <div>
                  <span>Recipients</span>
                  <strong>{recipientCount.toLocaleString()}</strong>
                  <small>{allAccounts ? "All registered accounts" : "Selected customers"}</small>
                </div>
                <div>
                  <span>Retail value</span>
                  <strong>{money(grantValueCents)}</strong>
                </div>

                {!review && (
                  <label>
                    <span>Reason (required)</span>
                    <input
                      value={reason}
                      onChange={(event) => setReason(event.target.value)}
                      maxLength={300}
                      placeholder="Holiday gift for everyone"
                    />
                  </label>
                )}

                <p>Grants are silent — no emails or notifications are sent.</p>
                <button
                  type="button"
                  disabled={review ? !typedOk || running : !canReview}
                  onClick={
                    review
                      ? execute
                      : () => {
                          setTyped("");
                          setReview(true);
                        }
                  }
                  className={WHITE_BTN}
                >
                  {running ? (
                    <>
                      <Loader2 size={14} className="animate-spin" /> Granting…
                    </>
                  ) : review ? (
                    kind === "plugin" ? (
                      "Grant plugins"
                    ) : (
                      "Grant store credit"
                    )
                  ) : (
                    "Review grant"
                  )}
                </button>
                {!review && disabledReason && (
                  <div className="dash-grant-disabled-reason">{disabledReason}</div>
                )}
              </div>
            </ChargedPanel>
          </div>
        </div>

        <DashCard title="Grant history">
          {batches.length === 0 ? (
            <div className="dash-empty">
              <p>No grants yet. Completed batches and their audit reasons will appear here.</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {batches.map((batch) => (
                <BatchRow key={batch.id} batch={batch} onChanged={loadBatches} />
              ))}
            </ul>
          )}
        </DashCard>

        <button
          type="button"
          onClick={() => navigate({ to: "/dashboard/customers" as any })}
          className="font-mono text-[11px] text-[var(--text-tertiary)] hover:text-white"
        >
          ← Back to customers
        </button>
      </div>
    </DashboardShell>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[9px] font-mono uppercase tracking-[0.18em] text-[#B8ACCC] mb-1">
        {label}
      </div>
      <div className="text-sm text-white">{children}</div>
    </div>
  );
}

function ProductPicker({
  products,
  picked,
  setPicked,
}: {
  products: PerkProduct[];
  picked: string[];
  setPicked: (v: string[]) => void;
}) {
  const [q, setQ] = useState("");
  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    const pool = term ? products.filter((p) => p.name.toLowerCase().includes(term)) : products;
    return pool.slice(0, 24);
  }, [q, products]);

  return (
    <div>
      <div className="text-[10px] font-mono uppercase tracking-wider text-[#B8ACCC] mb-2">
        Plugins
      </div>
      {picked.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {picked.map((id) => {
            const p = products.find((x) => x.id === id);
            return (
              <span
                key={id}
                className="inline-flex items-center gap-2 pl-1.5 pr-2 py-1 rounded-full border border-white/20 bg-white/[0.06]"
              >
                <span
                  className="w-5 h-5 rounded-full bg-cover bg-center shrink-0"
                  style={{
                    background: p?.cover_url
                      ? `url(${p.cover_url}) center/cover`
                      : (p?.cover_gradient ?? "#190737"),
                  }}
                />
                <span className="text-[11px] text-white max-w-[160px] truncate">
                  {p?.name ?? id}
                </span>
                <button
                  onClick={() => setPicked(picked.filter((x) => x !== id))}
                  className="text-white/50 hover:text-white"
                >
                  <X size={12} />
                </button>
              </span>
            );
          })}
        </div>
      )}
      <div className="relative mb-3">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search plugins…"
          className={`${INPUT} !pl-9`}
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2 max-h-[280px] overflow-y-auto pr-1">
        {list.map((p) => {
          const on = picked.includes(p.id);
          return (
            <button
              key={p.id}
              onClick={() => setPicked(on ? picked.filter((x) => x !== p.id) : [...picked, p.id])}
              className={`relative flex min-h-[56px] items-center gap-3 p-2 rounded-lg border text-left transition ${
                on
                  ? "border-[var(--c-people)] bg-[var(--c-people)]/[0.12]"
                  : "border-[var(--border)] bg-[var(--surface-2)] hover:border-[var(--border-strong)]"
              }`}
            >
              <span
                className="w-9 h-9 rounded-md shrink-0"
                style={{
                  background: p.cover_url
                    ? `url(${p.cover_url}) center/cover`
                    : (p.cover_gradient ?? "#190737"),
                }}
              />
              <span className="min-w-0">
                <span className="block text-[12px] text-white truncate">{p.name}</span>
                <span className="block text-[10px] font-mono text-[#B8ACCC]">
                  {p.is_free || p.price === 0 ? "FREE" : `$${p.price.toFixed(2)}`}
                </span>
              </span>
              {on && (
                <span className="ml-auto flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--c-people)] text-[#16092C]">
                  <Check size={13} strokeWidth={3} />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function RecipientPicker({
  accounts,
  picked,
  setPicked,
  all,
  setAll,
}: {
  accounts: PerkAccount[];
  picked: string[];
  setPicked: (v: string[]) => void;
  all: boolean;
  setAll: (v: boolean) => void;
}) {
  const [q, setQ] = useState("");
  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return accounts.slice(0, 12);
    return accounts
      .filter(
        (a) => a.email.toLowerCase().includes(term) || (a.name ?? "").toLowerCase().includes(term),
      )
      .slice(0, 12);
  }, [q, accounts]);

  return (
    <div>
      <div className="text-[10px] font-mono uppercase tracking-wider text-[#B8ACCC] mb-2">
        Recipients
      </div>
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setAll(false)}
          className={`min-h-[38px] px-3 rounded-lg font-mono text-[10px] uppercase tracking-wider transition ${
            !all
              ? "bg-white text-black font-bold"
              : "border border-white/15 text-[#C9BEDD] hover:text-white"
          }`}
        >
          Specific customers
        </button>
        <button
          onClick={() => setAll(true)}
          className={`min-h-[38px] px-3 rounded-lg font-mono text-[10px] uppercase tracking-wider transition ${
            all
              ? "bg-white text-black font-bold"
              : "border border-white/15 text-[#C9BEDD] hover:text-white"
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
                  <span
                    key={id}
                    className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full border border-white/20 bg-white/[0.06]"
                  >
                    <span className="text-[11px] text-white max-w-[200px] truncate">
                      {a?.name ?? a?.email ?? id}
                    </span>
                    <button
                      onClick={() => setPicked(picked.filter((x) => x !== id))}
                      className="text-white/50 hover:text-white"
                    >
                      <X size={12} />
                    </button>
                  </span>
                );
              })}
            </div>
          )}
          <div className="relative mb-3">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name or email…"
              className={`${INPUT} !pl-9`}
            />
          </div>
          <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
            {list.map((a) => {
              const on = picked.includes(a.id);
              return (
                <button
                  key={a.id}
                  onClick={() =>
                    setPicked(on ? picked.filter((x) => x !== a.id) : [...picked, a.id])
                  }
                  className={`w-full min-h-[56px] flex items-center justify-between gap-3 p-2.5 rounded-lg border text-left transition ${
                    on
                      ? "border-[var(--c-people)] bg-[var(--c-people)]/[0.12]"
                      : "border-[var(--border)] bg-[var(--surface-2)] hover:border-[var(--border-strong)]"
                  }`}
                >
                  <span className="min-w-0">
                    <span className="block text-[12px] text-white truncate">
                      {a.name ?? a.email}
                    </span>
                    {a.name && (
                      <span className="block text-[10px] font-mono text-[#B8ACCC] truncate">
                        {a.email}
                      </span>
                    )}
                  </span>
                  {on && (
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--c-people)] text-[#16092C]">
                      <Check size={13} strokeWidth={3} />
                    </span>
                  )}
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
    let res: Awaited<ReturnType<typeof revokeGrantBatch>>;
    try {
      res = await revokeGrantBatch({ data: { batchId: batch.id } });
    } catch (e: any) {
      console.error("[perks] batch revoke failed", e);
      toast.error(e?.message ?? "Revoke failed");
      setBusy(false);
      return;
    }
    setBusy(false);
    if ("error" in res) {
      toast.error(res.error);
      return;
    }
    if (res.revoked === 0) toast.error("Nothing left to revoke in this batch");
    else toast.success(`Revoked ${res.revoked} grant${res.revoked !== 1 ? "s" : ""}`);
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
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      if (res.revoked === 0) {
        toast.error("That grant was already revoked");
      } else toast.success("Grant revoked");
      setRecipients(
        (prev) =>
          prev?.map((r) =>
            r.id === grantId ? { ...r, revoked_at: new Date().toISOString() } : r,
          ) ?? null,
      );
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
          <ChevronDown
            size={14}
            className={`text-white/50 transition ${open ? "rotate-180" : ""}`}
          />
          <span className="min-w-0">
            <span className="block text-[12px] text-white truncate">{batch.summary}</span>
            <span className="block text-[10px] font-mono text-[#B8ACCC] truncate">
              {new Date(batch.created_at).toLocaleString("en", {
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
              {" · "}
              {batch.recipient_count.toLocaleString()} recipients
              {batch.admin_name ? ` · ${batch.admin_name}` : ""}
              {" · "}
              {batch.reason}
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
                  <span className="text-white/85 min-w-0 truncate flex-1">
                    {r.name ?? r.email ?? r.customer_id}
                  </span>
                  <span className="font-mono text-[10px] text-[#B8ACCC]">
                    {r.product_name ?? (r.amount_cents != null ? money(r.amount_cents) : "")}
                  </span>
                  {batch.type === "plugin" &&
                    (r.revoked_at ? (
                      <span className="font-mono text-[10px] text-white/40">REVOKED</span>
                    ) : (
                      <button
                        onClick={() => revokeOne(r.id)}
                        disabled={busy}
                        className={`${QUIET_RED} disabled:opacity-40`}
                      >
                        Revoke
                      </button>
                    ))}
                </li>
              ))}
            </ul>
          )}
          {batch.type === "credit" && (
            <div className="mt-3 text-[10px] font-mono text-[#B8ACCC]">
              Credit is never revoked here — issue a negative adjustment on the customer's ledger
              instead.
            </div>
          )}
        </div>
      )}
    </li>
  );
}
