import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { DashboardShell, DashCard, StatusBadge } from "@/components/DashboardShell";
import { Copy, Plus, X, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/dashboard/marketing")({
  head: () => ({ meta: [{ title: "Marketing — Plugin Warehouse" }] }),
  component: Marketing,
});

type DiscountRow = {
  id: string;
  code: string;
  type: "percent" | "flat";
  value: number;
  usage_limit: number | null;
  uses: number;
  expires_at: string | null;
  status: "active" | "expired" | "disabled";
  applies_to: string | null;
};

function Marketing() {
  const [genOpen, setGenOpen] = useState(false);
  const [rows, setRows] = useState<DiscountRow[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const { data, error } = await supabase
      .from("discount_codes")
      .select("id, code, type, value, usage_limit, uses, expires_at, status, applies_to")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setRows((data ?? []) as DiscountRow[]);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function remove(id: string) {
    if (!confirm("Delete this discount code?")) return;
    const { error } = await supabase.from("discount_codes").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Code deleted");
    setRows(r => r.filter(x => x.id !== id));
  }

  return (
    <DashboardShell title="Marketing" action={
      <button onClick={() => setGenOpen(true)} className="btn-primary !text-xs !py-2 !px-4 inline-flex items-center gap-1.5"><Plus size={13} /> Generate code</button>
    }>
      <DashCard title="Discount codes">
        <div className="overflow-x-auto -mx-2">
        <table className="w-full text-sm">
          <thead className="text-[10px] uppercase tracking-wider text-white/40">
            <tr>
              <th className="text-left py-2 px-2">Code</th>
              <th className="text-left py-2 px-2">Type</th>
              <th className="text-right py-2 px-2">Value</th>
              <th className="text-right py-2 px-2">Uses</th>
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
                <td className="py-2 px-2 text-right font-mono text-xs" title="Times customers have redeemed this code">
                  {c.uses}{c.usage_limit ? ` / ${c.usage_limit}` : ""}
                </td>
                <td className="py-2 px-3 text-[10px] font-mono text-white/50 whitespace-nowrap">{c.expires_at ? new Date(c.expires_at).toLocaleDateString() : "Never"}</td>
                <td className="hidden md:table-cell py-2 px-2"><StatusBadge status={c.status} /></td>
                <td className="py-2 px-2 text-right whitespace-nowrap">
                  <button onClick={() => { navigator.clipboard.writeText(c.code); toast.success("Code copied"); }} className="p-1.5 rounded hover:bg-white/10" title="Copy"><Copy size={13} /></button>
                  <button onClick={() => remove(c.id)} className="p-1.5 rounded hover:bg-white/10 text-white/60 hover:text-[var(--accent-red-glow)]" title="Delete"><Trash2 size={13} /></button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={7} className="py-12 text-center text-white/40 text-sm">{loading ? "Loading…" : "No discount codes yet. Generate one to get started."}</td></tr>
            )}
          </tbody>
        </table>
        </div>
      </DashCard>

      <AnimatePresence>
        {genOpen && <GenerateModal onClose={() => setGenOpen(false)} onCreated={row => { setRows(r => [row, ...r]); setGenOpen(false); }} />}
      </AnimatePresence>
      <style>{`.ipt{width:100%;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.15);border-radius:8px;padding:0.55rem 0.75rem;font-size:13px;color:#fff;outline:none}.ipt:focus{border-color:var(--accent-red)}`}</style>
    </DashboardShell>
  );
}

function GenerateModal({ onClose, onCreated }: { onClose: () => void; onCreated: (r: DiscountRow) => void }) {
  const reduce = useReducedMotion();
  const [code, setCode] = useState("");
  const [type, setType] = useState<"percent" | "flat">("percent");
  const [value, setValue] = useState("");
  const [usageLimit, setUsageLimit] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [saving, setSaving] = useState(false);

  function autoGen() {
    const s = Math.random().toString(36).slice(2, 8).toUpperCase();
    setCode(s);
  }

  async function save() {
    const trimmed = code.trim().toUpperCase();
    const val = parseFloat(value);
    if (!trimmed) return toast.error("Enter a code");
    if (!val || val <= 0) return toast.error("Enter a value");
    setSaving(true);
    const payload: any = {
      code: trimmed,
      type,
      value: val,
      usage_limit: usageLimit ? parseInt(usageLimit, 10) : null,
      expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
      status: "active",
      applies_to: "all",
    };
    const { data, error } = await supabase.from("discount_codes").insert(payload).select("id, code, type, value, usage_limit, uses, expires_at, status, applies_to").single();
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Code created");
    onCreated(data as DiscountRow);
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
      initial={reduce ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduce ? 0 : 0.26, ease: [0.19, 1, 0.22, 1] }}
    >
      <motion.div className="absolute inset-0 bg-black/70" />
      <motion.div
        className="relative glass-card p-6 w-full max-w-md"
        onClick={e => e.stopPropagation()}
        initial={reduce ? false : { opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 8 }}
        transition={{ duration: reduce ? 0 : 0.2, ease: [0.19, 1, 0.22, 1] }}
      >
        <div className="chromatic-edge" />
        <div className="relative z-10 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-display text-lg">Generate discount code</h3>
            <button onClick={onClose}><X size={16} /></button>
          </div>

          <label className="block">
            <span className="label-mini text-[10px] opacity-70 mb-1.5 block">Code</span>
            <div className="flex gap-2">
              <input value={code} onChange={e => setCode(e.target.value.toUpperCase())} className="ipt flex-1 font-mono" placeholder="WELCOME10" />
              <button type="button" onClick={autoGen} className="btn-ghost !text-xs !py-2 !px-3 shrink-0">Auto</button>
            </div>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="label-mini text-[10px] opacity-70 mb-1.5 block">Type</span>
              <select value={type} onChange={e => setType(e.target.value as any)} className="ipt">
                <option className="bg-[#1F0540]" value="percent">Percentage</option>
                <option className="bg-[#1F0540]" value="flat">Flat amount</option>
              </select>
            </label>
            <label className="block">
              <span className="label-mini text-[10px] opacity-70 mb-1.5 block">Value {type === "percent" ? "(%)" : "($)"}</span>
              <input type="number" min="0" step="any" value={value} onChange={e => setValue(e.target.value)} className="ipt" />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="label-mini text-[10px] opacity-70 mb-1.5 block">Usage limit (optional)</span>
              <input type="number" min="1" value={usageLimit} onChange={e => setUsageLimit(e.target.value)} className="ipt" placeholder="Unlimited" />
            </label>
            <label className="block">
              <span className="label-mini text-[10px] opacity-70 mb-1.5 block">Expires (optional)</span>
              <input type="date" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} className="ipt" />
            </label>
          </div>

          <div className="flex gap-2 justify-end pt-2 border-t border-white/10">
            <button onClick={onClose} className="btn-ghost !text-xs !py-2 !px-4">Cancel</button>
            <button onClick={save} disabled={saving} className="btn-primary !text-xs !py-2 !px-4">{saving ? "Creating…" : "Create"}</button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
