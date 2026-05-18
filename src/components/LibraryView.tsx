import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { GlassCard } from "@/components/GlassCard";
import { library as defaultLibrary, getLibProduct, formatDate, type LibraryItem } from "@/lib/account-data";

type SortKey = "MOST RECENT" | "ALPHABETICAL" | "MOST DOWNLOADED";

export function LibraryView({ items = defaultLibrary, hideHeaderActions = false }: { items?: LibraryItem[]; hideHeaderActions?: boolean }) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("MOST RECENT");
  const [onlyUpdates, setOnlyUpdates] = useState(false);
  const updatesCount = items.filter(i => i.updateAvailable).length;

  const filtered = useMemo(() => {
    let r = items.filter(i => {
      const p = getLibProduct(i.slug); if (!p) return false;
      if (onlyUpdates && !i.updateAvailable) return false;
      if (query) {
        const q = query.toLowerCase();
        if (!p.name.toLowerCase().includes(q) && !p.maker.toLowerCase().includes(q)) return false;
      }
      return true;
    });
    r = [...r].sort((a, b) => {
      const pa = getLibProduct(a.slug)!, pb = getLibProduct(b.slug)!;
      if (sort === "ALPHABETICAL") return pa.name.localeCompare(pb.name);
      if (sort === "MOST DOWNLOADED") return b.downloadCount - a.downloadCount;
      return (b.lastDownloaded ?? "0") > (a.lastDownloaded ?? "0") ? 1 : -1;
    });
    return r;
  }, [items, query, sort, onlyUpdates]);

  const totalGB = (items.length * 0.7).toFixed(1);

  return (
    <div className="space-y-8">
      <header>
        <div className="font-mono text-xs tracking-[0.18em] text-[var(--accent-red-glow)] mb-3">// YOURS FOREVER. NO LICENSE KEYS.</div>
        <h1 className="font-black text-[clamp(2.25rem,5vw,4rem)] leading-[0.95] tracking-tight chrome-text">YOUR STASH</h1>
        <div className="mt-4 font-mono text-[11px] tracking-[0.14em] text-white/55 flex flex-wrap gap-3">
          <span>{items.length} PLUGINS</span><span className="text-white/25">·</span>
          <span>{totalGB} GB TOTAL</span><span className="text-white/25">·</span>
          <span>UNLIMITED RE-DOWNLOADS</span>
        </div>
      </header>

      {!hideHeaderActions && (
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="Find a plugin in your stash"
              className="input-glass !pl-11 !rounded-full"
            />
          </div>
          <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className="input-glass !rounded-full sm:w-56 font-mono text-xs tracking-wider cursor-pointer">
            <option>MOST RECENT</option><option>ALPHABETICAL</option><option>MOST DOWNLOADED</option>
          </select>
        </div>
      )}

      {updatesCount > 0 && (
        <div className="glass-card p-4 md:p-5" style={{ background: "linear-gradient(90deg, rgba(255,0,60,0.18), rgba(255,0,60,0.06))" }}>
          <div className="chromatic-edge" /><div className="glass-noise" />
          <div className="relative z-10 flex items-center gap-4 flex-wrap">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-[var(--accent-red)] pulse-dot shadow-[0_0_12px_var(--accent-red)]" />
            <span className="font-mono text-[12px] tracking-[0.14em] font-bold">{updatesCount} UPDATES READY</span>
            <span className="text-white/60 text-sm flex-1">New versions available for plugins you own.</span>
            <button onClick={() => setOnlyUpdates(v => !v)} className="btn-ghost !py-2 !px-4 !text-xs">{onlyUpdates ? "SHOW ALL" : "VIEW UPDATES"} →</button>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyStash />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {filtered.map(item => <LibraryCard key={item.slug} item={item} />)}
        </div>
      )}
    </div>
  );
}

type DownloadState = "idle" | "preparing" | "downloading" | "done";

