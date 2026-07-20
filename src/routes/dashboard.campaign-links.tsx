import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { DashboardShell, DashCard } from "@/components/DashboardShell";
import { supabase } from "@/integrations/supabase/client";
import { slugifyUtm, generateShareCode, normalizePath } from "@/lib/campaign-links";

export const Route = createFileRoute("/dashboard/campaign-links")({
  head: () => ({ meta: [{ title: "Campaign Links — Plugin Warehouse" }] }),
  component: CampaignLinksPage,
});

type Group = { id: string; name: string; archived_at: string | null };
type LinkRow = {
  id: string;
  group_id: string | null;
  label: string;
  code: string;
  utm_source: string;
  utm_campaign: string | null;
  destination_path: string;
  archived_at: string | null;
};
type ClickAgg = Map<string, number>;
type OrderAgg = Map<string, number>; // key `${source}||${campaign||""}`

function pairKey(source: string | null, campaign: string | null) {
  return `${(source || "").toLowerCase()}||${(campaign || "").toLowerCase()}`;
}

function CampaignLinksPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [links, setLinks] = useState<LinkRow[]>([]);
  const [clicks, setClicks] = useState<ClickAgg>(new Map());
  const [purchases, setPurchases] = useState<OrderAgg>(new Map());
  const [loading, setLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);
  const [origin, setOrigin] = useState<string>("");

  useEffect(() => {
    if (typeof window !== "undefined") setOrigin(window.location.origin);
  }, []);

  const reload = async () => {
    const anySb = supabase as any;
    const [g, l, c, o] = await Promise.all([
      anySb.from("campaign_link_groups").select("id,name,archived_at").order("created_at", { ascending: true }),
      anySb.from("campaign_links").select("id,group_id,label,code,utm_source,utm_campaign,destination_path,archived_at").order("created_at", { ascending: false }),
      anySb.from("campaign_link_clicks").select("link_id"),
      anySb.from("orders").select("utm_source, utm_campaign").eq("status", "completed"),
    ]);
    setGroups((g.data ?? []) as Group[]);
    setLinks((l.data ?? []) as LinkRow[]);
    const clickAgg: ClickAgg = new Map();
    for (const row of (c.data ?? []) as { link_id: string }[]) {
      clickAgg.set(row.link_id, (clickAgg.get(row.link_id) ?? 0) + 1);
    }
    setClicks(clickAgg);
    const orderAgg: OrderAgg = new Map();
    for (const row of (o.data ?? []) as { utm_source: string | null; utm_campaign: string | null }[]) {
      const k = pairKey(row.utm_source, row.utm_campaign);
      orderAgg.set(k, (orderAgg.get(k) ?? 0) + 1);
    }
    setPurchases(orderAgg);
    setLoading(false);
  };


  useEffect(() => { void reload(); }, []);

  const stats = useMemo(() => {
    const per = new Map<string, { clicks: number; purchases: number }>();
    for (const link of links) {
      const clks = clicks.get(link.id) ?? 0;
      const purch = purchases.get(pairKey(link.utm_source, link.utm_campaign)) ?? 0;
      per.set(link.id, { clicks: clks, purchases: purch });
    }
    return per;
  }, [links, clicks, purchases]);

  const visibleLinks = useMemo(
    () => links.filter((l) => (showArchived ? !!l.archived_at : !l.archived_at)),
    [links, showArchived]
  );
  const visibleGroups = useMemo(
    () => groups.filter((g) => (showArchived ? !!g.archived_at : !g.archived_at)),
    [groups, showArchived]
  );

  const grouped = useMemo(() => {
    const map = new Map<string | null, LinkRow[]>();
    for (const link of visibleLinks) {
      const key = link.group_id;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(link);
    }
    return map;
  }, [visibleLinks]);

  const ungrouped = grouped.get(null) ?? [];

  const groupRollup = (groupId: string) => {
    const inGroup = visibleLinks.filter((l) => l.group_id === groupId);
    let c = 0, p = 0;
    for (const link of inGroup) {
      const s = stats.get(link.id);
      if (!s) continue;
      c += s.clicks; p += s.purchases;
    }
    return { clicks: c, purchases: p, count: inGroup.length };
  };

  const copyLink = async (code: string) => {
    try { await navigator.clipboard.writeText(`${origin}/go/${code}`); } catch { /* ignore */ }
  };

  return (
    <DashboardShell
      title="Campaign Links"
      action={
        <Link to="/dashboard/analytics" className="text-[11px] font-mono uppercase tracking-wider text-white/60 hover:text-white transition-colors">
          ← Back to Analytics
        </Link>
      }
    >
      <div className="mb-6 space-y-6">
        <CreateLinkForm groups={groups} onCreated={reload} />
        <CreateGroupForm onCreated={reload} />
      </div>

      <div className="flex items-center justify-between mb-3">
        <div className="text-[10px] font-mono uppercase tracking-wider text-white/50">
          {showArchived ? "Archived" : "Active"} · {visibleLinks.length} link{visibleLinks.length === 1 ? "" : "s"}
        </div>
        <button
          onClick={() => setShowArchived((v) => !v)}
          className="text-[10px] font-mono uppercase tracking-wider text-white/60 hover:text-white transition-colors border border-white/10 rounded px-2 py-1"
        >
          {showArchived ? "Show active" : "Show archived"}
        </button>
      </div>

      {loading ? (
        <DashCard><div className="py-8 text-center text-xs text-white/40 font-mono">Loading…</div></DashCard>
      ) : (
        <div className="space-y-4">
          {visibleGroups.map((g) => {
            const inGroup = grouped.get(g.id) ?? [];
            const roll = groupRollup(g.id);
            const conv = roll.clicks ? Math.round((roll.purchases / roll.clicks) * 1000) / 10 : 0;
            return (
              <DashCard key={g.id}>
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="min-w-0">
                    <div className="font-display text-base tracking-wide text-white">{g.name}</div>
                    <div className="text-[10px] font-mono text-white/45 mt-0.5">
                      {roll.count} link{roll.count === 1 ? "" : "s"} · {roll.clicks} clicks · {roll.purchases} purchases · {conv}% conv
                    </div>
                  </div>
                  <GroupActions group={g} onChanged={reload} />
                </div>
                {inGroup.length === 0 ? (
                  <div className="text-[11px] font-mono text-white/40 py-3">No links in this group.</div>
                ) : (
                  <div className="divide-y divide-white/5">
                    {inGroup.map((link) => (
                      <LinkRowItem key={link.id} link={link} stats={stats.get(link.id)} origin={origin} groups={groups} onChanged={reload} onCopy={copyLink} />
                    ))}
                  </div>
                )}
              </DashCard>
            );
          })}

          {ungrouped.length > 0 && (
            <DashCard title="Ungrouped">
              <div className="divide-y divide-white/5">
                {ungrouped.map((link) => (
                  <LinkRowItem key={link.id} link={link} stats={stats.get(link.id)} origin={origin} groups={groups} onChanged={reload} onCopy={copyLink} />
                ))}
              </div>
            </DashCard>
          )}

          {visibleLinks.length === 0 && (
            <DashCard><div className="py-8 text-center text-xs text-white/40 font-mono">No {showArchived ? "archived" : "active"} campaign links yet.</div></DashCard>
          )}
        </div>
      )}
    </DashboardShell>
  );
}

