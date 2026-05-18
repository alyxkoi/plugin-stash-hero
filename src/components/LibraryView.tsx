import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { GlassCard } from "@/components/GlassCard";
import { library as defaultLibrary, getLibProduct, formatDate, type LibraryItem } from "@/lib/account-data";

export function LibraryView({ items = defaultLibrary, hideHeaderActions = false }: { items?: LibraryItem[]; hideHeaderActions?: boolean }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    let r = items.filter(i => {
      const p = getLibProduct(i.slug); if (!p) return false;
      if (query) {
        const q = query.toLowerCase();
        if (!p.name.toLowerCase().includes(q) && !p.maker.toLowerCase().includes(q)) return false;
      }
      return true;
    });
    r = [...r].sort((a, b) => (b.lastDownloaded ?? "0") > (a.lastDownloaded ?? "0") ? 1 : -1);
    return r;
  }, [items, query]);

  const totalGB = (items.length * 0.7).toFixed(1);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-[clamp(2.25rem,5vw,4rem)] leading-[0.95] tracking-tight">YOUR STASH</h1>
        <div className="mt-4 label-mini flex flex-wrap gap-3">
          <span>{items.length} PLUGINS</span><span className="text-white/25">·</span>
          <span>{totalGB} GB TOTAL</span><span className="text-white/25">·</span>
          <span>UNLIMITED RE-DOWNLOADS</span>
        </div>
      </header>

      {!hideHeaderActions && (
        <div className="relative">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
          <input
            value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="Find a plugin in your stash"
            className="input-glass !pl-11 !rounded-full"
          />
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyStash />
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
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
        <div className="chromatic-edge" />
        <div className="relative z-10 flex flex-col h-full">
          <div className="relative aspect-square rounded-2xl overflow-hidden mb-4" style={{ background: p.coverGradient }}>
            <div className="absolute inset-0 flex items-center justify-center p-4">
              <div className="text-center">
                <div className="label-mini mb-1">{p.maker}</div>
                <div className="font-display text-2xl">{p.name}</div>
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
          <h3 className="font-display text-lg leading-tight truncate tracking-wide">{p.name}</h3>
          <div className="label-mini mt-1">{(p.subType || p.category)} · {p.daws[0] || "Standalone"}</div>
          <div className="font-mono text-[11px] tracking-wider text-white/55 mt-2">
            v{item.installedVersion} · {p.fileSize}
          </div>
          <div className="label-mini mt-1 mb-4">
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
      <h2 className="font-display text-3xl tracking-wide mb-2">YOUR STASH IS EMPTY.</h2>
      <p className="text-white/70 mb-8">Time to load up. Your DAW's been waiting.</p>
      <Link to="/shop" className="btn-primary">BROWSE THE WAREHOUSE →</Link>
    </GlassCard>
  );
}
