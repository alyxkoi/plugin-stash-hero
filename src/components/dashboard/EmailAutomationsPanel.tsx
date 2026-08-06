import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { DashCard } from "@/components/DashboardShell";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getEmailAutomationStats,
  setEmailSequenceEnabled,
  sendBehavioralTestEmail,
  RANGE_KEYS,
  type RangeKey,
  type StepStat,
  type TestTemplateKey,
} from "@/lib/email-automation-admin.functions";


const TEST_TEMPLATE_LABELS: { key: TestTemplateKey; label: string }[] = [
  { key: "cart_1h", label: "Cart · 1 hour" },
  { key: "cart_24h", label: "Cart · 24 hours" },
  { key: "cart_72h", label: "Cart · 72 hours" },
  { key: "saved_3day", label: "Saved · 3-day nudge" },
  { key: "price_drop", label: "Saved · price drop" },
];

type SeqKey = "abandoned_cart" | "saved_items";


const LABELS: Record<SeqKey, { title: string; steps: { step: number; label: string }[] }> = {
  abandoned_cart: {
    title: "Abandoned cart",
    steps: [
      { step: 1, label: "1 hour" },
      { step: 2, label: "24 hours" },
      { step: 3, label: "72 hours" },
    ],
  },
  saved_items: {
    title: "Saved items",
    steps: [
      { step: 1, label: "3-day nudge" },
      { step: 2, label: "Price drop" },
    ],
  },
};

const RANGE_LABELS: Record<RangeKey, string> = {
  "7d": "Last 7 days",
  "14d": "Last 14 days",
  "30d": "Last 30 days",
  wtd: "Week to date",
  mtd: "Month to date",
};

