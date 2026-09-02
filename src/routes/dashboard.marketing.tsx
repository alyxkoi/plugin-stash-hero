import { createFileRoute, useSearch, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence } from "framer-motion";
import {
  ChargedPanel,
  DashboardMetric,
  DashboardShell,
  DashCard,
  DomainChip,
  SegmentedBar,
  StatusBadge,
} from "@/components/DashboardShell";
import {
  Archive,
  ArchiveRestore,
  BadgePercent,
  CircleDollarSign,
  Copy,
  Link2,
  Mail,
  MousePointerClick,
  Pencil,
  Plus,
  Send,
  ShoppingBag,
  TicketCheck,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { DiscountCodeModal, type DiscountRow } from "@/components/dashboard/DiscountCodeModal";
import { CampaignLinksPage } from "./dashboard.campaign-links";
import { EmailAutomationsPanel } from "@/components/dashboard/EmailAutomationsPanel";
import { netRevenue } from "@/lib/revenue";
import {
  getEmailAutomationStats,
  type RangeKey,
} from "@/lib/email-automation-admin.functions";

type MarketingSearch = { tab?: "codes" | "campaign" | "emails" };

export const Route = createFileRoute("/dashboard/marketing")({
  head: () => ({ meta: [{ title: "Marketing — Plugin Warehouse" }] }),
  validateSearch: (s: Record<string, unknown>): MarketingSearch => ({
    tab: s.tab === "campaign" ? "campaign" : s.tab === "emails" ? "emails" : "codes",
  }),

  component: Marketing,
});

function Marketing() {
  const search = useSearch({ from: "/dashboard/marketing" }) as MarketingSearch;
  const navigate = useNavigate();
  const tab = search.tab ?? "codes";
  const [emailRange, setEmailRange] = useState<RangeKey>("mtd");
  const [performanceVersion, setPerformanceVersion] = useState(0);
  const refreshPerformance = useCallback(
    () => setPerformanceVersion((current) => current + 1),
    [],
  );
  const setTab = (t: "codes" | "campaign" | "emails") =>
    navigate({ to: "/dashboard/marketing", search: { tab: t }, replace: true });
  const workspaces = [
    {
      key: "codes",
      label: "Discount codes",
      icon: BadgePercent,
    },
    {
      key: "campaign",
      label: "Campaign links",
      icon: Link2,
    },
    {
      key: "emails",
      label: "Behavioral emails",
      icon: Mail,
    },
  ] as const;

  return (
    <DashboardShell title="Marketing" action={tab === "codes" ? <MarketingCodesAction /> : null}>
      <MarketingHero tab={tab} emailRange={emailRange} refreshVersion={performanceVersion} />

      <nav
        className="dash-marketing-workspaces"
        aria-label="Marketing workspaces"
        data-active-index={workspaces.findIndex((workspace) => workspace.key === tab)}
      >
        {workspaces.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            aria-pressed={tab === key}
            aria-label={label}
            title={label}
            className={tab === key ? "is-active" : ""}
          >
            <span className="dash-marketing-workspace-icon" aria-hidden="true">
              <Icon size={20} strokeWidth={1.7} />
            </span>
            <span className="dash-marketing-workspace-copy">
              <strong>{label}</strong>
            </span>
          </button>
        ))}
      </nav>

      <section className="dash-marketing-content" aria-live="polite">
        {tab === "codes" ? (
          <DiscountCodesPanel onPerformanceChange={refreshPerformance} />
        ) : tab === "campaign" ? (
          <CampaignLinksPage embedded onDataChanged={refreshPerformance} />
        ) : (
          <EmailAutomationsPanel range={emailRange} onRangeChange={setEmailRange} />
        )}
      </section>
    </DashboardShell>
  );
}

type MarketingHeroModel = {
  title: string;
  metrics: { label: string; value: string }[];
  items: { label: string; value: number; valueText: string; detail: string }[];
  empty: string;
};

const MARKETING_METRIC_ICONS = {
  codes: [BadgePercent, TicketCheck, CircleDollarSign],
  campaign: [Link2, MousePointerClick, ShoppingBag],
  emails: [Send, ShoppingBag, CircleDollarSign],
} as const;