function CreateLinkForm({ groups, onCreated }: { groups: Group[]; onCreated: () => void | Promise<void> }) {
  const [label, setLabel] = useState("");
  const [source, setSource] = useState("");
  const [campaign, setCampaign] = useState("");
  const [dest, setDest] = useState("/");
  const [groupId, setGroupId] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const activeGroups = groups.filter((g) => !g.archived_at);
  const sourceSlug = slugifyUtm(source);
  const campaignSlug = campaign ? slugifyUtm(campaign) : "";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (!label.trim() || !sourceSlug) { setErr("Label and source are required."); return; }
    setBusy(true);
    // Retry a couple of times on the unlikely code collision.
    for (let attempt = 0; attempt < 4; attempt++) {
      const code = generateShareCode();
      const { error } = await supabase.from("campaign_links").insert({
        label: label.trim(),
        code,
        utm_source: sourceSlug,
        utm_campaign: campaignSlug || null,
        destination_path: normalizePath(dest),
        group_id: groupId || null,
      } as any);
      if (!error) {
        setLabel(""); setSource(""); setCampaign(""); setDest("/"); setGroupId("");
        setBusy(false);
        void onCreated();
        return;
      }
      if (!/duplicate key|unique/i.test(error.message)) {
        setErr(error.message);
        setBusy(false);
        return;
      }
    }
    setErr("Could not generate a unique code. Try again.");
    setBusy(false);
  };

  return (
    <DashCard title="New campaign link">
      <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field label="Label (internal)"><input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Facebook post – August" className={inputCls} /></Field>
        <Field label="Group (optional)">
          <select value={groupId} onChange={(e) => setGroupId(e.target.value)} className={inputCls}>
            <option value="">— No group —</option>
            {activeGroups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </Field>
        <Field label={`utm_source · ${sourceSlug || "e.g. facebook"}`}>
          <input value={source} onChange={(e) => setSource(e.target.value)} placeholder="Facebook" className={inputCls} required />
        </Field>
        <Field label={`utm_campaign · ${campaignSlug || "optional, e.g. august-2026"}`}>
          <input value={campaign} onChange={(e) => setCampaign(e.target.value)} placeholder="August 2026 Sale" className={inputCls} />
        </Field>
        <Field label="Destination path"><input value={dest} onChange={(e) => setDest(e.target.value)} placeholder="/shop or /sale/world-cup" className={inputCls} /></Field>
        <div className="flex items-end">
          <button type="submit" disabled={busy} className="w-full rounded-md bg-[var(--accent-red)] hover:brightness-110 text-white text-xs font-mono uppercase tracking-wider py-2.5 transition disabled:opacity-50">
            {busy ? "Creating…" : "Create link"}
          </button>
        </div>
        {err && <div className="md:col-span-2 text-[11px] text-[var(--accent-red)] font-mono">{err}</div>}
      </form>
    </DashCard>
  );
}