const money = (cents: number) =>
  `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const rate = (sales: number, sent: number) => (sent > 0 ? (sales / sent) * 100 : 0);
const rateText = (sales: number, sent: number) => (sent > 0 ? `${rate(sales, sent).toFixed(1)}%` : "—");

export function EmailAutomationsPanel() {
  const fetchStats = useServerFn(getEmailAutomationStats);
  const toggleFn = useServerFn(setEmailSequenceEnabled);
  const dryRunFn = useServerFn(runEmailAutomationDryRun);
  const testSendFn = useServerFn(sendBehavioralTestEmail);
  const qc = useQueryClient();
  const [testEmail, setTestEmail] = useState("");
  const [range, setRange] = useState<RangeKey>("30d");
  const [skipsOpen, setSkipsOpen] = useState(false);
  const [testTemplate, setTestTemplate] = useState<TestTemplateKey>("cart_1h");
  const [testTo, setTestTo] = useState("pluginwh@gmail.com");
  const [testMulti, setTestMulti] = useState(false);


  const { data, isLoading, isFetching, isError, refetch } = useQuery({
    queryKey: ["email-automation-stats", range],
    queryFn: () => fetchStats({ data: { range } }),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });

  const toggle = useMutation({
    mutationFn: (v: { sequence: SeqKey; enabled: boolean }) => toggleFn({ data: v }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["email-automation-stats"] });
      toast.success("Sequence updated");
    },
    onError: (e: Error) => toast.error(e.message || "Couldn't update sequence"),
  });

  const dryRun = useMutation({
    mutationFn: () => dryRunFn({ data: testEmail.trim() ? { onlyEmail: testEmail.trim() } : {} }),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["email-automation-stats"] });
      toast.success(
        `Dry run: ${r.sent} would send · ${r.skipped} skipped · ${r.deferred} deferred · ${r.failed} failed`,
      );
    },
    onError: (e: Error) => toast.error(e.message || "Dry run failed"),
  });

  const testSend = useMutation({
    mutationFn: () =>
      testSendFn({ data: { template: testTemplate, to: testTo.trim(), multipleItems: testMulti } }),
    onSuccess: (r) => toast.success(`Test email sent to ${r.to}`),
    onError: (e: Error) => toast.error(e.message || "Couldn't send the test email"),
  });


  if (isError) {
    return (
      <DashCard title="Behavioral emails">
        <div className="py-10 text-center text-sm text-white/50">
          Couldn't load automation stats.{" "}
          <button onClick={() => refetch()} className="underline hover:text-white">
            Retry
          </button>
        </div>
      </DashCard>
    );
  }

  const stepStat = (seq: SeqKey, step: number): StepStat =>
    (data?.steps ?? []).find((s) => s.sequence === seq && s.step === step) ?? {
      sequence: seq,
      step,
      sent: 0,
      sales: 0,
      netCents: 0,
    };

  const dim = isFetching ? "opacity-50 transition-opacity" : "transition-opacity";

  return (
    <div className="space-y-4">
      {/* shared range filter */}
      <div className="flex flex-wrap gap-2">
        {RANGE_KEYS.map((k) => (
          <button
            key={k}
            onClick={() => setRange(k)}
            className={`rounded-full px-3.5 py-1.5 text-[10px] font-mono uppercase tracking-widest transition-colors ${
              range === k
                ? "bg-[var(--accent-red)] text-white shadow-[0_0_16px_rgba(255,0,60,0.3)]"
                : "border border-white/12 text-white/50 hover:border-white/30 hover:text-white"
            }`}
          >
            {RANGE_LABELS[k]}
          </button>
        ))}
      </div>

      {(Object.keys(LABELS) as SeqKey[]).map((key) => {
        const meta = LABELS[key];
        const enabled = data?.settings?.[key] ?? true;
        const outcome = (data?.outcomes ?? []).find((o) => o.sequence === key);
        const rows = meta.steps.map((s) => ({ ...s, ...stepStat(key, s.step) }));
        const totals = rows.reduce(
          (a, r) => ({ sent: a.sent + r.sent, sales: a.sales + r.sales, netCents: a.netCents + r.netCents }),
          { sent: 0, sales: 0, netCents: 0 },
        );
        const bestRate = Math.max(...rows.map((r) => (r.sent > 0 ? rate(r.sales, r.sent) : -1)));
        const bestStep = rows.find((r) => r.sent > 0 && rate(r.sales, r.sent) === bestRate && bestRate > 0)?.step;

        return (
          <DashCard key={key} title={meta.title}>
            {/* one header line: toggle + cadence + outcomes */}
            <div className="-mt-1 flex flex-wrap items-center gap-3 pb-4">
              <button
                disabled={toggle.isPending || isLoading}
                onClick={() => toggle.mutate({ sequence: key, enabled: !enabled })}
                className={`rounded-md px-4 py-1.5 text-[11px] font-mono uppercase tracking-wider transition-colors ${
                  enabled
                    ? "bg-[var(--accent-red)] text-white shadow-[0_0_18px_rgba(255,0,60,0.35)]"
                    : "border border-white/15 text-white/60 hover:text-white"
                }`}
              >
                {enabled ? "On" : "Off"}
              </button>
              <span className="text-[10px] font-mono uppercase tracking-widest text-white/30">
                {enabled ? "Running every 15 minutes" : "Paused"}
              </span>
              <span className="ml-auto text-[10px] font-mono uppercase tracking-widest text-white/30">
                {outcome?.skipped ?? 0} skipped · {outcome?.failed ?? 0} failed
              </span>
            </div>

            {/* desktop comparison table */}
            <div className={`hidden sm:block ${dim}`}>
              <table className="w-full">
                <thead>
                  <tr className="text-[10px] font-mono uppercase tracking-widest text-[#B8ACCC]/60">
                    <th className="py-2 text-left font-normal">Step</th>
                    <th className="py-2 text-right font-normal">Sent</th>
                    <th className="py-2 text-right font-normal">Sales</th>
                    <th className="py-2 text-right font-normal">Rate</th>
                    <th className="py-2 text-right font-normal">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const best = r.step === bestStep;
                    return (
                      <tr
                        key={r.step}
                        className={`border-t border-white/5 ${best ? "bg-[var(--accent-red)]/[0.07]" : ""}`}
                      >
                        <td
                          className={`py-3 text-[11px] font-mono uppercase tracking-widest ${
                            best ? "text-[var(--accent-red-glow)]" : "text-white/55"
                          }`}
                        >
                          {r.label}
                        </td>
                        <td className="py-3 text-right text-xl font-black tabular-nums">{r.sent}</td>
                        <td className="py-3 text-right text-xl font-black tabular-nums">{r.sales}</td>
                        <td
                          className={`py-3 text-right text-xl font-black tabular-nums ${
                            best ? "text-[var(--accent-red-glow)]" : ""
                          }`}
                        >
                          {rateText(r.sales, r.sent)}
                        </td>
                        <td className="py-3 text-right text-xl font-black tabular-nums">{money(r.netCents)}</td>
                      </tr>
                    );
                  })}
                  <tr className="border-t border-white/15">
                    <td className="py-3 text-[11px] font-mono uppercase tracking-widest text-white/35">Total</td>
                    <td className="py-3 text-right text-xl font-black tabular-nums text-white/70">{totals.sent}</td>
                    <td className="py-3 text-right text-xl font-black tabular-nums text-white/70">{totals.sales}</td>
                    <td className="py-3 text-right text-xl font-black tabular-nums text-white/70">
                      {rateText(totals.sales, totals.sent)}
                    </td>
                    <td className="py-3 text-right text-xl font-black tabular-nums text-white/70">
                      {money(totals.netCents)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* mobile: stacked blocks, metrics inline */}
            <div className={`space-y-2 sm:hidden ${dim}`}>
              {rows.map((r) => {
                const best = r.step === bestStep;
                return (
                  <div
                    key={r.step}
                    className={`rounded-xl border p-3 ${
                      best
                        ? "border-[var(--accent-red)]/40 bg-[var(--accent-red)]/[0.07]"
                        : "border-white/10 bg-white/[0.03]"
                    }`}
                  >
                    <div
                      className={`text-[10px] font-mono uppercase tracking-widest ${
                        best ? "text-[var(--accent-red-glow)]" : "text-white/45"
                      }`}
                    >
                      {r.label}
                    </div>
                    <div className="mt-2 grid grid-cols-4 gap-2">
                      {[
                        ["Sent", String(r.sent)],
                        ["Sales", String(r.sales)],
                        ["Rate", rateText(r.sales, r.sent)],
                        ["Rev", money(r.netCents)],
                      ].map(([k, v]) => (
                        <div key={k}>
                          <div className="text-[9px] font-mono uppercase tracking-widest text-[#B8ACCC]/55">{k}</div>
                          <div className="text-base font-black tabular-nums">{v}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
              <div className="flex items-center justify-between border-t border-white/15 pt-3">
                <span className="text-[10px] font-mono uppercase tracking-widest text-white/35">Total</span>
                <span className="text-base font-black tabular-nums text-white/70">
                  {totals.sent} · {totals.sales} · {rateText(totals.sales, totals.sent)} · {money(totals.netCents)}
                </span>
              </div>
            </div>
          </DashCard>
        );
      })}

      {/* skips: collapsed to one line when empty */}
      {(data?.recentSkips?.length ?? 0) === 0 ? (
        <p className="px-1 text-[10px] font-mono uppercase tracking-widest text-white/30">
          {isLoading ? "Loading…" : "No skips in this period"}
        </p>
      ) : (
        <div className="rounded-xl border border-white/10 bg-white/[0.02]">
          <button
            onClick={() => setSkipsOpen((v) => !v)}
            className="flex w-full items-center justify-between px-4 py-3 text-[10px] font-mono uppercase tracking-widest text-white/45 hover:text-white"
          >
            <span>{data!.recentSkips.length} skips</span>
            <span>{skipsOpen ? "Hide" : "Show"}</span>
          </button>
          {skipsOpen && (
            <div className="overflow-x-auto border-t border-white/8 px-2 pb-2">
              <table className="w-full text-sm">
                <thead className="text-[10px] font-mono uppercase tracking-widest text-[#B8ACCC]/55">
                  <tr>
                    <th className="px-2 py-2 text-left font-normal">When</th>
                    <th className="px-2 py-2 text-left font-normal">Email</th>
                    <th className="px-2 py-2 text-left font-normal">Sequence</th>
                    <th className="px-2 py-2 text-left font-normal">Step</th>
                    <th className="px-2 py-2 text-left font-normal">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {data!.recentSkips.map((r, i) => (
                    <tr key={`${r.email}-${i}`} className="border-t border-white/5">
                      <td className="whitespace-nowrap px-2 py-2 font-mono text-[10px] text-white/40">
                        {new Date(r.at).toLocaleDateString()}
                      </td>
                      <td className="max-w-[180px] truncate px-2 py-2 text-[12px] text-white/80">{r.email}</td>
                      <td className="px-2 py-2 text-[11px] text-white/55">{LABELS[r.sequence]?.title ?? r.sequence}</td>
                      <td className="px-2 py-2 font-mono text-xs">{r.step}</td>
                      <td className="px-2 py-2 font-mono text-[11px] text-[var(--accent-red-glow)]">
                        {r.reason}
                        {r.dryRun ? " (dry)" : ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <DashCard title="Send test email">
        <div className="space-y-3">
          <p className="text-[12px] leading-relaxed text-white/50">
            Sends the chosen template to one address using sample product data. It never reads a customer's
            cart or saved items, isn't logged, and doesn't count toward any stats.
          </p>
          <div className="flex flex-wrap gap-2">
            {TEST_TEMPLATE_LABELS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTestTemplate(t.key)}
                className={`rounded-full px-3.5 py-1.5 text-[10px] font-mono uppercase tracking-widest transition-colors ${
                  testTemplate === t.key
                    ? "bg-[var(--accent-red)] text-white shadow-[0_0_16px_rgba(255,0,60,0.3)]"
                    : "border border-white/12 text-white/50 hover:border-white/30 hover:text-white"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              value={testTo}
              onChange={(e) => setTestTo(e.target.value)}
              placeholder="you@address.com"
              className="w-full rounded-md border border-white/12 bg-white/[0.04] px-3 py-2 text-[12px] outline-none placeholder:text-white/25 focus:border-white/30 sm:w-64"
            />
            <button
              onClick={() => setTestMulti((v) => !v)}
              className={`whitespace-nowrap rounded-md px-3.5 py-2 text-[10px] font-mono uppercase tracking-widest transition-colors ${
                testMulti
                  ? "border border-[var(--accent-red)]/50 bg-[var(--accent-red)]/[0.12] text-[var(--accent-red-glow)]"
                  : "border border-white/12 text-white/50 hover:border-white/30 hover:text-white"
              }`}
            >
              Multiple items {testMulti ? "on" : "off"}
            </button>
            <button
              disabled={testSend.isPending || !testTo.trim()}
              onClick={() => testSend.mutate()}
              className="whitespace-nowrap rounded-md border border-white/20 px-4 py-2 text-[11px] font-mono uppercase tracking-wider text-white/70 transition-colors hover:border-white/40 hover:text-white disabled:opacity-50 sm:ml-auto"
            >
              {testSend.isPending ? "Sending…" : "Send test email"}
            </button>
          </div>
        </div>
      </DashCard>

      <DashCard title="Dry run">

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <p className="flex-1 text-[12px] leading-relaxed text-white/50">
            Evaluates every rule and records the outcome in the log without sending anything through Resend. Leave
            blank to simulate the whole queue, or enter one address to scope it.
          </p>
          <div className="flex gap-2">
            <input
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="test@address.com"
              className="w-full rounded-md border border-white/12 bg-white/[0.04] px-3 py-2 text-[12px] outline-none placeholder:text-white/25 focus:border-white/30 sm:w-56"
            />
            <button
              disabled={dryRun.isPending}
              onClick={() => dryRun.mutate()}
              className="whitespace-nowrap rounded-md border border-white/20 px-4 py-2 text-[11px] font-mono uppercase tracking-wider text-white/70 transition-colors hover:border-white/40 hover:text-white disabled:opacity-50"
            >
              {dryRun.isPending ? "Running…" : "Run dry run"}
            </button>
          </div>
        </div>
      </DashCard>
    </div>
  );
}