function MarketingHero({
  tab,
  emailRange,
  refreshVersion,
}: {
  tab: "codes" | "campaign" | "emails";
  emailRange: RangeKey;
  refreshVersion: number;
}) {
  const emailStats = useServerFn(getEmailAutomationStats);
  const [model, setModel] = useState<MarketingHeroModel | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        let next: MarketingHeroModel;
        if (tab === "codes") {
          const [codesRes, ordersRes] = await Promise.all([
            supabase.from("discount_codes").select("code, name, uses, status"),
            supabase
              .from("orders")
              .select("discount_code, total, status, refunded_amount_cents")
              .not("discount_code", "is", null)
              .limit(5000),
          ]);
          const codes = (codesRes.data ?? []) as {
            code: string;
            name: string | null;
            uses: number;
            status: string;
          }[];
          const activeCodes = codes.filter((code) => code.status === "active");
          const orders = (ordersRes.data ?? []) as {
            discount_code: string | null;
            total: number;
            status: string;
            refunded_amount_cents: number | null;
          }[];
          const allPerformance = activeCodes
            .map((code) => {
              const matched = orders.filter(
                (order) => order.discount_code?.toLowerCase() === code.code.toLowerCase(),
              );
              const revenue = matched.reduce((sum, order) => sum + netRevenue(order), 0);
              return {
                label: code.name?.trim() || code.code,
                value: revenue,
                valueText: money(revenue),
                detail: `${code.uses.toLocaleString()} redemptions`,
              };
            })
            .sort((a, b) => b.value - a.value);
          const performance = allPerformance.slice(0, 4);
          const revenue = allPerformance.reduce((sum, item) => sum + item.value, 0);
          next = {
            title: "Discount performance",
            metrics: [
              {
                label: "Active codes",
                value: activeCodes.length.toLocaleString(),
              },
              {
                label: "Redemptions",
                value: activeCodes
                  .reduce((sum, code) => sum + Number(code.uses || 0), 0)
                  .toLocaleString(),
              },
              { label: "Attributed revenue", value: money(revenue) },
            ],
            items: performance,
            empty: "No discount-code performance yet.",
          };
        } else if (tab === "campaign") {
          const anySupabase = supabase as any;
          const [linksRes, statsRes] = await Promise.all([
            anySupabase.from("campaign_links").select("id,label,archived_at"),
            anySupabase.rpc("admin_campaign_link_stats"),
          ]);
          const links = (linksRes.data ?? []) as {
            id: string;
            label: string;
            archived_at: string | null;
          }[];
          const stats = (statsRes.data ?? []) as {
            link_id: string;
            clicks: number;
            purchases: number;
          }[];
          const statsById = new Map(stats.map((row) => [row.link_id, row]));
          const activeLinks = links.filter((link) => !link.archived_at);
          const activeLinkIds = new Set(activeLinks.map((link) => link.id));
          const activeStats = stats.filter((row) => activeLinkIds.has(row.link_id));
          const performance = activeLinks
            .map((link) => {
              const row = statsById.get(link.id);
              const clicks = Number(row?.clicks || 0);
              const purchases = Number(row?.purchases || 0);
              const conversion = clicks ? (purchases / clicks) * 100 : 0;
              return {
                label: link.label,
                value: clicks,
                valueText: `${clicks.toLocaleString()} clicks`,
                detail: `${purchases.toLocaleString()} purchases · ${conversion.toFixed(1)}% conversion`,
              };
            })
            .sort((a, b) => b.value - a.value)
            .slice(0, 4);
          const clicks = activeStats.reduce((sum, row) => sum + Number(row.clicks || 0), 0);
          const purchases = activeStats.reduce(
            (sum, row) => sum + Number(row.purchases || 0),
            0,
          );
          next = {
            title: "Campaign performance",
            metrics: [
              {
                label: "Active links",
                value: activeLinks.length.toLocaleString(),
              },
              { label: "Tracked clicks", value: clicks.toLocaleString() },
              { label: "Purchases", value: purchases.toLocaleString() },
            ],
            items: performance,
            empty: "No campaign-link performance yet.",
          };
        } else {
          const data = await emailStats({ data: { range: emailRange } });
          const sent = data.steps.reduce((sum, step) => sum + step.sent, 0);
          const sales = data.steps.reduce((sum, step) => sum + step.sales, 0);
          const netCents = data.steps.reduce((sum, step) => sum + step.netCents, 0);
          const performance = data.steps
            .map((step) => ({
              label: `${step.sequence === "abandoned_cart" ? "Cart" : "Saved"} · Step ${step.step}`,
              value: step.sent,
              valueText: `${step.sent.toLocaleString()} sent`,
              detail: `${step.sales.toLocaleString()} sales · ${money(step.netCents / 100)} recovered`,
            }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 4);
          next = {
            title: "Behavioral email performance",
            metrics: [
              { label: "Messages sent", value: sent.toLocaleString() },
              { label: "Recovered sales", value: sales.toLocaleString() },
              { label: "Recovered revenue", value: money(netCents / 100) },
            ],
            items: performance,
            empty: "No behavioral-email performance in this range yet.",
          };
        }
        if (!cancelled) setModel(next);
      } catch (error) {
        console.error("[marketing] hero stats failed", error);
        if (!cancelled) setModel(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [emailRange, emailStats, refreshVersion, tab]);

  const max = Math.max(1, ...(model?.items.map((item) => item.value) ?? []));
  return (
    <ChargedPanel
      domain="promo"
      material="solid"
      silhouette="side"
      title={model?.title ?? "Marketing performance"}
      className="dash-marketing-hero"
    >
      {loading ? (
        <div className="dash-marketing-performance">
          <div className="skeleton-block h-48" />
        </div>
      ) : model && model.items.length > 0 ? (
        <div className="dash-marketing-performance">
          <div className="dash-marketing-metrics">
            {model.metrics.map((metric, index) => (
              <DashboardMetric
                key={metric.label}
                icon={MARKETING_METRIC_ICONS[tab][index] ?? CircleDollarSign}
                label={metric.label}
                value={metric.value}
                className="dash-marketing-metric"
              />
            ))}
          </div>
          <div className="dash-marketing-chart">
            {model.items.map((item, index) => (
              <div key={item.label} className={index === 0 ? "is-leader" : ""}>
                <span>
                  <strong>{item.label}</strong>
                  <small>{item.detail}</small>
                </span>
                <SegmentedBar
                  value={item.value}
                  max={max}
                  label={`${item.label}: ${item.valueText}`}
                  segments={18}
                  tone="indigo"
                />
                <div
                  className="dash-marketing-mobile-bar"
                  role="progressbar"
                  aria-label={`${item.label}: ${item.valueText}`}
                  aria-valuemin={0}
                  aria-valuemax={max}
                  aria-valuenow={Math.max(0, item.value)}
                >
                  <span
                    style={{
                      width: `${Math.max(0, Math.min(100, (item.value / max) * 100))}%`,
                    }}
                  />
                </div>
                <em>{item.valueText}</em>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="dash-empty text-white/75">
          <p>{model?.empty ?? "Performance data is unavailable."}</p>
        </div>
      )}
    </ChargedPanel>
  );
}

// The "Generate code" button is only relevant to the codes tab, and it needs
// access to the panel's open-state. Expose it via a shared handler using a
// custom event so we don't restructure the shell action prop.
function MarketingCodesAction() {
  return (
    <button
      onClick={() => window.dispatchEvent(new CustomEvent("pw:open-discount-modal"))}
      className="btn-primary !text-xs !py-2 !px-4 inline-flex items-center gap-1.5"
    >
      <Plus size={13} /> Generate code
    </button>
  );
}

function DiscountCodesPanel({ onPerformanceChange }: { onPerformanceChange: () => void }) {
  const [genOpen, setGenOpen] = useState(false);
  const [editing, setEditing] = useState<DiscountRow | null>(null);
  const [rows, setRows] = useState<DiscountRow[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [attributedOrders, setAttributedOrders] = useState<
    {
      discount_code: string | null;
      total: number;
      status: string;
      refunded_amount_cents: number | null;
    }[]
  >([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const [codesRes, ordersRes] = await Promise.all([
      supabase
        .from("discount_codes")
        .select(
          "id, name, code, type, value, usage_limit, uses, expires_at, status, applies_to, scope, categories",
        )
        .order("created_at", { ascending: false }),
      supabase
        .from("orders")
        .select("discount_code, total, status, refunded_amount_cents")
        .not("discount_code", "is", null)
        .limit(5000),
    ]);
    if (codesRes.error) toast.error(codesRes.error.message);
    setRows((codesRes.data ?? []) as unknown as DiscountRow[]);
    setAttributedOrders(
      (ordersRes.data ?? []) as {
        discount_code: string | null;
        total: number;
        status: string;
        refunded_amount_cents: number | null;
      }[],
    );
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const onOpen = () => setGenOpen(true);
    window.addEventListener("pw:open-discount-modal", onOpen);
    return () => window.removeEventListener("pw:open-discount-modal", onOpen);
  }, []);

  async function setArchived(code: DiscountRow, archived: boolean) {
    const status = archived ? "archived" : "disabled";
    const { error } = await supabase.from("discount_codes").update({ status }).eq("id", code.id);
    if (error) return toast.error(error.message);
    toast.success(archived ? "Code archived" : "Code restored as disabled");
    setRows((current) =>
      current.map((row) => (row.id === code.id ? { ...row, status } : row)),
    );
    onPerformanceChange();
  }

  const revenueByCode = useMemo(() => {
    const map = new Map<string, number>();
    for (const order of attributedOrders) {
      const code = order.discount_code?.toLowerCase();
      if (!code) continue;
      map.set(code, (map.get(code) ?? 0) + netRevenue(order));
    }
    return map;
  }, [attributedOrders]);
  const visibleRows = rows.filter((code) =>
    showArchived ? code.status === "archived" : code.status !== "archived",
  );

  return (
    <>
      <DashCard
        title="Discount codes"
        className="dash-section-header-solid"
        action={
          <button
            type="button"
            onClick={() => setShowArchived((current) => !current)}
            className="dash-archive-filter"
          >
            {showArchived ? "Show active" : `Archived (${rows.filter((code) => code.status === "archived").length})`}
          </button>
        }
      >
        <div className="dash-desktop-table overflow-x-auto -mx-5 -my-5">
          <table className="min-w-[980px]">
            <thead className="text-[10px] uppercase tracking-wider text-white/40">
              <tr>
                <th className="text-left py-2 px-2">Name / code</th>
                <th className="text-left py-2 px-2">Type</th>
                <th className="text-right py-2 px-2">Value</th>
                <th
                  className="text-right py-2 px-2"
                  title="How many customers have redeemed this code"
                >
                  Uses
                </th>
                <th className="text-right py-2 px-2">Revenue</th>
                <th className="hidden md:table-cell text-left py-2 px-2">Applies to</th>
                <th className="text-left py-2 px-3">Expires</th>
                <th className="hidden md:table-cell text-left py-2 px-2">Status</th>
                <th className="text-right py-2 px-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((c) => (
                <tr key={c.id} className="border-t border-white/5">
                  <td className="py-2 px-2">
                    {c.name && (
                      <div className="text-[12px] text-white truncate max-w-[220px]">{c.name}</div>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(c.code);
                        toast.success("Code copied");
                      }}
                      className="dash-chip !text-[var(--c-promo)]"
                      title="Copy code"
                    >
                      {c.code}
                    </button>
                  </td>
                  <td className="py-2 px-2">
                    <DomainChip domain="promo">{c.type === "percent" ? "%" : "$"}</DomainChip>
                  </td>
                  <td className="py-2 px-2 text-right font-mono text-xs text-[var(--c-money)]">
                    {c.type === "percent" ? `${c.value}%` : `$${c.value}`}
                  </td>
                  <td className="py-2 px-2 text-right font-mono text-xs">
                    <span>
                      {c.uses}
                      {c.usage_limit ? ` / ${c.usage_limit}` : " / ∞"}
                    </span>
                    {c.usage_limit && (
                      <span className="dash-code-progress">
                        <span
                          style={{ width: `${Math.min(100, (c.uses / c.usage_limit) * 100)}%` }}
                        />
                      </span>
                    )}
                  </td>
                  <td className="py-2 px-2 text-right font-mono text-xs text-[var(--c-money)]">
                    {money(revenueByCode.get(c.code.toLowerCase()) ?? 0)}
                  </td>
                  <td className="hidden md:table-cell py-2 px-2 text-[11px] text-white/60">
                    {c.applies_to || "All products"}
                  </td>
                  <td
                    className={`py-2 px-3 text-[10px] font-mono whitespace-nowrap ${expiresSoon(c.expires_at) ? "text-[var(--st-warning)]" : "text-[var(--text-tertiary)]"}`}
                  >
                    {c.expires_at ? new Date(c.expires_at).toLocaleDateString() : "Never"}
                  </td>
                  <td className="hidden md:table-cell py-2 px-2">
                    <StatusBadge status={c.status} />
                  </td>
                  <td className="py-2 px-2 text-right whitespace-nowrap">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(c.code);
                        toast.success("Code copied");
                      }}
                      className="p-1.5 rounded hover:bg-white/10"
                      title="Copy"
                    >
                      <Copy size={13} />
                    </button>
                    {showArchived ? (
                      <button
                        type="button"
                        onClick={() => setArchived(c, false)}
                        className="p-1.5 rounded hover:bg-white/10 text-white/70 hover:text-white"
                        title="Restore as disabled"
                      >
                        <ArchiveRestore size={13} />
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => setEditing(c)}
                          className="p-1.5 rounded hover:bg-white/10 text-white/70 hover:text-white"
                          title="Edit"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setArchived(c, true)}
                          className="p-1.5 rounded hover:bg-white/10 text-white/60 hover:text-white"
                          title="Archive"
                        >
                          <Archive size={13} />
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
              {visibleRows.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-white/40 text-sm">
                    {loading
                      ? "Loading…"
                      : showArchived
                        ? "No archived discount codes."
                        : "No discount codes yet. Generate one to get started."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <ul className="dash-mobile-list dash-discount-mobile-list -mx-4 -my-4">
          {visibleRows.map((code) => (
            <li key={code.id} className="border-b border-[var(--border)] last:border-b-0">
              <div className="dash-discount-mobile-card px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-white">
                      {code.name || "Discount code"}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(code.code);
                        toast.success("Code copied");
                      }}
                      className="dash-chip mt-1 !text-[var(--c-promo)]"
                    >
                      {code.code}
                    </button>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-sm text-[var(--c-money)]">
                      {money(revenueByCode.get(code.code.toLowerCase()) ?? 0)}
                    </div>
                    <StatusBadge status={code.status} />
                  </div>
                </div>
                <div className="dash-discount-mobile-lower">
                  <div className="dash-discount-mobile-meta font-mono text-[10px] text-[var(--text-tertiary)]">
                    <span>
                      <small className="block font-sans uppercase">Value</small>
                      {code.type === "percent" ? `${code.value}%` : `$${code.value}`}
                    </span>
                    <span>
                      <small className="block font-sans uppercase">Uses</small>
                      {code.uses}
                      {code.usage_limit ? ` / ${code.usage_limit}` : " / ∞"}
                    </span>
                    <span className={expiresSoon(code.expires_at) ? "text-[var(--st-warning)]" : ""}>
                      <small className="block font-sans uppercase">Expires</small>
                      {code.expires_at ? new Date(code.expires_at).toLocaleDateString() : "Never"}
                    </span>
                  </div>
                  <div className="dash-discount-mobile-actions">
                    {showArchived ? (
                      <button
                        type="button"
                        onClick={() => setArchived(code, false)}
                        className="dash-icon-button"
                        aria-label={`Restore ${code.code} as disabled`}
                      >
                        <ArchiveRestore size={14} />
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => setEditing(code)}
                          className="dash-icon-button"
                          aria-label={`Edit ${code.code}`}
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setArchived(code, true)}
                          className="dash-icon-button"
                          aria-label={`Archive ${code.code}`}
                        >
                          <Archive size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
        {visibleRows.length === 0 && (
          <div className="dash-mobile-list dash-empty">
            <p>
              {loading
                ? "Loading…"
                : showArchived
                  ? "No archived discount codes."
                  : "No discount codes yet. Generate one to get started."}
            </p>
          </div>
        )}
      </DashCard>

      <AnimatePresence>
        {genOpen && (
          <DiscountCodeModal
            onClose={() => setGenOpen(false)}
            onCreated={(row) => {
              setRows((r) => [row, ...r]);
              setGenOpen(false);
              load();
              onPerformanceChange();
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editing && (
          <DiscountCodeModal
            key={editing.id}
            existing={editing}
            onClose={() => setEditing(null)}
            onCreated={(row) => {
              setRows((r) => r.map((x) => (x.id === row.id ? row : x)));
              setEditing(null);
              load();
              onPerformanceChange();
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
}

function expiresSoon(value: string | null) {
  if (!value) return false;
  const remaining = new Date(value).getTime() - Date.now();
  return remaining > 0 && remaining <= 7 * 86400_000;
}

function money(value: number) {
  return `$${Number(value || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
