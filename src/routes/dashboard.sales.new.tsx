import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { DashboardShell, DashCard } from "@/components/DashboardShell";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/sales/new")({
  head: () => ({ meta: [{ title: "New sale — Plugin Warehouse" }] }),
  component: NewSale,
});
  head: () => ({ meta: [{ title: "New sale — Plugin Warehouse" }] }),
  component: NewSale,
});

function NewSale() {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [pct, setPct] = useState(25);
  const [scope, setScope] = useState<"all" | "selected">("all");

  return (
    <DashboardShell title="New sale">
      <div className="max-w-4xl mx-auto pb-32 space-y-6">
        <DashCard title="Event details">
          <Field label="Event name"><input value={name} onChange={e => { setName(e.target.value); setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g,"-")); }} className="ipt" /></Field>
          <Field label="Slug"><input value={slug} onChange={e => setSlug(e.target.value)} className="ipt" /><div className="text-[10px] text-white/40 mt-1 font-mono">pluginwarehouse.com/sale/{slug || "..."}</div></Field>
          <Field label="Banner headline"><input className="ipt" placeholder="35% OFF. EVERYTHING." /></Field>
          <Field label="Subheadline"><input className="ipt" placeholder="Sun's out. Prices down." /></Field>
        </DashCard>
        <DashCard title="Discount">
          <input
            type="range"
            min={5}
            max={75}
            step={5}
            value={pct}
            onChange={e => setPct(Number(e.target.value))}
            className="glass-slider"
            style={{ ["--val" as any]: `${((pct - 5) / 70) * 100}%` }}
          />
          <div className="flex items-baseline justify-center gap-2 mt-4">
            <span className="font-display text-4xl text-[var(--accent-red-glow)]" style={{ textShadow: "0 0 18px rgba(255,0,60,0.55)" }}>{pct}%</span>
            <span className="text-xs text-white/60 font-mono uppercase tracking-wider">off everything</span>
          </div>
          <div className="text-center text-xs text-white/60 mt-1">Save ${Math.round(99 * pct / 100)} on a $99 plugin</div>
        </DashCard>
        <DashCard title="Schedule">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Start"><input type="datetime-local" className="ipt" /></Field>
            <Field label="End"><input type="datetime-local" className="ipt" /></Field>
          </div>
          <div className="text-[10px] text-white/40 mt-2 font-mono">Time zone: {Intl.DateTimeFormat().resolvedOptions().timeZone}</div>
        </DashCard>
        <DashCard title="Products">
          <div className="flex gap-4">
            {(["all","selected"] as const).map(s => (
              <label key={s} className="flex items-center gap-2 text-sm cursor-pointer"><input type="radio" checked={scope===s} onChange={() => setScope(s)} className="accent-[var(--accent-red)]" />{s === "all" ? "Apply to all products" : "Select specific products"}</label>
            ))}
          </div>
          {scope === "selected" && <input className="ipt mt-3" placeholder="Search products to include..." />}
        </DashCard>
        <DashCard title="Theme">
          <div className="flex gap-2 mb-3">
            {THEMES.map(t => <button key={t.name} onClick={() => setTheme(t.color)} className={`px-3 py-2 rounded-lg text-xs border ${theme === t.color ? "border-white" : "border-white/15"}`} style={{ background: t.color + "22", color: t.color }}>{t.name}</button>)}
          </div>
          <input type="color" value={theme} onChange={e => setTheme(e.target.value)} className="w-16 h-10 rounded border border-white/15 bg-transparent" />
          <div className="mt-4 rounded-xl p-6 text-center" style={{ background: `linear-gradient(135deg, ${theme}33, ${theme}11)`, border: `1px solid ${theme}55` }}>
            <div className="font-display text-3xl" style={{ color: theme }}>{pct}% OFF. EVERYTHING.</div>
            <div className="text-xs mt-1 text-white/60">Banner preview</div>
          </div>
        </DashCard>
        <DashCard title="Preview"><button className="btn-ghost !text-xs !py-2 !px-4">Preview landing page →</button></DashCard>
      </div>
      <div className="fixed bottom-0 left-0 md:left-[220px] right-0 z-30 border-t border-white/10 bg-[#13002C]/95 backdrop-blur-md px-6 py-3 flex items-center gap-3">
        <Link to="/dashboard/sales" className="btn-ghost !text-xs !py-2 !px-4">Cancel</Link>
        <button onClick={() => toast.success("Draft saved.")} className="btn-ghost !text-xs !py-2 !px-4 ml-auto">Save draft</button>
        <button onClick={() => toast.success("Sale scheduled.")} className="btn-primary !text-xs !py-2 !px-6">Schedule sale</button>
      </div>
      <style>{`.ipt{width:100%;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.15);border-radius:8px;padding:0.55rem 0.75rem;font-size:13px;color:#fff;outline:none}.ipt:focus{border-color:var(--accent-red)}`}</style>
    </DashboardShell>
  );
}

function Field({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return <label className="block mb-3"><span className="label-mini text-[10px] opacity-70 mb-1.5 block">{label}</span>{children}</label>;
}