function LibraryCard({ item }: { item: LibraryItem }) {
  const p = getLibProduct(item.slug)!;
  const [state, setState] = useState<DownloadState>("idle");
  const [progress, setProgress] = useState(0);
  const [toast, setToast] = useState(false);

  const start = async () => {
    setState("preparing"); setProgress(0);
    await new Promise(r => setTimeout(r, 500));
    setState("downloading");
    for (let i = 0; i <= 100; i += 5) {
      await new Promise(r => setTimeout(r, 30));
      setProgress(i);
    }
    setState("done");
    setToast(true);
    setTimeout(() => setToast(false), 4000);
    setTimeout(() => setState("idle"), 2000);
  };

  const isUpdate = item.updateAvailable;
  const isNew = !item.lastDownloaded;
  const label =
    state === "preparing" ? "PREPARING..." :
    state === "downloading" ? `DOWNLOADING — ${progress}%` :
    state === "done" ? "✓ DOWNLOADED" :
    isUpdate ? "DOWNLOAD UPDATE →" : "DOWNLOAD →";

  return (
    <>
      <div className="glass-card p-4 flex flex-col h-full">
        <div className="chromatic-edge" /><div className="glass-noise" />
        <div className="relative z-10 flex flex-col h-full">
          <div className="relative aspect-square rounded-2xl overflow-hidden mb-4" style={{ background: p.coverGradient }}>
            <div className="absolute inset-0 flex items-center justify-center p-4">
              <div className="text-center">
                <div className="font-mono text-[10px] tracking-[0.2em] text-white/60 mb-1">// {p.maker.toUpperCase()}</div>
                <div className="font-black text-2xl chrome-text">{p.name}</div>
              </div>
            </div>
            <div className="absolute inset-0 glow-breathe pointer-events-none" style={{ background: "radial-gradient(ellipse at center, rgba(255,0,60,0.3), transparent 65%)" }} />
            {isUpdate && (
              <div className="absolute top-2 left-2 px-2 py-1 rounded-full font-mono text-[10px] font-bold border border-white/30 bg-[var(--accent-red)]/85 text-white">⟳ UPDATE</div>
            )}
            {isNew && !isUpdate && (
              <div className="absolute top-2 right-2 px-2 py-1 rounded-full font-mono text-[10px] font-bold border border-white/30 bg-[var(--accent-red-glow)] text-white">NEW</div>
            )}
          </div>
          <h3 className="font-bold text-base leading-tight truncate">{p.name}</h3>
          <div className="font-mono text-[10px] tracking-wider text-white/55 mt-1">
            {(p.subType || p.category).toUpperCase()} · {p.daws[0]?.toUpperCase() || "STANDALONE"}
          </div>
          <div className="font-mono text-[10px] tracking-wider text-white/45 mt-2">
            v{item.installedVersion} · {p.fileSize}
          </div>
          <div className="font-mono text-[10px] tracking-wider text-white/55 mt-1 mb-4">
            {item.lastDownloaded ? `Last downloaded ${formatDate(item.lastDownloaded)}` : "Never downloaded"}
          </div>
          <button
            onClick={start}
            disabled={state !== "idle"}
            aria-label={`Download ${p.name} version ${item.latestVersion}`}
            className="relative overflow-hidden btn-primary w-full mt-auto !rounded-xl !py-3 !text-sm disabled:opacity-100"
          >
            {state === "downloading" && (
              <div className="absolute inset-0 bg-gradient-to-r from-[var(--accent-red-glow)] to-[var(--accent-red)] origin-left transition-all" style={{ transform: `scaleX(${progress / 100})` }} />
            )}
            <span className="relative z-10" aria-live="polite">{label}</span>
          </button>
          {isUpdate && (
            <button className="text-xs text-white/55 hover:text-white mt-2 underline-offset-4 hover:underline">What's new</button>
          )}
        </div>
      </div>
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 fade-in">
          <div className="glass-card px-5 py-3"><div className="chromatic-edge" /><div className="relative z-10 font-mono text-xs">✓ {p.name} ready in your downloads folder.</div></div>
        </div>
      )}
    </>
  );
}

function EmptyStash() {
  return (
    <GlassCard className="p-12 text-center">
      <div className="opacity-30 mb-6 mx-auto w-24 h-24 flex items-center justify-center text-6xl">▦</div>
      <h2 className="font-black text-3xl tracking-tight mb-2">YOUR STASH IS EMPTY.</h2>
      <p className="text-white/65 mb-8">Time to load up. Your DAW's been waiting.</p>
      <Link to="/shop" className="btn-primary">BROWSE THE WAREHOUSE →</Link>
    </GlassCard>
  );
}
