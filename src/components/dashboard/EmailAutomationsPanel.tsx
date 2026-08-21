import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { MailCheck, Send, TrendingUp } from "lucide-react";
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

const LABELS: Record<
  SeqKey,
  { title: string; description: string; steps: { step: number; label: string; purpose: string }[] }
> = {
  abandoned_cart: {
    title: "Abandoned cart",
    description: "Recover checkout sessions with a timed three-message sequence.",
    steps: [
      { step: 1, label: "After 1 hour", purpose: "Quick reminder" },
      { step: 2, label: "After 24 hours", purpose: "Second chance" },
      { step: 3, label: "After 72 hours", purpose: "Final follow-up" },
    ],
  },
  saved_items: {
    title: "Saved items",
    description: "Bring customers back when saved products are still relevant.",
    steps: [
      { step: 1, label: "After 3 days", purpose: "Saved-item nudge" },
      { step: 2, label: "On price drop", purpose: "Price alert" },
    ],
  },
};

const RANGE_LABELS: Record<RangeKey, string> = {
  "7d": "7 days",
  "14d": "14 days",
  "30d": "30 days",
  wtd: "This week",
  mtd: "This month",
};

const money = (cents: number) =>
  `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const rate = (sales: number, sent: number) => (sent > 0 ? (sales / sent) * 100 : 0);
const rateText = (sales: number, sent: number) =>
  sent > 0 ? `${rate(sales, sent).toFixed(1)}%` : "—";

export function EmailAutomationsPanel() {
  const fetchStats = useServerFn(getEmailAutomationStats);
  const toggleFn = useServerFn(setEmailSequenceEnabled);
  const testSendFn = useServerFn(sendBehavioralTestEmail);
  const qc = useQueryClient();

  const [range, setRange] = useState<RangeKey>("30d");
  const [skipsOpen, setSkipsOpen] = useState(false);
  const [testTemplate, setTestTemplate] = useState<TestTemplateKey>("cart_1h");
  const [testTo, setTestTo] = useState("alexrunsit@gmail.com");
  const [testMulti, setTestMulti] = useState(false);

  const { data, isLoading, isFetching, isError, refetch } = useQuery({
    queryKey: ["email-automation-stats", range],
    queryFn: () => fetchStats({ data: { range } }),
    staleTime: 30_000,
    placeholderData: (previous) => previous,
  });

  const toggle = useMutation({
    mutationFn: (value: { sequence: SeqKey; enabled: boolean }) => toggleFn({ data: value }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["email-automation-stats"] });
      toast.success("Sequence updated");
    },
    onError: (error: Error) => toast.error(error.message || "Couldn't update sequence"),
  });

  const testSend = useMutation({
    mutationFn: () =>
      testSendFn({ data: { template: testTemplate, to: testTo.trim(), multipleItems: testMulti } }),
    onSuccess: (result) => toast.success(`Test email sent to ${result.to}`),
    onError: (error: Error) => toast.error(error.message || "Couldn't send the test email"),
  });

  if (isError) {
    return (
      <DashCard title="Behavioral emails">
        <div className="dash-empty">
          <p>Couldn't load automation stats.</p>
          <button type="button" onClick={() => refetch()} className="btn-ghost px-4">
            Retry
          </button>
        </div>
      </DashCard>
    );
  }

  const stepStat = (sequence: SeqKey, step: number): StepStat =>
    (data?.steps ?? []).find((item) => item.sequence === sequence && item.step === step) ?? {
      sequence,
      step,
      sent: 0,
      sales: 0,
      netCents: 0,
    };

  const allSteps = (Object.keys(LABELS) as SeqKey[]).flatMap((sequence) =>
    LABELS[sequence].steps.map(({ step }) => stepStat(sequence, step)),
  );
  const totals = allSteps.reduce(
    (sum, item) => ({
      sent: sum.sent + item.sent,
      sales: sum.sales + item.sales,
      netCents: sum.netCents + item.netCents,
    }),
    { sent: 0, sales: 0, netCents: 0 },
  );
  const activeSequences = (Object.keys(LABELS) as SeqKey[]).filter(
    (sequence) => data?.settings?.[sequence] ?? true,
  ).length;
  const dim = isFetching ? "is-refreshing" : "";

  return (
    <div className="dash-email-ops">
      <section className={`dash-email-overview ${dim}`} aria-label="Email automation summary">
        <div className="dash-email-overview-head">
          <div>
            <span className="dash-email-eyebrow">Automation health</span>
            <h2>Recovery engine</h2>
            <p>Live performance across cart and saved-item journeys.</p>
          </div>
          <div className="dash-email-ranges" aria-label="Automation reporting range">
            {RANGE_KEYS.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setRange(key)}
                aria-pressed={range === key}
              >
                {RANGE_LABELS[key]}
              </button>
            ))}
          </div>
        </div>
        <div className="dash-email-summary-grid">
          <EmailSummary label="Sequences live" value={`${activeSequences} / 2`} />
          <EmailSummary label="Messages sent" value={totals.sent.toLocaleString()} />
          <EmailSummary label="Recovered sales" value={totals.sales.toLocaleString()} />
          <EmailSummary label="Recovery rate" value={rateText(totals.sales, totals.sent)} />
          <EmailSummary label="Recovered revenue" value={money(totals.netCents)} highlight />
        </div>
      </section>

      <div className={`dash-email-flows ${dim}`}>
        {(Object.keys(LABELS) as SeqKey[]).map((key) => {
          const meta = LABELS[key];
          const enabled = data?.settings?.[key] ?? true;
          const outcome = (data?.outcomes ?? []).find((item) => item.sequence === key);
          const rows = meta.steps.map((step) => ({ ...step, ...stepStat(key, step.step) }));
          const sequenceTotals = rows.reduce(
            (sum, item) => ({
              sent: sum.sent + item.sent,
              sales: sum.sales + item.sales,
              netCents: sum.netCents + item.netCents,
            }),
            { sent: 0, sales: 0, netCents: 0 },
          );
          const bestRate = Math.max(...rows.map((item) => rate(item.sales, item.sent)));

          return (
            <DashCard
              key={key}
              title={meta.title}
              className="dash-email-flow-card"
              action={
                <button
                  type="button"
                  disabled={toggle.isPending || isLoading}
                  onClick={() => toggle.mutate({ sequence: key, enabled: !enabled })}
                  className="dash-automation-toggle"
                  data-enabled={enabled}
                  aria-label={`${enabled ? "Pause" : "Enable"} ${meta.title}`}
                >
                  <i aria-hidden="true" />
                  {enabled ? "Running" : "Paused"}
                </button>
              }
            >
              <div className="dash-email-flow-intro">
                <p>{meta.description}</p>
                <span>{enabled ? "Checks every 15 minutes" : "Automation is paused"}</span>
              </div>

              <ol className="dash-email-step-list">
                {rows.map((row, index) => {
                  const isBest = row.sent > 0 && bestRate > 0 && rate(row.sales, row.sent) === bestRate;
                  return (
                    <li key={row.step} data-best={isBest}>
                      <span className="dash-email-step-number">{String(index + 1).padStart(2, "0")}</span>
                      <span className="dash-email-step-copy">
                        <strong>{row.purpose}</strong>
                        <small>{row.label}</small>
                      </span>
                      <EmailStepMetric label="Sent" value={row.sent.toLocaleString()} />
                      <EmailStepMetric label="Sales" value={row.sales.toLocaleString()} />
                      <EmailStepMetric label="Rate" value={rateText(row.sales, row.sent)} />
                      <EmailStepMetric label="Revenue" value={money(row.netCents)} />
                      {isBest && <TrendingUp size={16} aria-label="Best recovery rate" />}
                    </li>
                  );
                })}
              </ol>

              <div className="dash-email-flow-footer">
                <span>
                  <MailCheck size={15} /> {sequenceTotals.sent.toLocaleString()} sent
                </span>
                <strong>{money(sequenceTotals.netCents)} recovered</strong>
                <small>
                  {outcome?.skipped ?? 0} skipped · {outcome?.failed ?? 0} failed
                </small>
              </div>
            </DashCard>
          );
        })}
      </div>

      <div className="dash-email-lower-grid">
        <DashCard title="Delivery exceptions" className="dash-email-exceptions">
          {(data?.recentSkips?.length ?? 0) === 0 ? (
            <div className="dash-email-clear-state">
              <MailCheck size={22} />
              <div>
                <strong>{isLoading ? "Checking delivery…" : "No delivery exceptions"}</strong>
                <span>Nothing was skipped in this reporting period.</span>
              </div>
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setSkipsOpen((open) => !open)}
                className="dash-email-exception-trigger"
              >
                <span>{data!.recentSkips.length} skipped deliveries</span>
                <strong>{skipsOpen ? "Hide details" : "Review details"}</strong>
              </button>
              {skipsOpen && (
                <div className="dash-email-exception-table">
                  <table>
                    <thead>
                      <tr>
                        <th className="text-left">When</th>
                        <th className="text-left">Email</th>
                        <th className="text-left">Sequence</th>
                        <th className="text-left">Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data!.recentSkips.map((row, index) => (
                        <tr key={`${row.email}-${index}`}>
                          <td>{new Date(row.at).toLocaleDateString()}</td>
                          <td>{row.email}</td>
                          <td>{LABELS[row.sequence]?.title ?? row.sequence}</td>
                          <td>
                            {row.reason}
                            {row.dryRun ? " (dry run)" : ""}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </DashCard>

        <DashCard title="Test email studio" className="dash-email-test-card">
          <div className="dash-email-test-intro">
            <span className="dash-email-test-icon" aria-hidden="true">
              <Send size={20} />
            </span>
            <div>
              <strong>Preview a real template</strong>
              <p>Uses sample products only. Tests are private, unlogged, and excluded from metrics.</p>
            </div>
          </div>
          <div className="dash-email-test-form">
            <label>
              <span>Template</span>
              <Select
                value={testTemplate}
                onValueChange={(value) => setTestTemplate(value as TestTemplateKey)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a template" />
                </SelectTrigger>
                <SelectContent position="popper" sideOffset={6} className="dashboard-select-content">
                  {TEST_TEMPLATE_LABELS.map((template) => (
                    <SelectItem key={template.key} value={template.key}>
                      {template.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            <label>
              <span>Recipient</span>
              <input
                type="email"
                value={testTo}
                onChange={(event) => setTestTo(event.target.value)}
                placeholder="you@address.com"
              />
            </label>
            <button
              type="button"
              onClick={() => setTestMulti((value) => !value)}
              className="dash-email-multi-button"
              aria-pressed={testMulti}
            >
              Multiple items {testMulti ? "on" : "off"}
            </button>
            <button
              type="button"
              disabled={testSend.isPending || !testTo.trim()}
              onClick={() => testSend.mutate()}
              className="btn-primary dash-email-send-button"
            >
              <Send size={14} /> {testSend.isPending ? "Sending…" : "Send test"}
            </button>
          </div>
        </DashCard>
      </div>
    </div>
  );
}

function EmailSummary({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div data-highlight={highlight}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function EmailStepMetric({ label, value }: { label: string; value: string }) {
  return (
    <span className="dash-email-step-metric">
      <small>{label}</small>
      <strong>{value}</strong>
    </span>
  );
}
