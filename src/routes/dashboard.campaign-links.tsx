import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, Fragment } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { ChevronDown, Copy as CopyIcon, MoreHorizontal, GripVertical } from "lucide-react";
import { DashboardShell, DashCard } from "@/components/DashboardShell";
import { supabase } from "@/integrations/supabase/client";
import { slugifyUtm, generateShareCode, normalizePath } from "@/lib/campaign-links";
import { normalizeUtmSource } from "@/lib/utm";


// Legacy route — the tool now lives inside /dashboard/marketing?tab=campaign.
// Permanent redirect so existing bookmarks/URLs keep working.
export const Route = createFileRoute("/dashboard/campaign-links")({
  beforeLoad: () => { throw redirect({ to: "/dashboard/marketing", search: { tab: "campaign" } as any }); },
  component: () => null,
});


type Group = {
  id: string;
  name: string;
  archived_at: string | null;
  source_platform: string | null;
  start_date: string | null;
  end_date: string | null;
  sort_order: number;
};
type LinkRow = {
  id: string;
  group_id: string | null;
  label: string;
  code: string;
  utm_source: string;
  utm_campaign: string | null;
  utm_content: string | null;
  destination_path: string;
  archived_at: string | null;
  sort_order: number;
};
type ClickAgg = Map<string, number>;
type OrderAgg = Map<string, number>;

const PUBLIC_ORIGIN = "https://www.thepluginwarehouse.com";

function pairKey(source: string | null, campaign: string | null) {
  return `${(source || "").toLowerCase()}||${(campaign || "").toLowerCase()}`;
}

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
function fmtDateRange(start: string | null, end: string | null): string {
  if (!start && !end) return "";
  const parse = (s: string) => { const [y, m, d] = s.split("-").map(Number); return { y, m: m - 1, d }; };
  if (start && end) {
    const s = parse(start), e = parse(end);
    if (s.y === e.y && s.m === e.m) return `${MONTHS[s.m]} ${s.d}–${e.d}`;
    if (s.y === e.y) return `${MONTHS[s.m]} ${s.d} – ${MONTHS[e.m]} ${e.d}`;
    return `${MONTHS[s.m]} ${s.d}, ${s.y} – ${MONTHS[e.m]} ${e.d}, ${e.y}`;
  }
  const one = parse((start || end)!);
  return `${MONTHS[one.m]} ${one.d}, ${one.y}`;
}

function slugFromDateRange(start: string | null, end: string | null): string {
  if (!start && !end) return "";
  const one = (start || end)!;
  const [y, m] = one.split("-").map(Number);
  return `${MONTHS[m - 1].toLowerCase()}-${y}`;
}

