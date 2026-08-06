import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { DashCard } from "@/components/DashboardShell";
import {
  getEmailAutomationStats,
  runEmailAutomationDryRun,
  setEmailSequenceEnabled,
} from "@/lib/email-automation-admin.functions";


type SeqKey = "abandoned_cart" | "saved_items";

const LABELS: Record<SeqKey, { title: string; steps: Record<number, string> }> = {
  abandoned_cart: {
    title: "Abandoned cart",
    steps: { 1: "1 hour", 2: "24 hours", 3: "72 hours" },
  },
  saved_items: {
    title: "Saved items",
    steps: { 1: "3-day nudge", 2: "Price drop", 3: "—" },
  },
};

export function EmailAutomationsPanel() {
  const fetchStats = useServerFn(getEmailAutomationStats);
  const toggleFn = useServerFn(setEmailSequenceEnabled);
  const dryRunFn = useServerFn(runEmailAutomationDryRun);
  const qc = useQueryClient();
  const [testEmail, setTestEmail] = useState("");

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["email-automation-stats"],
    queryFn: () => fetchStats(),
    staleTime: 30_000,
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
    mutationFn: () =>
      dryRunFn({ data: testEmail.trim() ? { onlyEmail: testEmail.trim() } : {} }),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["email-automation-stats"] });
      toast.success(
        `Dry run: ${r.sent} would send · ${r.skipped} skipped · ${r.deferred} deferred · ${r.failed} failed`,
      );
    },
    onError: (e: Error) => toast.error(e.message || "Dry run failed"),
  });

  if (isError) {
    return (
      <DashCard title="Behavioral emails">
        <div className="py-10 text-center text-sm text-white/50">
          Couldn't load automation stats.{" "}
          <button onClick={() => refetch()} className="underline hover:text-white">Retry</button>
        </div>
      </DashCard>
    );
  }

  return (
    <div className="space-y-4">
      <DashCard title="Dry run">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <p className="flex-1 text-[12px] leading-relaxed text-white/50">
            Evaluates every rule and records the outcome in the log without sending anything through
            Resend. Leave blank to simulate the whole queue, or enter one address to scope it.
          </p>
          <div className="flex gap-2">
            <input
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="test@address.com"
              className="w-full sm:w-56 rounded-md border border-white/12 bg-white/[0.04] px-3 py-2 text-[12px] outline-none placeholder:text-white/25 focus:border-white/30"
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

      {(["abandoned_cart", "saved_items"] as SeqKey[]).map((key) => {
        const s = data?.[key];
        const enabled = data?.settings?.[key] ?? true;
        const meta = LABELS[key];
        return (
          <DashCard key={key} title={meta.title}>
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4">
              <div className="text-[11px] font-mono uppercase tracking-widest text-white/40">
                {isLoading ? "Loading…" : enabled ? "Running every 15 minutes" : "Paused"}
              </div>
              <button
                disabled={toggle.isPending || isLoading}
                onClick={() => toggle.mutate({ sequence: key, enabled: !enabled })}
                className={`px-4 py-2 rounded-md text-[11px] font-mono uppercase tracking-wider transition-colors ${
                  enabled
                    ? "bg-[var(--accent-red)] text-white shadow-[0_0_18px_rgba(255,0,60,0.35)]"
                    : "border border-white/15 text-white/60 hover:text-white"
                }`}
              >
                {enabled ? "On" : "Off"}
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[1, 2, 3]
                .filter((step) => !(key === "saved_items" && step === 3))
                .map((step) => (
                  <div key={step} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                    <div className="text-[10px] font-mono uppercase tracking-widest text-white/40">
                      Step {step} · {meta.steps[step]}
                    </div>
                    <div className="mt-2 text-2xl font-black tabular-nums">{s?.last7?.[step] ?? 0}</div>
                    <div className="mt-1 text-[10px] font-mono uppercase tracking-widest text-white/35">
                      7d · {s?.last30?.[step] ?? 0} in 30d
                    </div>
                  </div>
                ))}
              <div className="rounded-xl border border-[var(--accent-red)]/40 bg-[var(--accent-red)]/[0.07] p-4">
                <div className="text-[10px] font-mono uppercase tracking-widest text-white/50">Recovered orders</div>
                <div className="mt-2 text-2xl font-black tabular-nums text-[var(--accent-red-glow)]">
                  {s?.recovered ?? 0}
                </div>
                <div className="mt-1 text-[10px] font-mono uppercase tracking-widest text-white/35">
                  within 24h · 30d
                </div>
              </div>
            </div>

            <div className="mt-4 flex gap-5 text-[10px] font-mono uppercase tracking-widest text-white/35">
              <span>{s?.skipped ?? 0} skipped</span>
              <span>{s?.failed ?? 0} failed</span>
              <span>{s?.dryRun ?? 0} dry-run rows</span>
            </div>
          </DashCard>
        );
      })}

      <DashCard title="Recent skips">
        {(data?.recentSkips?.length ?? 0) === 0 ? (
          <div className="py-8 text-center text-sm text-white/40">
            {isLoading ? "Loading…" : "Nothing skipped in the last 30 days."}
          </div>
        ) : (
          <div className="overflow-x-auto -mx-2">
            <table className="w-full text-sm">
              <thead className="text-[10px] uppercase tracking-wider text-white/40">
                <tr>
                  <th className="text-left py-2 px-2">Email</th>
                  <th className="text-left py-2 px-2">Sequence</th>
                  <th className="text-left py-2 px-2">Step</th>
                  <th className="text-left py-2 px-2">Reason</th>
                  <th className="text-right py-2 px-2">When</th>
                </tr>
              </thead>
              <tbody>
                {data!.recentSkips.map((r, i) => (
                  <tr key={`${r.email}-${i}`} className="border-t border-white/5">
                    <td className="py-2 px-2 text-[12px] text-white/80 truncate max-w-[220px]">{r.email}</td>
                    <td className="py-2 px-2 text-[11px] text-white/55">{LABELS[r.sequence].title}</td>
                    <td className="py-2 px-2 font-mono text-xs">{r.step}</td>
                    <td className="py-2 px-2 font-mono text-[11px] text-[var(--accent-red-glow)]">{r.reason}{r.dryRun ? " (dry)" : ""}</td>
                    <td className="py-2 px-2 text-right font-mono text-[10px] text-white/40 whitespace-nowrap">
                      {new Date(r.at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DashCard>
    </div>
  );
}
