import { createFileRoute, useSearch, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence } from "framer-motion";
import {
  ChargedPanel,
  DashboardShell,
  DashCard,
  DomainChip,
  StatusBadge,
} from "@/components/DashboardShell";
import { ArrowUpRight, BadgePercent, Copy, Link2, Mail, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { DiscountCodeModal, type DiscountRow } from "@/components/dashboard/DiscountCodeModal";
import { CampaignLinksPage } from "./dashboard.campaign-links";
import { EmailAutomationsPanel } from "@/components/dashboard/EmailAutomationsPanel";
import { netRevenue } from "@/lib/revenue";

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
  const setTab = (t: "codes" | "campaign" | "emails") =>
    navigate({ to: "/dashboard/marketing", search: { tab: t }, replace: true });
  const workspaces = [
    {
      key: "codes",
      label: "Discount codes",
      description: "Create offers and measure attributed revenue.",
      icon: BadgePercent,
    },
    {
      key: "campaign",
      label: "Campaign links",
      description: "Build trackable links and compare channel results.",
      icon: Link2,
    },
    {
      key: "emails",
      label: "Behavioral emails",
      description: "Run cart and saved-item recovery workflows.",
      icon: Mail,
    },
  ] as const;

  return (
    <DashboardShell title="Marketing" action={tab === "codes" ? <MarketingCodesAction /> : null}>
      <MarketingHero />

      <nav className="dash-marketing-workspaces" aria-label="Marketing workspaces">
        {workspaces.map(({ key, label, description, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            aria-pressed={tab === key}
            className={tab === key ? "is-active" : ""}
          >
            <span className="dash-marketing-workspace-icon" aria-hidden="true">
              <Icon size={20} strokeWidth={1.7} />
            </span>
            <span className="dash-marketing-workspace-copy">
              <strong>{label}</strong>
              <small>{description}</small>
            </span>
            <ArrowUpRight size={17} strokeWidth={1.7} aria-hidden="true" />
          </button>
        ))}
      </nav>

      <section className="dash-marketing-content" aria-live="polite">
        {tab === "codes" ? (
          <DiscountCodesPanel />
        ) : tab === "campaign" ? (
          <CampaignLinksPage embedded />
        ) : (
          <EmailAutomationsPanel />
        )}
      </section>
    </DashboardShell>
  );
}

function MarketingHero() {
  const [codes, setCodes] = useState<{ code: string; name: string | null; uses: number }[]>([]);
  const [orders, setOrders] = useState<
    {
      discount_code: string | null;
      total: number;
      status: string;
      refunded_amount_cents: number | null;
    }[]
  >([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [codesRes, ordersRes] = await Promise.all([
        supabase.from("discount_codes").select("code, name, uses"),
        supabase
          .from("orders")
          .select("discount_code, total, status, refunded_amount_cents")
          .not("discount_code", "is", null)
          .limit(5000),
      ]);
      if (cancelled) return;
      setCodes((codesRes.data ?? []) as { code: string; name: string | null; uses: number }[]);
      setOrders(
        (ordersRes.data ?? []) as {
          discount_code: string | null;
          total: number;
          status: string;
          refunded_amount_cents: number | null;
        }[],
      );
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const best = useMemo(
    () =>
      codes
        .map((code) => {
          const matched = orders.filter(
            (order) => order.discount_code?.toLowerCase() === code.code.toLowerCase(),
          );
          return { ...code, revenue: matched.reduce((sum, order) => sum + netRevenue(order), 0) };
        })
        .sort((a, b) => b.revenue - a.revenue || b.uses - a.uses)[0],
    [codes, orders],
  );

  return (
    <ChargedPanel
      domain="promo"
      material="solid"
      silhouette="side"
      title="Top-performing code"
      className="dash-marketing-hero"
    >
      {best ? (
        <div className="dash-marketing-hero-body">
          <div>
            <span>{best.name || "Discount code"}</span>
            <strong>{best.code}</strong>
          </div>
          <div>
            <span>Uses</span>
            <strong>{best.uses.toLocaleString()}</strong>
          </div>
          <div>
            <span>Revenue attributed</span>
            <strong>{money(best.revenue)}</strong>
          </div>
        </div>
      ) : (
        <div className="dash-empty text-white/75">
          <p>No code performance yet. Generate a code to start measuring attributed revenue.</p>
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

function DiscountCodesPanel() {
  const [genOpen, setGenOpen] = useState(false);
  const [editing, setEditing] = useState<DiscountRow | null>(null);
  const [rows, setRows] = useState<DiscountRow[]>([]);
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

  async function remove(id: string) {
    if (!confirm("Delete this discount code?")) return;
    const { error } = await supabase.from("discount_codes").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Code deleted");
    setRows((r) => r.filter((x) => x.id !== id));
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

  return (
    <>
      <DashCard title="Discount codes">
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
              {rows.map((c) => (
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
                    <button
                      onClick={() => setEditing(c)}
                      className="p-1.5 rounded hover:bg-white/10 text-white/70 hover:text-white"
                      title="Edit"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={() => remove(c.id)}
                      className="p-1.5 rounded hover:bg-white/10 text-white/60 hover:text-[var(--accent-red-glow)]"
                      title="Delete"
                    >
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-white/40 text-sm">
                    {loading ? "Loading…" : "No discount codes yet. Generate one to get started."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <ul className="dash-mobile-list -mx-4 -my-4">
          {rows.map((code) => (
            <li key={code.id} className="border-b border-[var(--border)] last:border-b-0">
              <div className="px-4 py-3">
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
                <div className="mt-3 grid grid-cols-3 gap-2 font-mono text-[10px] text-[var(--text-tertiary)]">
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
                <div className="mt-2 flex justify-end gap-1">
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
                    onClick={() => remove(code.id)}
                    className="dash-icon-button is-danger"
                    aria-label={`Delete ${code.code}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </DashCard>

      <AnimatePresence>
        {genOpen && (
          <DiscountCodeModal
            onClose={() => setGenOpen(false)}
            onCreated={(row) => {
              setRows((r) => [row, ...r]);
              setGenOpen(false);
              load();
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
