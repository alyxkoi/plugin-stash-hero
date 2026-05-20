import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { DashboardShell, DashCard, StatusBadge } from "@/components/DashboardShell";
import { discountCodes, abandonedCarts, campaigns, formatMoney } from "@/lib/dashboard-mock";
import { Copy, Plus, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/marketing")({
  head: () => ({ meta: [{ title: "Marketing — Plugin Warehouse" }] }),
  component: Marketing,
});

function Marketing() {
  const [tab, setTab] = useState<"codes"|"carts"|"campaigns">("codes");
  const [genOpen, setGenOpen] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);

  return (
    <DashboardShell title="Marketing" action={
      tab === "codes" ? <button onClick={() => setGenOpen(true)} className="btn-primary !text-xs !py-2 !px-4 inline-flex items-center gap-1.5"><Plus size={13} /> Generate code</button>
      : tab === "campaigns" ? <button onClick={() => setComposeOpen(true)} className="btn-primary !text-xs !py-2 !px-4 inline-flex items-center gap-1.5"><Plus size={13} /> New campaign</button>
      : null
    }>
      <div className="flex gap-1 p-1 rounded-lg border border-white/10 w-fit mb-5">
        {([["codes","Discount codes"],["carts","Abandoned carts"],["campaigns","Campaigns"]] as const).map(([k,l]) => (
          <button key={k} onClick={() => setTab(k)} className={`px-4 py-1.5 rounded-md text-xs ${tab===k ? "bg-[var(--accent-red)] text-white" : "text-white/60 hover:text-white"}`}>{l}</button>
        ))}
      </div>

      {tab === "codes" && (
        <DashCard>
          <div className="overflow-x-auto -mx-2">
          <table className="w-full text-sm">
            <thead className="text-[10px] uppercase tracking-wider text-white/40"><tr><th className="text-left py-2 px-2">Code</th><th className="text-left py-2 px-2">Type</th><th className="text-right py-2 px-2">Value</th><th className="hidden md:table-cell text-right py-2 px-2">Uses</th><th className="text-left py-2 px-3">Expires</th><th className="hidden md:table-cell text-left py-2 px-2">Status</th><th className="hidden md:table-cell text-right py-2 px-2">Actions</th></tr></thead>
            <tbody>
              {discountCodes.map(c => (
                <tr key={c.id} className="border-t border-white/5">
                  <td className="py-2 px-2 font-mono text-xs text-[var(--accent-red-glow)]">{c.code}</td>
                  <td className="py-2 px-2 text-[10px] font-mono">{c.type === "percent" ? "%" : "$"}</td>
                  <td className="py-2 px-2 text-right font-mono text-xs">{c.type === "percent" ? `${c.value}%` : `$${c.value}`}</td>
                  <td className="hidden md:table-cell py-2 px-2 text-right font-mono text-xs">{c.uses}{c.usageLimit ? ` / ${c.usageLimit}` : ""}</td>
                  <td className="py-2 px-3 text-[10px] font-mono text-white/50 whitespace-nowrap">{c.expiresAt ? new Date(c.expiresAt).toLocaleDateString() : "Never"}</td>
                  <td className="hidden md:table-cell py-2 px-2"><StatusBadge status={c.status} /></td>
                  <td className="hidden md:table-cell py-2 px-2 text-right"><button onClick={() => { navigator.clipboard.writeText(c.code); toast.success("Code copied"); }} className="p-1.5 rounded hover:bg-white/10"><Copy size={13} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </DashCard>
      )}

      {tab === "carts" && (
        <DashCard>
          <div className="overflow-x-auto -mx-2">
          <table className="w-full text-sm">
            <thead className="text-[10px] uppercase tracking-wider text-white/40"><tr><th className="text-left py-2 px-2">Customer</th><th className="hidden md:table-cell text-left py-2 px-2">Items</th><th className="text-right py-2 px-2">Value</th><th className="text-left py-2 px-3">Abandoned</th><th className="hidden md:table-cell text-left py-2 px-2">Reminder</th><th className="hidden md:table-cell text-right py-2 px-2"></th></tr></thead>
            <tbody>
              {abandonedCarts.map(c => (
                <tr key={c.id} className="border-t border-white/5">
                  <td className="py-2 px-2 text-xs"><div className="min-w-0 max-w-[160px] md:max-w-none truncate">{c.isGuest && <span className="text-[10px] text-white/40 mr-1">Guest</span>}{c.customerEmail}</div></td>
                  <td className="hidden md:table-cell py-2 px-2 text-xs text-white/70">{c.items} · {c.itemSummary}</td>
                  <td className="py-2 px-2 text-right font-mono text-xs whitespace-nowrap">{formatMoney(c.cartValue)}</td>
                  <td className="py-2 px-3 text-[10px] font-mono text-white/50 whitespace-nowrap">{c.abandonedHoursAgo < 24 ? `${c.abandonedHoursAgo}h ago` : `${Math.round(c.abandonedHoursAgo/24)}d ago`}</td>
                  <td className="hidden md:table-cell py-2 px-2">{c.reminderSent ? <StatusBadge status="completed" /> : <span className="text-[10px] text-white/40 font-mono uppercase">Not sent</span>}</td>
                  <td className="hidden md:table-cell py-2 px-2 text-right"><button onClick={() => toast.success("Reminder queued")} className="text-xs text-white/60 hover:text-white">Send reminder</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </DashCard>
      )}

      {tab === "campaigns" && (
        <div className="space-y-5">
          <div className="glass-card p-4 flex items-center gap-3">
            <div className="chromatic-edge" />
            <div className="relative z-10 flex items-center gap-3 w-full">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center text-lg" style={{ background: "linear-gradient(135deg, #FFE01B, #FFB800)", color: "#13002C" }}>M</div>
              <div className="flex-1 min-w-0">
                <div className="text-sm">Mailchimp connected</div>
                <div className="text-[11px] text-white/50 font-mono">Open / click / revenue rows below sync from Mailchimp campaign reports. Clicks are tagged with <code>utm_source=mailchimp</code> for attribution in Analytics.</div>
              </div>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-mono uppercase tracking-wider border bg-emerald-500/15 text-emerald-300 border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 pulse-dot" /> Live
              </span>
            </div>
          </div>
          <DashCard>
            <div className="overflow-x-auto -mx-2">
            <table className="w-full text-sm">
              <thead className="text-[10px] uppercase tracking-wider text-white/40"><tr><th className="text-left py-2 px-2">Name</th><th className="hidden md:table-cell text-left py-2 px-3">Sent</th><th className="hidden md:table-cell text-right py-2 px-2">Recipients</th><th className="text-right py-2 px-2">Open</th><th className="hidden md:table-cell text-right py-2 px-2">Click</th><th className="text-right py-2 px-2">Revenue</th></tr></thead>
              <tbody>
                {campaigns.map(c => (
                  <tr key={c.id} className="border-t border-white/5"><td className="py-2 px-2 text-sm"><div className="max-w-[170px] md:max-w-none truncate">{c.name}</div></td><td className="hidden md:table-cell py-2 px-3 text-[10px] font-mono text-white/50">{new Date(c.sentAt).toLocaleDateString()}</td><td className="hidden md:table-cell py-2 px-2 text-right font-mono text-xs">{c.recipients.toLocaleString()}</td><td className="py-2 px-2 text-right font-mono text-xs">{c.openRate}%</td><td className="hidden md:table-cell py-2 px-2 text-right font-mono text-xs">{c.clickRate}%</td><td className="py-2 px-2 text-right font-mono text-xs whitespace-nowrap">{formatMoney(c.revenue)}</td></tr>
                ))}
              </tbody>
            </table>
            </div>
          </DashCard>
        </div>
      )}

      {genOpen && (
        <Modal onClose={() => setGenOpen(false)} title="Generate discount code">
          <div className="space-y-3">
            <label className="block"><span className="label-mini text-[10px] opacity-70 mb-1.5 block">Code</span><div className="flex gap-2"><input className="ipt flex-1" placeholder="WELCOME10" /><button onClick={() => toast.success("Generated")} className="btn-ghost !text-xs !py-2 !px-3">Auto-generate</button></div></label>
            <label className="block"><span className="label-mini text-[10px] opacity-70 mb-1.5 block">Type</span><div className="flex gap-3 text-sm"><label className="flex items-center gap-2"><input type="radio" name="dt" defaultChecked className="accent-[var(--accent-red)]" />Percentage</label><label className="flex items-center gap-2"><input type="radio" name="dt" className="accent-[var(--accent-red)]" />Flat amount</label></div></label>
            <label className="block"><span className="label-mini text-[10px] opacity-70 mb-1.5 block">Value</span><input type="number" className="ipt" /></label>
            <label className="block"><span className="label-mini text-[10px] opacity-70 mb-1.5 block">Usage limit (optional)</span><input type="number" className="ipt" /></label>
            <label className="block"><span className="label-mini text-[10px] opacity-70 mb-1.5 block">Expiry (optional)</span><input type="date" className="ipt" /></label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-[var(--accent-red)]" /> One-time per customer</label>
            <div className="flex gap-2 justify-end pt-3"><button onClick={() => setGenOpen(false)} className="btn-ghost !text-xs !py-2 !px-4">Cancel</button><button onClick={() => { toast.success("Code created"); setGenOpen(false); }} className="btn-primary !text-xs !py-2 !px-4">Create</button></div>
          </div>
        </Modal>
      )}
      {composeOpen && (
        <Modal onClose={() => setComposeOpen(false)} title="New campaign">
          <div className="space-y-3">
            <label className="block"><span className="label-mini text-[10px] opacity-70 mb-1.5 block">Name</span><input className="ipt" /></label>
            <label className="block"><span className="label-mini text-[10px] opacity-70 mb-1.5 block">Segment</span><select className="ipt"><option className="bg-[#1F0540]">All customers</option><option className="bg-[#1F0540]">Recent buyers (30d)</option><option className="bg-[#1F0540]">Repeat customers</option><option className="bg-[#1F0540]">Abandoned cart recovery</option></select></label>
            <label className="block"><span className="label-mini text-[10px] opacity-70 mb-1.5 block">Subject</span><input className="ipt" /></label>
            <label className="block"><span className="label-mini text-[10px] opacity-70 mb-1.5 block">Body</span><textarea rows={5} className="ipt resize-none" /></label>
            <div className="flex gap-2 justify-end pt-3"><button onClick={() => setComposeOpen(false)} className="btn-ghost !text-xs !py-2 !px-4">Cancel</button><button onClick={() => { toast.success("Scheduled"); setComposeOpen(false); }} className="btn-ghost !text-xs !py-2 !px-4">Schedule</button><button onClick={() => { toast.success("Sent"); setComposeOpen(false); }} className="btn-primary !text-xs !py-2 !px-4">Send now</button></div>
          </div>
        </Modal>
      )}
      <style>{`.ipt{width:100%;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.15);border-radius:8px;padding:0.55rem 0.75rem;font-size:13px;color:#fff;outline:none}.ipt:focus{border-color:var(--accent-red)}`}</style>
    </DashboardShell>
  );
}

function Modal({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title: string }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={onClose}>
      <div className="glass-card p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="chromatic-edge" />
        <div className="relative z-10">
          <div className="flex justify-between items-center mb-4"><h3 className="font-display text-lg">{title}</h3><button onClick={onClose}><X size={16} /></button></div>
          {children}
        </div>
      </div>
    </div>
  );
}
