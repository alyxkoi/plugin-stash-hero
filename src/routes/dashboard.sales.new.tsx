import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { DashboardShell, DashCard } from "@/components/DashboardShell";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/sales/new")({
  head: () => ({ meta: [{ title: "New sale — Plugin Warehouse" }] }),
  component: NewSale,
});

const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

const DRAFT_KEY = "pw_sale_new_draft_v1";
type Draft = {
  name: string; slug: string; headline: string; subheadline: string;
  pct: number; scope: "all" | "selected"; startAt: string; endAt: string; themeColor: string;
};
const EMPTY: Draft = { name: "", slug: "", headline: "", subheadline: "", pct: 25, scope: "all", startAt: "", endAt: "", themeColor: "#ff003c" };

function loadDraft(): Draft {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return EMPTY;
    return { ...EMPTY, ...(JSON.parse(raw) as Partial<Draft>) };
  } catch { return EMPTY; }
}

function NewSale() {
  const navigate = useNavigate();
  const initial = useRef<Draft>(loadDraft());
  const [name, setName] = useState(initial.current.name);
  const [slug, setSlug] = useState(initial.current.slug);
  const [headline, setHeadline] = useState(initial.current.headline);
  const [subheadline, setSubheadline] = useState(initial.current.subheadline);
  const [pct, setPct] = useState(initial.current.pct);
  const [scope, setScope] = useState<"all" | "selected">(initial.current.scope);
  const [startAt, setStartAt] = useState(initial.current.startAt);
  const [endAt, setEndAt] = useState(initial.current.endAt);
  const [themeColor, setThemeColor] = useState(initial.current.themeColor);
  const [saving, setSaving] = useState(false);

  // Persist draft on every change so switching tabs / minimizing doesn't lose input.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const draft: Draft = { name, slug, headline, subheadline, pct, scope, startAt, endAt, themeColor };
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(draft)); } catch { /* noop */ }
  }, [name, slug, headline, subheadline, pct, scope, startAt, endAt, themeColor]);

  function clearDraft() {
    if (typeof window !== "undefined") {
      try { localStorage.removeItem(DRAFT_KEY); } catch { /* noop */ }
    }
  }



  async function save(status: "scheduled" | "draft") {
    if (saving) return;
    if (!name.trim()) { toast.error("Give the sale a name."); return; }
    if (!slug.trim()) { toast.error("Slug is required."); return; }
    if (status === "scheduled") {
      if (!startAt || !endAt) { toast.error("Start and end dates are required to schedule."); return; }
      if (new Date(endAt) <= new Date(startAt)) { toast.error("End must be after start."); return; }
    }
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const { error } = await supabase.from("sale_events").insert({
        name: name.trim(),
        slug: slug.trim(),
        headline: headline || null,
        subheadline: subheadline || null,
        discount_pct: pct,
        scope,
        theme_color: themeColor,
        start_at: startAt ? new Date(startAt).toISOString() : now,
        end_at: endAt ? new Date(endAt).toISOString() : now,
        status,
      });
      if (error) throw error;
      clearDraft();
      toast.success(status === "scheduled" ? "Sale scheduled." : "Draft saved.");
      navigate({ to: "/dashboard/sales" });
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't save the sale.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <DashboardShell title="New sale">
      <div className="max-w-4xl mx-auto pb-32 space-y-6">
        <DashCard title="Event details">
          <Field label="Event name"><input value={name} onChange={e => { setName(e.target.value); if (!slug || slug === slugify(name)) setSlug(slugify(e.target.value)); }} className="ipt" /></Field>
          <Field label="Slug"><input value={slug} onChange={e => setSlug(slugify(e.target.value))} className="ipt" /><div className="text-[10px] text-white/40 mt-1 font-mono">pluginwarehouse.com/sale/{slug || "..."}</div></Field>
          <Field label="Banner headline"><input value={headline} onChange={e => setHeadline(e.target.value)} className="ipt" placeholder="35% OFF. EVERYTHING." /></Field>
          <Field label="Subheadline"><input value={subheadline} onChange={e => setSubheadline(e.target.value)} className="ipt" placeholder="Sun's out. Prices down." /></Field>
          <Field label="Theme color">
            <div className="flex items-center gap-2">
              <input type="color" value={themeColor} onChange={e => setThemeColor(e.target.value)} className="h-9 w-14 rounded border border-white/15 bg-transparent" />
              <input value={themeColor} onChange={e => setThemeColor(e.target.value)} className="ipt !w-32" />
            </div>
          </Field>
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
            style={{ "--val": `${((pct - 5) / 70) * 100}%` } as React.CSSProperties}
          />
          <div className="flex items-baseline justify-center gap-2 mt-4">
            <span className="font-display text-4xl text-[var(--accent-red-glow)]" style={{ textShadow: "0 0 18px rgba(255,0,60,0.55)" }}>{pct}%</span>
            <span className="text-xs text-white/60 font-mono uppercase tracking-wider">off everything</span>
          </div>
          <div className="text-center text-xs text-white/60 mt-1">Save ${Math.round(99 * pct / 100)} on a $99 plugin</div>
        </DashCard>
        <DashCard title="Schedule">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Start"><input type="datetime-local" value={startAt} onChange={e => setStartAt(e.target.value)} className="ipt" /></Field>
            <Field label="End"><input type="datetime-local" value={endAt} onChange={e => setEndAt(e.target.value)} className="ipt" /></Field>
          </div>
          <div className="text-[10px] text-white/40 mt-2 font-mono">Time zone: {Intl.DateTimeFormat().resolvedOptions().timeZone}</div>
        </DashCard>
        <DashCard title="Products">
          <div className="flex gap-4">
            {(["all","selected"] as const).map(s => (
              <label key={s} className="flex items-center gap-2 text-sm cursor-pointer"><input type="radio" checked={scope===s} onChange={() => setScope(s)} className="accent-[var(--accent-red)]" />{s === "all" ? "Apply to all products" : "Select specific products"}</label>
            ))}
          </div>
          {scope === "selected" && <div className="mt-3 text-xs text-white/50">Per-product selection isn't wired yet — the sale will apply to no products until you edit it after creation. Use "Apply to all" for now.</div>}
        </DashCard>
      </div>
      <div className="fixed bottom-0 left-0 md:left-[220px] right-0 z-30 border-t border-white/10 bg-[#13002C]/95 backdrop-blur-md px-6 py-3 flex items-center gap-3">
        <Link to="/dashboard/sales" onClick={clearDraft} className="btn-ghost !text-xs !py-2 !px-4">Cancel</Link>
        <span className="text-[10px] text-white/40 font-mono ml-2 hidden md:inline">Draft auto-saved locally</span>
        <button disabled={saving} onClick={() => save("draft")} className="btn-ghost !text-xs !py-2 !px-4 ml-auto disabled:opacity-50">{saving ? "Saving…" : "Save draft"}</button>
        <button disabled={saving} onClick={() => save("scheduled")} className="btn-primary !text-xs !py-2 !px-6 disabled:opacity-50">{saving ? "Scheduling…" : "Schedule sale"}</button>
      </div>
      <style>{`.ipt{width:100%;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.15);border-radius:8px;padding:0.55rem 0.75rem;font-size:13px;color:#fff;outline:none}.ipt:focus{border-color:var(--accent-red)}`}</style>
    </DashboardShell>
  );
}

function Field({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return <label className="block mb-3"><span className="label-mini text-[10px] opacity-70 mb-1.5 block">{label}</span>{children}</label>;
}