function CreateGroupForm({ onCreated }: { onCreated: () => void | Promise<void> }) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <DashCard title="New group">
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (!name.trim()) return;
          setBusy(true);
          const { error } = await supabase.from("campaign_link_groups").insert({ name: name.trim() } as any);
          setBusy(false);
          if (!error) { setName(""); void onCreated(); }
        }}
        className="flex gap-2"
      >
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Group name (e.g. Affiliates)" className={`${inputCls} flex-1`} />
        <button type="submit" disabled={busy || !name.trim()} className="rounded-md border border-white/15 hover:border-white/30 text-white text-xs font-mono uppercase tracking-wider px-4 transition disabled:opacity-50">
          Add group
        </button>
      </form>
    </DashCard>
  );
}

function GroupActions({ group, onChanged }: { group: Group; onChanged: () => void | Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const rename = async () => {
    const next = prompt("Rename group", group.name);
    if (!next || !next.trim()) return;
    setBusy(true);
    await supabase.from("campaign_link_groups").update({ name: next.trim() } as any).eq("id", group.id);
    setBusy(false);
    void onChanged();
  };
  const toggleArchive = async () => {
    setBusy(true);
    await supabase.from("campaign_link_groups").update({ archived_at: group.archived_at ? null : new Date().toISOString() } as any).eq("id", group.id);
    setBusy(false);
    void onChanged();
  };
  return (
    <div className="flex gap-2 shrink-0">
      <button onClick={rename} disabled={busy} className={actionCls}>Rename</button>
      <button onClick={toggleArchive} disabled={busy} className={actionCls}>{group.archived_at ? "Restore" : "Archive"}</button>
    </div>
  );
}

function LinkRowItem({
  link, stats, origin, groups, onChanged, onCopy,
}: {
  link: LinkRow;
  stats: { clicks: number; purchases: number } | undefined;
  origin: string;
  groups: Group[];
  onChanged: () => void | Promise<void>;
  onCopy: (code: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const clicks = stats?.clicks ?? 0;
  const purchases = stats?.purchases ?? 0;
  const conv = clicks ? Math.round((purchases / clicks) * 1000) / 10 : 0;

  const archive = async () => {
    setBusy(true);
    await supabase.from("campaign_links").update({ archived_at: link.archived_at ? null : new Date().toISOString() } as any).eq("id", link.id);
    setBusy(false);
    void onChanged();
  };

  const moveTo = async (id: string) => {
    setBusy(true);
    await supabase.from("campaign_links").update({ group_id: id || null } as any).eq("id", link.id);
    setBusy(false);
    void onChanged();
  };

  const activeGroups = groups.filter((g) => !g.archived_at);

  return (
    <div className="py-3 flex flex-col md:flex-row md:items-center gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="text-sm text-white truncate">{link.label}</div>
          {link.archived_at && <span className="text-[9px] font-mono uppercase text-white/40 border border-white/10 rounded px-1.5">Archived</span>}
        </div>
        <div className="text-[10px] font-mono text-white/45 mt-0.5 truncate">
          {origin}/go/{link.code} → {link.destination_path}
        </div>
        <div className="text-[10px] font-mono text-white/40 mt-0.5">
          utm_source={link.utm_source}{link.utm_campaign ? ` · utm_campaign=${link.utm_campaign}` : ""}
        </div>
      </div>
      <div className="flex gap-4 font-mono text-[11px] text-white/70 shrink-0">
        <span><span className="text-white/40">CLICKS</span> {clicks}</span>
        <span><span className="text-white/40">PURCH</span> {purchases}</span>
        <span><span className="text-white/40">CONV</span> {conv}%</span>
      </div>
      <div className="flex gap-2 shrink-0">
        <button onClick={() => onCopy(link.code)} className={actionCls}>Copy</button>
        <button onClick={() => setEditing((v) => !v)} className={actionCls}>Move</button>
        <button onClick={archive} disabled={busy} className={actionCls}>{link.archived_at ? "Restore" : "Archive"}</button>
      </div>
      {editing && (
        <div className="md:w-56">
          <select
            defaultValue={link.group_id ?? ""}
            onChange={(e) => { void moveTo(e.target.value); setEditing(false); }}
            className={inputCls}
          >
            <option value="">— No group —</option>
            {activeGroups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </div>
      )}
    </div>
  );
}

const inputCls =
  "w-full rounded-md bg-white/5 border border-white/10 focus:border-[var(--accent-red)] focus:outline-none text-sm text-white px-3 py-2 font-mono placeholder:text-white/30";
const actionCls =
  "text-[10px] font-mono uppercase tracking-wider text-white/70 hover:text-white border border-white/10 hover:border-white/25 rounded px-2 py-1 transition-colors disabled:opacity-50";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[10px] font-mono uppercase tracking-wider text-white/45 block mb-1">{label}</span>
      {children}
    </label>
  );
}
