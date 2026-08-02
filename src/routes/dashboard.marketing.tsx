import { createFileRoute, useSearch, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { DashboardShell, DashCard, StatusBadge } from "@/components/DashboardShell";
import { Copy, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { DiscountCodeModal, type DiscountRow } from "@/components/dashboard/DiscountCodeModal";
import { CampaignLinksPage } from "./dashboard.campaign-links";

type MarketingSearch = { tab?: "codes" | "campaign" };

export const Route = createFileRoute("/dashboard/marketing")({
  head: () => ({ meta: [{ title: "Marketing — Plugin Warehouse" }] }),
  validateSearch: (s: Record<string, unknown>): MarketingSearch => ({
    tab: s.tab === "campaign" ? "campaign" : "codes",
  }),
  component: Marketing,
});

function Marketing() {
  const search = useSearch({ from: "/dashboard/marketing" }) as MarketingSearch;
  const navigate = useNavigate();
  const tab = search.tab ?? "codes";
  const setTab = (t: "codes" | "campaign") =>
    navigate({ to: "/dashboard/marketing", search: { tab: t }, replace: true });

  return (
    <DashboardShell
      title="Marketing"
      action={
        tab === "codes" ? (
          <MarketingCodesAction />
        ) : null
      }
    >
      <div className="mb-5 flex gap-1 p-1 rounded-lg border border-white/10 bg-white/5 w-full sm:w-auto sm:inline-flex">
        {([
          ["codes", "Discount Codes"],
          ["campaign", "Campaign Links"],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-md text-[11px] font-mono uppercase tracking-wider transition-colors ${
              tab === key
                ? "bg-[var(--accent-red)] text-white shadow-[0_0_18px_rgba(255,0,60,0.35)]"
                : "text-white/60 hover:text-white"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "codes" ? <DiscountCodesPanel /> : <CampaignLinksPage embedded />}
    </DashboardShell>
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
  const [loading, setLoading] = useState(true);

  async function load() {
    const { data, error } = await supabase
      .from("discount_codes")
      .select("id, code, type, value, usage_limit, uses, expires_at, status, applies_to, scope, categories")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setRows((data ?? []) as unknown as DiscountRow[]);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

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
    setRows(r => r.filter(x => x.id !== id));
  }

  return (
    <>
      <DashCard title="Discount codes">
        <div className="overflow-x-auto -mx-2">
        <table className="w-full text-sm">
          <thead className="text-[10px] uppercase tracking-wider text-white/40">
            <tr>
              <th className="text-left py-2 px-2">Code</th>
              <th className="text-left py-2 px-2">Type</th>
              <th className="text-right py-2 px-2">Value</th>
              <th className="text-right py-2 px-2" title="How many customers have redeemed this code">Uses</th>
              <th className="hidden md:table-cell text-left py-2 px-2">Applies to</th>
              <th className="text-left py-2 px-3">Expires</th>
              <th className="hidden md:table-cell text-left py-2 px-2">Status</th>
              <th className="text-right py-2 px-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(c => (
              <tr key={c.id} className="border-t border-white/5">
                <td className="py-2 px-2 font-mono text-xs text-[var(--accent-red-glow)]">{c.code}</td>
                <td className="py-2 px-2 text-[10px] font-mono">{c.type === "percent" ? "%" : "$"}</td>
                <td className="py-2 px-2 text-right font-mono text-xs">{c.type === "percent" ? `${c.value}%` : `$${c.value}`}</td>
                <td className="py-2 px-2 text-right font-mono text-xs">
                  {c.uses}{c.usage_limit ? ` / ${c.usage_limit}` : ""}
                </td>
                <td className="hidden md:table-cell py-2 px-2 text-[11px] text-white/60">{c.applies_to || "All products"}</td>
                <td className="py-2 px-3 text-[10px] font-mono text-white/50 whitespace-nowrap">{c.expires_at ? new Date(c.expires_at).toLocaleDateString() : "Never"}</td>
                <td className="hidden md:table-cell py-2 px-2"><StatusBadge status={c.status} /></td>
                <td className="py-2 px-2 text-right whitespace-nowrap">
                  <button onClick={() => { navigator.clipboard.writeText(c.code); toast.success("Code copied"); }} className="p-1.5 rounded hover:bg-white/10" title="Copy"><Copy size={13} /></button>
                  <button onClick={() => setEditing(c)} className="p-1.5 rounded hover:bg-white/10 text-white/70 hover:text-white" title="Edit"><Pencil size={13} /></button>
                  <button onClick={() => remove(c.id)} className="p-1.5 rounded hover:bg-white/10 text-white/60 hover:text-[var(--accent-red-glow)]" title="Delete"><Trash2 size={13} /></button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={8} className="py-12 text-center text-white/40 text-sm">{loading ? "Loading…" : "No discount codes yet. Generate one to get started."}</td></tr>
            )}
          </tbody>
        </table>
        </div>
      </DashCard>

      <AnimatePresence>
        {genOpen && (
          <DiscountCodeModal
            onClose={() => setGenOpen(false)}
            onCreated={row => { setRows(r => [row, ...r]); setGenOpen(false); }}
          />
        )}
      </AnimatePresence>
    </>
  );
}