export function CampaignLinksPage({
  embedded = false,
  onDataChanged,
}: {
  embedded?: boolean;
  onDataChanged?: () => void;
} = {}) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [links, setLinks] = useState<LinkRow[]>([]);
  const [clicks, setClicks] = useState<ClickAgg>(new Map());
  const [purchases, setPurchases] = useState<OrderAgg>(new Map());
  // Orders tagged with a source but with no click-id match to any link.
  const [unattributed, setUnattributed] = useState<Map<string, number>>(new Map());
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const reload = async () => {
    const anySb = supabase as any;
    const [g, l, s, o, cids] = await Promise.all([
      anySb.from("campaign_link_groups")
        .select("id,name,archived_at,source_platform,start_date,end_date,sort_order")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true }),
      anySb.from("campaign_links")
        .select("id,group_id,label,code,utm_source,utm_campaign,utm_content,destination_path,archived_at,sort_order")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false }),
      // Clicks + purchases are aggregated server-side: the raw click table is
      // far bigger than the API row cap, so counting it in the browser
      // silently truncated (or returned nothing) and every row read 0.
      anySb.rpc("admin_campaign_link_stats"),
      // Fully refunded orders stop counting as campaign purchases ($0 excluded too).
      anySb.from("orders").select("pw_cid, utm_source").in("status", ["completed", "partial"]).gt("total", 0),
      anySb.from("campaign_link_clicks").select("click_id").eq("counted", true).not("click_id", "is", null),
    ]);
    setGroups((g.data ?? []) as Group[]);
    setLinks((l.data ?? []) as LinkRow[]);

    const statRows = (s.data ?? []) as { link_id: string; clicks: number; purchases: number }[];
    const clickAgg: ClickAgg = new Map();
    const orderAgg: OrderAgg = new Map();
    for (const row of statRows) {
      clickAgg.set(row.link_id, Number(row.clicks) || 0);
      orderAgg.set(row.link_id, Number(row.purchases) || 0);
    }
    setClicks(clickAgg);
    setPurchases(orderAgg);

    // Diagnostic only: orders tagged with a source whose click id matches no link.
    const knownCids = new Set(
      ((cids.data ?? []) as { click_id: string | null }[]).map(r => r.click_id).filter(Boolean) as string[],
    );
    const unmatched = new Map<string, number>();
    for (const row of (o.data ?? []) as { pw_cid: string | null; utm_source: string | null }[]) {
      if (row.pw_cid && knownCids.has(row.pw_cid)) continue;
      const src = normalizeUtmSource(row.utm_source);
      if (src) unmatched.set(src, (unmatched.get(src) ?? 0) + 1);
    }
    setUnattributed(unmatched);
    setHasLoadedOnce(true);
  };

  const refreshAfterMutation = async () => {
    await reload();
    onDataChanged?.();
  };


  useEffect(() => { void reload(); }, []);

  const stats = useMemo(() => {
    const per = new Map<string, { clicks: number; purchases: number }>();
    for (const link of links) {
      per.set(link.id, { clicks: clicks.get(link.id) ?? 0, purchases: purchases.get(link.id) ?? 0 });
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

  const groupRollup = (groupId: string | null) => {
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
    const url = `${PUBLIC_ORIGIN}/go/${code}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Copied!", { description: url });
    } catch {
      toast.error("Couldn't copy — select and copy manually.");
    }
  };

  // Drag & drop state — a single dragged link across all groups.
  const dragRef = useRef<{ id: string; fromGroup: string | null } | null>(null);

  const persistLinkOrder = async (updates: { id: string; sort_order: number; group_id: string | null }[]) => {
    // Optimistic UI already applied; write to db.
    await Promise.all(updates.map(u =>
      (supabase as any).from("campaign_links")
        .update({ sort_order: u.sort_order, group_id: u.group_id } as any)
        .eq("id", u.id)
    ));
  };

  const handleDropOnLink = async (targetLinkId: string, targetGroupId: string | null) => {
    const drag = dragRef.current;
    dragRef.current = null;
    if (!drag || drag.id === targetLinkId) return;
    const next = [...links];
    const dragIdx = next.findIndex(l => l.id === drag.id);
    const targetIdx = next.findIndex(l => l.id === targetLinkId);
    if (dragIdx < 0 || targetIdx < 0) return;
    const [moved] = next.splice(dragIdx, 1);
    moved.group_id = targetGroupId;
    const newTargetIdx = next.findIndex(l => l.id === targetLinkId);
    next.splice(newTargetIdx, 0, moved);
    // Reindex per-group
    const byGroup = new Map<string | null, LinkRow[]>();
    for (const l of next) {
      const k = l.group_id;
      if (!byGroup.has(k)) byGroup.set(k, []);
      byGroup.get(k)!.push(l);
    }
    const updates: { id: string; sort_order: number; group_id: string | null }[] = [];
    byGroup.forEach((arr, g) => arr.forEach((l, i) => {
      l.sort_order = i;
      updates.push({ id: l.id, sort_order: i, group_id: g });
    }));
    setLinks(next);
    await persistLinkOrder(updates);
  };

  const handleDropOnGroup = async (targetGroupId: string | null) => {
    const drag = dragRef.current;
    dragRef.current = null;
    if (!drag) return;
    const next = [...links];
    const idx = next.findIndex(l => l.id === drag.id);
    if (idx < 0) return;
    const [moved] = next.splice(idx, 1);
    moved.group_id = targetGroupId;
    // Append at end of target group
    // Rebuild sequence putting target group items first then others
    const grp = next.filter(l => l.group_id === targetGroupId);
    const rest = next.filter(l => l.group_id !== targetGroupId);
    const newGrp = [...grp, moved];
    const combined = [...newGrp, ...rest];
    const updates: { id: string; sort_order: number; group_id: string | null }[] = [];
    const seen = new Map<string | null, number>();
    for (const l of combined) {
      const s = (seen.get(l.group_id) ?? 0);
      l.sort_order = s;
      seen.set(l.group_id, s + 1);
      updates.push({ id: l.id, sort_order: s, group_id: l.group_id });
    }
    setLinks(combined);
    await persistLinkOrder(updates);
  };

  const Shell: any = embedded ? Fragment : DashboardShell;
  const shellProps = embedded ? {} : {
    title: "Campaign Links",
    action: (
      <Link to="/dashboard/marketing" className="text-[11px] font-mono uppercase tracking-wider text-white/60 hover:text-white transition-colors">
        ← Back to Marketing
      </Link>
    ),
  };
  return (
    <Shell {...shellProps}>
      <div className="mb-6">
        <CreateLinkForm
          groups={groups}
          onCreated={refreshAfterMutation}
          onGroupCreated={refreshAfterMutation}
        />
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

      {!hasLoadedOnce ? (
        <DashCard><div className="py-8 text-center text-xs text-white/40 font-mono">Loading…</div></DashCard>
      ) : (
        <div className="space-y-3">
          {visibleGroups.map((g) => {
            const inGroup = grouped.get(g.id) ?? [];
            const roll = groupRollup(g.id);
            const conv = roll.clicks ? Math.round((roll.purchases / roll.clicks) * 1000) / 10 : 0;
            const dateStr = fmtDateRange(g.start_date, g.end_date);
            return (
              <DashCard key={g.id} className="!p-4">
                <div
                  className="flex items-start justify-between gap-3 mb-2"
                  onDragOver={(e) => { e.preventDefault(); }}
                  onDrop={() => void handleDropOnGroup(g.id)}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="font-display text-base tracking-wide text-white">{g.name}</div>
                      {g.source_platform && (
                        <span className="text-[9px] font-mono uppercase tracking-wider text-white/50 border border-white/10 rounded px-1.5 py-0.5">
                          {g.source_platform}
                        </span>
                      )}
                      {dateStr && (
                        <span className="text-[9px] font-mono uppercase tracking-wider text-white/50">{dateStr}</span>
                      )}
                    </div>
                    <div className="text-[10px] font-mono text-white/45 mt-0.5">
                      {roll.count} link{roll.count === 1 ? "" : "s"} · {roll.clicks} clicks · {roll.purchases} purchases · {conv}% conv
                    </div>
                    {(() => {
                      const src = normalizeUtmSource(g.source_platform);
                      const n = src ? unattributed.get(src) ?? 0 : 0;
                      if (!n) return null;
                      return (
                        <div className="text-[10px] font-mono text-white/30 mt-0.5">
                          {n} order{n === 1 ? "" : "s"} tagged {src} with no matching link click
                        </div>
                      );
                    })()}
                  </div>
                  <GroupActions group={g} onChanged={refreshAfterMutation} />
                </div>
                {inGroup.length === 0 ? (
                  <div className="text-[11px] font-mono text-white/40 py-2">Drag links here or create one in this group.</div>
                ) : (
                  <div className="divide-y divide-white/5">
                    {inGroup.map((link) => (
                      <LinkRowItem
                        key={link.id}
                        link={link}
                        group={g}
                        stats={stats.get(link.id)}
                        groups={groups}
                        onChanged={refreshAfterMutation}
                        onCopy={copyLink}
                        dragRef={dragRef}
                        onDropOnLink={handleDropOnLink}
                      />
                    ))}
                  </div>
                )}
              </DashCard>
            );
          })}

          <DashCard
            className="!p-4"
            title="No group"
          >
            <div
              onDragOver={(e) => { e.preventDefault(); }}
              onDrop={() => void handleDropOnGroup(null)}
            >
              {ungrouped.length === 0 ? (
                <div className="text-[11px] font-mono text-white/40 py-2">Ungrouped links land here.</div>
              ) : (
                <div className="divide-y divide-white/5">
                  {ungrouped.map((link) => (
                    <LinkRowItem
                      key={link.id}
                      link={link}
                      group={null}
                      stats={stats.get(link.id)}
                      groups={groups}
                      onChanged={refreshAfterMutation}
                      onCopy={copyLink}
                      dragRef={dragRef}
                      onDropOnLink={handleDropOnLink}
                    />
                  ))}
                </div>
              )}
            </div>
          </DashCard>

          {visibleLinks.length === 0 && visibleGroups.length === 0 && (
            <DashCard><div className="py-8 text-center text-xs text-white/40 font-mono">No {showArchived ? "archived" : "active"} campaign links yet.</div></DashCard>
          )}
        </div>
      )}
    </Shell>
  );
}

/* ============ Create Link Form ============ */
function CreateLinkForm({
  groups, onCreated, onGroupCreated,
}: {
  groups: Group[];
  onCreated: () => void | Promise<void>;
  onGroupCreated: () => void | Promise<void>;
}) {
  const DRAFT_KEY = "cl_draft_v1";
  type Draft = {
    label: string; dest: string; groupId: string; showAdvanced: boolean;
    utmSourceOverride: string | null; utmCampaignOverride: string | null; utmContentOverride: string | null;
  };
  const readDraft = (): Draft | null => {
    if (typeof window === "undefined") return null;
    try { const raw = localStorage.getItem(DRAFT_KEY); return raw ? JSON.parse(raw) as Draft : null; } catch { return null; }
  };
  const initial = readDraft();

  const [label, setLabel] = useState(initial?.label ?? "");
  const [dest, setDest] = useState(initial?.dest ?? "/");
  const [groupId, setGroupId] = useState<string>(initial?.groupId ?? "");
  const [showAdvanced, setShowAdvanced] = useState(initial?.showAdvanced ?? false);
  const [utmSourceOverride, setUtmSourceOverride] = useState<string | null>(initial?.utmSourceOverride ?? null);
  const [utmCampaignOverride, setUtmCampaignOverride] = useState<string | null>(initial?.utmCampaignOverride ?? null);
  const [utmContentOverride, setUtmContentOverride] = useState<string | null>(initial?.utmContentOverride ?? null);
  const [busy, setBusy] = useState(false);

  // Persist draft on every change so window-refocus remounts (or accidental
  // navigation) never wipe typed values.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const isDirty =
      label !== "" || dest !== "/" || groupId !== "" || showAdvanced ||
      utmSourceOverride !== null || utmCampaignOverride !== null || utmContentOverride !== null;
    if (!isDirty) { localStorage.removeItem(DRAFT_KEY); return; }
    const draft: Draft = { label, dest, groupId, showAdvanced, utmSourceOverride, utmCampaignOverride, utmContentOverride };
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(draft)); } catch { /* quota */ }
  }, [label, dest, groupId, showAdvanced, utmSourceOverride, utmCampaignOverride, utmContentOverride]);

  // Inline "+ New group" mini-form (opened from dropdown).
  const [showNewGroup, setShowNewGroup] = useState(false);

  const activeGroups = groups.filter((g) => !g.archived_at);
  const selectedGroup = activeGroups.find(g => g.id === groupId) || null;

  // Auto-derived UTM values
  const autoSource = slugifyUtm(selectedGroup?.source_platform || "");
  const autoCampaign = (() => {
    if (!selectedGroup) return "";
    const parts: string[] = [];
    if (selectedGroup.source_platform) parts.push(slugifyUtm(selectedGroup.source_platform));
    parts.push(slugifyUtm(selectedGroup.name));
    const dr = slugFromDateRange(selectedGroup.start_date, selectedGroup.end_date);
    if (dr) parts.push(dr);
    return parts.filter(Boolean).join("-").replace(/-{2,}/g, "-");
  })();
  const autoContent = slugifyUtm(label);

  const utmSource = utmSourceOverride ?? autoSource;
  const utmCampaign = utmCampaignOverride ?? autoCampaign;
  const utmContent = utmContentOverride ?? autoContent;

  const destNorm = normalizePath(dest);
  const previewUrl = (() => {
    const u = new URL(destNorm, PUBLIC_ORIGIN);
    if (utmSource) u.searchParams.set("utm_source", utmSource);
    if (utmCampaign) u.searchParams.set("utm_campaign", utmCampaign);
    if (utmContent) u.searchParams.set("utm_content", utmContent);
    return u.toString();
  })();

  const reset = () => {
    setLabel(""); setDest("/"); setGroupId("");
    setUtmSourceOverride(null); setUtmCampaignOverride(null); setUtmContentOverride(null);
    setShowAdvanced(false);
    if (typeof window !== "undefined") { try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ } }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) { toast.error("Link Name is required."); return; }
    if (!destNorm.startsWith("/")) { toast.error("Sends To must start with /"); return; }
    if (!utmSource) { toast.error("utm_source is required. Set a Group source or open Advanced."); return; }
    setBusy(true);
    for (let attempt = 0; attempt < 4; attempt++) {
      const code = generateShareCode();
      const { error } = await (supabase as any).from("campaign_links").insert({
        label: label.trim(),
        code,
        utm_source: utmSource,
        utm_campaign: utmCampaign || null,
        utm_content: utmContent || null,
        destination_path: destNorm,
        group_id: groupId || null,
      } as any);
      if (!error) {
        setBusy(false);
        toast.success("Campaign link created.");
        reset();
        void onCreated();
        return;
      }
      if (!/duplicate key|unique/i.test(error.message)) {
        toast.error(error.message);
        setBusy(false);
        return;
      }
    }
    toast.error("Could not generate a unique code. Try again.");
    setBusy(false);
  };

  return (
    <DashCard title="New campaign link">
      <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field label="Link Name" help="The internal name of this specific ad/link.">
          <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Discounts, Bargains & Sales" className={inputCls} required />
        </Field>

        <Field label="Group" help="Organize links by campaign or platform.">
          <div className="flex gap-2">
            <select
              value={showNewGroup ? "__new__" : groupId}
              onChange={(e) => {
                const v = e.target.value;
                if (v === "__new__") { setShowNewGroup(true); return; }
                setShowNewGroup(false);
                setGroupId(v);
              }}
              className={`${selectCls} flex-1`}
            >
              <option value="" style={{ background: "#190737", color: "#C9BEDD" }}>— No group —</option>
              {activeGroups.map((g) => <option key={g.id} value={g.id} style={{ background: "#190737", color: "#C9BEDD" }}>{g.name}</option>)}
              <option value="__new__" style={{ background: "#190737", color: "#C9BEDD" }}>+ New group…</option>
            </select>
          </div>
          {showNewGroup && (
            <div className="mt-2">
              <InlineNewGroup
                onCreated={async (newId) => {
                  setShowNewGroup(false);
                  setGroupId(newId);
                  await onGroupCreated();
                }}
                onCancel={() => setShowNewGroup(false)}
              />
            </div>
          )}
        </Field>

        <Field label="Sends To" help="The page on thepluginwarehouse.com this link opens." className="md:col-span-2">
          <input value={dest} onChange={(e) => setDest(e.target.value)} placeholder="/ or /deals" className={inputCls} required />
        </Field>

        <div className="md:col-span-2">
          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            className="text-[10px] font-mono uppercase tracking-wider text-white/60 hover:text-white flex items-center gap-1.5 transition-colors"
          >
            <ChevronDown size={12} className={`transition-transform ${showAdvanced ? "rotate-180" : ""}`} />
            Advanced — tracking tags
          </button>
          {showAdvanced && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
              <Field label="utm_source">
                <input
                  value={utmSource}
                  onChange={(e) => setUtmSourceOverride(e.target.value)}
                  placeholder={autoSource || "facebook"}
                  className={inputCls}
                />
              </Field>
              <Field label="utm_campaign">
                <input
                  value={utmCampaign}
                  onChange={(e) => setUtmCampaignOverride(e.target.value)}
                  placeholder={autoCampaign || "facebook-meta-ads-apr-2026"}
                  className={inputCls}
                />
              </Field>
              <Field label="utm_content">
                <input
                  value={utmContent}
                  onChange={(e) => setUtmContentOverride(e.target.value)}
                  placeholder={autoContent || "discounts"}
                  className={inputCls}
                />
              </Field>
            </div>
          )}
        </div>

        <div className="md:col-span-2">
          <div className="text-[10px] font-mono uppercase tracking-wider text-white/45 mb-1">Final URL</div>
          <div className="text-[11px] font-mono text-white/80 break-all bg-white/5 border border-white/10 rounded-md px-3 py-2">
            {previewUrl}
          </div>
        </div>

        <div className="md:col-span-2 flex justify-end">
          <button
            type="submit"
            disabled={busy}
            className="btn-primary !py-2.5 !px-6 !min-h-0 text-xs disabled:opacity-50"
          >
            {busy ? "Creating…" : "Create link"}
          </button>
        </div>
      </form>
    </DashCard>
  );
}

/* ============ Inline New Group ============ */
function InlineNewGroup({
  onCreated, onCancel,
}: {
  onCreated: (id: string) => void | Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [source, setSource] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!name.trim()) { toast.error("Group name is required."); return; }
    setBusy(true);
    const { data, error } = await (supabase as any).from("campaign_link_groups").insert({
      name: name.trim(),
      source_platform: source.trim() || null,
      start_date: start || null,
      end_date: end || null,
    } as any).select("id").maybeSingle();
    setBusy(false);
    if (error || !data) {
      toast.error(error?.message || "Could not create group.");
      return;
    }
    toast.success(`Group "${name.trim()}" added.`);
    await onCreated((data as any).id as string);
    setName(""); setSource(""); setStart(""); setEnd("");
  };

  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-3 space-y-2">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Group name (required)" className={inputCls} autoFocus />
        <input value={source} onChange={(e) => setSource(e.target.value)} placeholder="Source / platform (e.g. Facebook)" className={inputCls} />
        <label className="block">
          <span className="text-[10px] font-mono uppercase tracking-wider text-white/45 block mb-1">Start date</span>
          <input type="date" value={start} onChange={(e) => setStart(e.target.value)} className={inputCls} />
        </label>
        <label className="block">
          <span className="text-[10px] font-mono uppercase tracking-wider text-white/45 block mb-1">End date</span>
          <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className={inputCls} />
        </label>
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className={actionCls}>Cancel</button>
        <button type="button" onClick={save} disabled={busy} className="btn-primary !py-1.5 !px-4 !min-h-0 text-[11px] disabled:opacity-50">
          {busy ? "Saving…" : "Add group"}
        </button>
      </div>
    </div>
  );
}

/* ============ Group Actions ============ */
function GroupActions({ group, onChanged }: { group: Group; onChanged: () => void | Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);

  const toggleArchive = async () => {
    setBusy(true);
    const { error } = await (supabase as any).from("campaign_link_groups")
      .update({ archived_at: group.archived_at ? null : new Date().toISOString() } as any)
      .eq("id", group.id);
    setBusy(false); setOpen(false);
    if (error) { toast.error(error.message); return; }
    toast.success(group.archived_at ? "Group restored." : "Group archived.");
    void onChanged();
  };

  const hardDelete = async () => {
    if (!confirm(`Permanently delete "${group.name}"? This can't be undone. Its links will be moved to "No group".`)) return;
    setBusy(true);
    const { error } = await (supabase as any).from("campaign_link_groups").delete().eq("id", group.id);
    setBusy(false); setOpen(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Group deleted.");
    void onChanged();
  };

  const resetClicks = async () => {
    if (!confirm(`Reset click count for all links in "${group.name}"? Historical clicks will be permanently deleted.`)) return;
    setBusy(true);
    const { data, error } = await (supabase as any).rpc("reset_campaign_group_clicks", { _group_id: group.id });
    setBusy(false); setOpen(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`Reset ${data ?? 0} click record${data === 1 ? "" : "s"}.`);
    void onChanged();
  };

  return (
    <div className="relative shrink-0">
      <button ref={btnRef} onClick={() => setOpen((v) => !v)} disabled={busy} className={actionCls} aria-label="Group actions">
        <MoreHorizontal size={14} />
      </button>
      <PortalMenu anchorRef={btnRef} open={open} onClose={() => setOpen(false)} width={192}>
        <MenuItem onClick={() => { setOpen(false); setEditing(true); }}>Rename / edit</MenuItem>
        <MenuItem onClick={toggleArchive}>{group.archived_at ? "Restore" : "Archive"}</MenuItem>
        <MenuItem onClick={resetClicks}>Reset click count</MenuItem>
        <MenuItem danger onClick={hardDelete}>Delete permanently</MenuItem>
      </PortalMenu>
      {editing && (
        <EditGroupDialog group={group} onClose={() => setEditing(false)} onSaved={onChanged} />
      )}
    </div>
  );
}

function EditGroupDialog({ group, onClose, onSaved }: { group: Group; onClose: () => void; onSaved: () => void | Promise<void> }) {
  const [name, setName] = useState(group.name);
  const [source, setSource] = useState(group.source_platform || "");
  const [start, setStart] = useState(group.start_date || "");
  const [end, setEnd] = useState(group.end_date || "");
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!name.trim()) { toast.error("Group name is required."); return; }
    setBusy(true);
    const { error } = await (supabase as any).from("campaign_link_groups").update({
      name: name.trim(),
      source_platform: source.trim() || null,
      start_date: start || null,
      end_date: end || null,
    } as any).eq("id", group.id);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Group updated.");
    onClose();
    void onSaved();
  };

  if (typeof document === "undefined") return null;
  return createPortal(
    <div className="dashboard-scope dash-marketing-modal-layer" onClick={onClose}>
      <div className="dash-marketing-modal max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="font-display text-base tracking-wide text-white">Edit group</div>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Group name" className={inputCls} />
        <input value={source} onChange={(e) => setSource(e.target.value)} placeholder="Source / platform" className={inputCls} />
        <div className="grid grid-cols-2 gap-2">
          <input type="date" value={start} onChange={(e) => setStart(e.target.value)} className={inputCls} />
          <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className={inputCls} />
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className={actionCls}>Cancel</button>
          <button onClick={save} disabled={busy} className="btn-primary !py-1.5 !px-4 !min-h-0 text-[11px] disabled:opacity-50">
            {busy ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/* ============ Link Row ============ */
function LinkRowItem({
  link, group, stats, groups, onChanged, onCopy, dragRef, onDropOnLink,
}: {
  link: LinkRow;
  group: Group | null;
  stats: { clicks: number; purchases: number } | undefined;
  groups: Group[];
  onChanged: () => void | Promise<void>;
  onCopy: (code: string) => void;
  dragRef: React.MutableRefObject<{ id: string; fromGroup: string | null } | null>;
  onDropOnLink: (targetId: string, targetGroup: string | null) => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);

  const clicks = stats?.clicks ?? 0;
  const purchases = stats?.purchases ?? 0;
  const conv = clicks ? Math.round((purchases / clicks) * 1000) / 10 : 0;
  const fullUrl = `${PUBLIC_ORIGIN}/go/${link.code}`;

  const archive = async () => {
    setBusy(true);
    const { error } = await (supabase as any).from("campaign_links")
      .update({ archived_at: link.archived_at ? null : new Date().toISOString() } as any)
      .eq("id", link.id);
    setBusy(false); setOpen(false);
    if (error) { toast.error(error.message); return; }
    toast.success(link.archived_at ? "Link restored." : "Link archived.");
    void onChanged();
  };

  const hardDelete = async () => {
    if (!confirm(`Permanently delete "${link.label}"? This can't be undone.`)) return;
    setBusy(true);
    const { error } = await (supabase as any).from("campaign_links").delete().eq("id", link.id);
    setBusy(false); setOpen(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Link deleted.");
    void onChanged();
  };

  const resetClicks = async () => {
    if (!confirm(`Reset click count for "${link.label}"? Historical clicks will be permanently deleted.`)) return;
    setBusy(true);
    const { data, error } = await (supabase as any).rpc("reset_campaign_link_clicks", { _link_id: link.id });
    setBusy(false); setOpen(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`Reset ${data ?? 0} click record${data === 1 ? "" : "s"}.`);
    void onChanged();
  };

  return (
    <>
      <div
        draggable
        onDragStart={() => { dragRef.current = { id: link.id, fromGroup: link.group_id }; }}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); e.stopPropagation(); setDragOver(false); void onDropOnLink(link.id, link.group_id); }}
        className={`py-2 px-1 flex items-center gap-3 transition-colors ${dragOver ? "bg-white/5" : ""}`}
      >
        <GripVertical size={14} className="text-white/25 shrink-0 cursor-grab active:cursor-grabbing" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="text-sm text-white truncate">{link.label}</div>
            {group && (
              <span className="text-[9px] font-mono uppercase tracking-wider text-white/50 border border-white/10 rounded px-1.5">
                {group.name}
              </span>
            )}
            <span className="text-[9px] font-mono uppercase tracking-wider text-white/50">
              {link.utm_source}
            </span>
            {link.archived_at && <span className="text-[9px] font-mono uppercase text-white/40 border border-white/10 rounded px-1.5">Archived</span>}
          </div>
          <div className="text-[10px] font-mono text-white/45 mt-0.5 truncate">
            → {link.destination_path}
          </div>
          <div className="text-[10px] font-mono text-white/60 mt-0.5 truncate flex items-center gap-1.5">
            <span className="truncate">{fullUrl}</span>
            <button onClick={() => onCopy(link.code)} className="text-white/50 hover:text-white transition-colors shrink-0" aria-label="Copy URL">
              <CopyIcon size={11} />
            </button>
          </div>
          <div className="sm:hidden flex gap-4 font-mono text-[11px] text-white/70 mt-1.5">
            <span><span className="text-white/40">CLK</span> {clicks}</span>
            <span><span className="text-white/40">PUR</span> {purchases}</span>
            <span><span className="text-white/40">CV</span> {conv}%</span>
          </div>
        </div>
        <div className="hidden sm:flex gap-4 font-mono text-[11px] text-white/70 shrink-0">
          <span><span className="text-white/40">CLK</span> {clicks}</span>
          <span><span className="text-white/40">PUR</span> {purchases}</span>
          <span><span className="text-white/40">CV</span> {conv}%</span>
        </div>
        <div className="relative shrink-0">
          <button ref={btnRef} onClick={() => setOpen((v) => !v)} disabled={busy} className={actionCls} aria-label="Link actions">
            <MoreHorizontal size={14} />
          </button>
          <PortalMenu anchorRef={btnRef} open={open} onClose={() => setOpen(false)} width={192}>
            <MenuItem onClick={() => { setOpen(false); onCopy(link.code); }}>Copy URL</MenuItem>
            <MenuItem onClick={() => { setOpen(false); setEditing(true); }}>Edit</MenuItem>
            <MenuItem onClick={archive}>{link.archived_at ? "Restore" : "Archive"}</MenuItem>
            <MenuItem onClick={resetClicks}>Reset click count</MenuItem>
            <MenuItem danger onClick={hardDelete}>Delete permanently</MenuItem>
          </PortalMenu>
        </div>
      </div>
      {editing && (
        <EditLinkDialog link={link} groups={groups} onClose={() => setEditing(false)} onSaved={onChanged} />
      )}
    </>
  );
}

function EditLinkDialog({
  link, groups, onClose, onSaved,
}: {
  link: LinkRow; groups: Group[]; onClose: () => void; onSaved: () => void | Promise<void>;
}) {
  const [label, setLabel] = useState(link.label);
  const [dest, setDest] = useState(link.destination_path);
  const [groupId, setGroupId] = useState<string>(link.group_id || "");
  const [source, setSource] = useState(link.utm_source);
  const [campaign, setCampaign] = useState(link.utm_campaign || "");
  const [content, setContent] = useState(link.utm_content || "");
  const [busy, setBusy] = useState(false);
  const activeGroups = groups.filter((g) => !g.archived_at);

  const save = async () => {
    if (!label.trim()) { toast.error("Link Name is required."); return; }
    const destNorm = normalizePath(dest);
    if (!destNorm.startsWith("/")) { toast.error("Sends To must start with /"); return; }
    const src = slugifyUtm(source);
    if (!src) { toast.error("utm_source is required."); return; }
    setBusy(true);
    const { error } = await (supabase as any).from("campaign_links").update({
      label: label.trim(),
      destination_path: destNorm,
      group_id: groupId || null,
      utm_source: src,
      utm_campaign: campaign ? slugifyUtm(campaign) : null,
      utm_content: content ? slugifyUtm(content) : null,
    } as any).eq("id", link.id);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Link updated.");
    onClose();
    void onSaved();
  };

  if (typeof document === "undefined") return null;
  return createPortal(
    <div className="dashboard-scope dash-marketing-modal-layer" onClick={onClose}>
      <div className="dash-marketing-modal max-w-lg" onClick={(e) => e.stopPropagation()}>
        <div className="font-display text-base tracking-wide text-white">Edit link</div>
        <Field label="Link Name"><input value={label} onChange={(e) => setLabel(e.target.value)} className={inputCls} /></Field>
        <Field label="Group">
          <select value={groupId} onChange={(e) => setGroupId(e.target.value)} className={selectCls}>
            <option value="" style={{ background: "#190737", color: "#C9BEDD" }}>— No group —</option>
            {activeGroups.map((g) => <option key={g.id} value={g.id} style={{ background: "#190737", color: "#C9BEDD" }}>{g.name}</option>)}
          </select>
        </Field>
        <Field label="Sends To"><input value={dest} onChange={(e) => setDest(e.target.value)} className={inputCls} /></Field>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <Field label="utm_source"><input value={source} onChange={(e) => setSource(e.target.value)} className={inputCls} /></Field>
          <Field label="utm_campaign"><input value={campaign} onChange={(e) => setCampaign(e.target.value)} className={inputCls} /></Field>
          <Field label="utm_content"><input value={content} onChange={(e) => setContent(e.target.value)} className={inputCls} /></Field>
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className={actionCls}>Cancel</button>
          <button onClick={save} disabled={busy} className="btn-primary !py-1.5 !px-4 !min-h-0 text-[11px] disabled:opacity-50">
            {busy ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/* ============ Small helpers ============ */
function MenuItem({ children, onClick, danger }: { children: React.ReactNode; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2 text-[11px] font-mono uppercase tracking-wider transition-colors ${danger ? "text-[var(--accent-red)] hover:bg-[var(--accent-red)]/15" : "text-[#C9BEDD] hover:bg-white/8 hover:text-white"}`}
    >
      {children}
    </button>
  );
}

/**
 * PortalMenu — renders a floating menu into document.body so it is never
 * clipped by parent overflow. Auto-flips upward when there's not enough
 * room below the trigger. Opaque #190737 surface.
 */
function PortalMenu({
  anchorRef,
  open,
  onClose,
  width = 192,
  children,
}: {
  anchorRef: React.RefObject<HTMLElement | null>;
  open: boolean;
  onClose: () => void;
  width?: number;
  children: React.ReactNode;
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; placeAbove: boolean } | null>(null);

  useLayoutEffect(() => {
    if (!open || !anchorRef.current) return;
    const update = () => {
      const el = anchorRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const menuH = menuRef.current?.offsetHeight ?? 200;
      const vh = window.innerHeight;
      const spaceBelow = vh - r.bottom;
      const placeAbove = spaceBelow < menuH + 12 && r.top > menuH + 12;
      const top = placeAbove ? r.top - menuH - 4 : r.bottom + 4;
      const left = Math.max(8, Math.min(window.innerWidth - width - 8, r.right - width));
      setPos({ top, left, placeAbove });
    };
    update();
    // Re-measure after first paint to account for menu height
    const raf = requestAnimationFrame(update);
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open, anchorRef, width]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (menuRef.current?.contains(t)) return;
      if (anchorRef.current?.contains(t)) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose, anchorRef]);

  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <div
      ref={menuRef}
      role="menu"
      style={{
        position: "fixed",
        top: pos?.top ?? -9999,
        left: pos?.left ?? -9999,
        width,
        zIndex: 9999,
        background: "#190737",
        opacity: pos ? 1 : 0,
      }}
      className="rounded-md border border-white/15 shadow-2xl shadow-black/60 py-1"
    >
      {children}
    </div>,
    document.body,
  );
}

function useOutsideClose(ref: React.RefObject<HTMLElement | null>, onClose: () => void) {
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [ref, onClose]);
}

const inputCls =
  "w-full rounded-md bg-white/5 border border-white/10 focus:border-[var(--accent-red)] focus:outline-none text-sm text-white px-3 py-2 font-mono placeholder:text-white/30";
const selectCls =
  "w-full rounded-md bg-[#190737] border border-white/10 focus:border-[var(--accent-red)] focus:outline-none text-sm text-[#C9BEDD] px-3 py-2 font-mono [color-scheme:dark] appearance-none";
const actionCls =
  "inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider text-white/70 hover:text-white border border-white/10 hover:border-white/25 rounded px-2 py-1 transition-colors disabled:opacity-50";

function Field({ label, help, children, className = "" }: { label: string; help?: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="text-[10px] font-mono uppercase tracking-wider text-white/45 block mb-1">{label}</span>
      {children}
      {help && <span className="text-[10px] text-white/40 mt-1 block">{help}</span>}
    </label>
  );
}
