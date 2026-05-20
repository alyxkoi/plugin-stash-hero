import { createFileRoute } from "@tanstack/react-router";
import { DashboardShell, DashCard } from "@/components/DashboardShell";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/settings")({
  head: () => ({ meta: [{ title: "Settings — Plugin Warehouse" }] }),
  component: Settings,
});

function Settings() {
  return (
    <DashboardShell title="Settings">
      <div className="max-w-4xl mx-auto space-y-6">
        <DashCard title="Store info">
          <Field label="Store name"><input defaultValue="Plugin Warehouse" className="ipt" /></Field>
          <Field label="Contact email"><input defaultValue="hello@pluginwarehouse.com" className="ipt" /></Field>
          <Field label="Support email"><input defaultValue="support@pluginwarehouse.com" className="ipt" /></Field>
          <Field label="Logo"><input type="file" accept="image/*" className="text-xs" /></Field>
        </DashCard>

        <DashCard title="Stripe">
          <div className="flex items-center justify-between mb-3"><Badge color="emerald">Connected to live mode</Badge></div>
          <div className="text-xs font-mono text-white/60">acct_••••8h9F2D</div>
          <a href="#" className="text-xs text-[var(--accent-red-glow)] hover:underline mt-2 inline-block">Open Stripe dashboard →</a>
          <div className="mt-3 text-[11px] text-white/50">Webhook: <Badge color="emerald">healthy</Badge></div>
        </DashCard>

        <DashCard title="Cloudflare R2">
          <div className="mb-3"><Badge color="emerald">Connected</Badge></div>
          <div className="text-xs font-mono text-white/60 mb-3">bucket: plugin-warehouse-prod</div>
          <div className="mb-2 flex items-center justify-between text-xs"><span>Storage used</span><span className="font-mono">142 GB / 500 GB</span></div>
          <div className="h-2 bg-white/10 rounded overflow-hidden mb-3"><div className="h-full bg-gradient-to-r from-[var(--accent-red)] to-[var(--accent-blue)]" style={{ width: "28%" }} /></div>
          <div className="grid grid-cols-3 gap-3 text-xs">
            <Stat label="Files" v="284" />
            <Stat label="Total" v="142 GB" />
            <Stat label="Avg" v="510 MB" />
          </div>
          <button className="btn-ghost !text-xs !py-2 !px-4 mt-3">View all files</button>
        </DashCard>

        <DashCard title="OpenAI">
          <Badge color="emerald">Connected</Badge>
          <button onClick={() => toast.success("Test ran successfully")} className="btn-ghost !text-xs !py-2 !px-4 ml-3">Test description generation</button>
        </DashCard>

        <DashCard title="Mailchimp">
          <Badge color="emerald">Connected</Badge>
          <div className="text-xs font-mono text-white/60 mt-2">Audience: aud_5f3a82</div>
          <button className="btn-ghost !text-xs !py-2 !px-4 mt-3">Disconnect</button>
        </DashCard>

        <DashCard title="Admin account">
          <Field label="Email"><input defaultValue="admin@pluginwarehouse.com" className="ipt" /></Field>
          <Field label="Change password"><input type="password" className="ipt" /></Field>
          <label className="flex items-center gap-2 text-sm mt-3"><input type="checkbox" className="accent-[var(--accent-red)]" /> Two-factor authentication</label>
          <div className="mt-4 pt-4 border-t border-white/10">
            <div className="text-xs text-white/60 mb-2">Active sessions</div>
            <ul className="space-y-2 text-xs">
              <li className="flex justify-between bg-white/5 rounded px-3 py-2"><span>MacBook Pro · Brooklyn, NY · current</span><button className="text-white/40 hover:text-white">Sign out</button></li>
              <li className="flex justify-between bg-white/5 rounded px-3 py-2"><span>iPhone · 2d ago</span><button className="text-white/40 hover:text-white">Sign out</button></li>
            </ul>
          </div>
          <div className="mt-4 pt-4 border-t border-white/10">
            <div className="text-xs text-white/60 mb-2">Add another admin</div>
            <div className="flex gap-2"><input placeholder="email@example.com" className="ipt" /><button className="btn-ghost !text-xs !py-2 !px-4">Invite</button></div>
          </div>
        </DashCard>

        <div className="glass-card p-5 border !border-[var(--accent-red)]/40">
          <div className="chromatic-edge" />
          <div className="relative z-10">
            <h3 className="font-display text-base text-[var(--accent-red-glow)] mb-3">Danger zone</h3>
            <label className="flex items-center gap-2 text-sm mb-3"><input type="checkbox" className="accent-[var(--accent-red)]" /> Maintenance mode</label>
            <div className="flex gap-2 flex-wrap"><button className="btn-ghost !text-xs !py-2 !px-4">Export all data</button><button className="btn-ghost !text-xs !py-2 !px-4">Delete all draft products</button></div>
          </div>
        </div>
      </div>
      <style>{`.ipt{width:100%;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.15);border-radius:8px;padding:0.55rem 0.75rem;font-size:13px;color:#fff;outline:none}.ipt:focus{border-color:var(--accent-red)}`}</style>
    </DashboardShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block mb-3"><span className="label-mini text-[10px] opacity-70 mb-1.5 block">{label}</span>{children}</label>;
}
function Badge({ color, children }: { color: "emerald"|"amber"|"red"; children: React.ReactNode }) {
  const map = { emerald: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30", amber: "bg-amber-500/15 text-amber-300 border-amber-500/30", red: "bg-[var(--accent-red)]/15 text-[var(--accent-red-glow)] border-[var(--accent-red)]/30" };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono uppercase tracking-wider border ${map[color]}`}>{children}</span>;
}
function Stat({ label, v }: { label: string; v: string }) {
  return <div className="bg-white/5 rounded px-3 py-2"><div className="text-[10px] text-white/40 uppercase">{label}</div><div className="font-mono text-sm">{v}</div></div>;
}
