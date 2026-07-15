import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Search, Download } from "lucide-react";
import { GlassCard } from "@/components/GlassCard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatDate } from "@/lib/account-data";
import { toast } from "sonner";

type OwnedProduct = {
  id: string;
  slug: string | null;
  name: string;
  cover_gradient: string | null;
  cover_url: string | null;
  last_purchased: string;
};

export function LibraryView() {
  const { user, loading } = useAuth();
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<OwnedProduct[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (loading || !user) return;
    (async () => {
      const { data } = await supabase
        .from("orders")
        .select("created_at, status, order_items(product_id, product_slug, name, cover_gradient, cover_url)")
        .eq("user_id", user.id)
        .eq("status", "completed")
        .order("created_at", { ascending: false });

      const map = new Map<string, OwnedProduct>();
      for (const o of (data ?? []) as any[]) {
        for (const it of o.order_items ?? []) {
          if (!it.product_id) continue;
          const existing = map.get(it.product_id);
          if (!existing || existing.last_purchased < o.created_at) {
            map.set(it.product_id, {
              id: it.product_id, slug: it.product_slug, name: it.name,
              cover_gradient: it.cover_gradient, cover_url: it.cover_url,
              last_purchased: o.created_at,
            });
          }
        }
      }
      setItems([...map.values()].sort((a, b) => (b.last_purchased > a.last_purchased ? 1 : -1)));
      setReady(true);
    })();
  }, [user, loading]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? items.filter(i => i.name.toLowerCase().includes(q)) : items;
  }, [items, query]);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-[clamp(2.25rem,5vw,4rem)] leading-[0.95] tracking-tight">YOUR STASH</h1>
        <div className="mt-4 label-mini flex flex-wrap gap-3">
          <span>{items.length} PLUGIN{items.length === 1 ? "" : "S"}</span>
          <span className="text-white/25">·</span>
          <span>UNLIMITED RE-DOWNLOADS</span>
        </div>
      </header>

      <div className="relative">
        <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Find a plugin in your stash" className="input-glass !pl-11 !rounded-full" />
      </div>

      {!ready ? (
        <div className="py-16 text-center font-mono text-white/50">Loading…</div>
      ) : filtered.length === 0 ? (
        <EmptyStash hasAny={items.length > 0} />
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
          {filtered.map(item => <LibraryCard key={item.id} item={item} />)}
        </div>
      )}
    </div>
  );
}

function triggerAnchorDownload(url: string, filename: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function LibraryCard({ item }: { item: OwnedProduct }) {
  const [busy, setBusy] = useState(false);

  const download = async () => {
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("r2-download-url", { body: { productId: item.id } });
    setBusy(false);
    if (error || !data?.url) { toast.error(data?.error ?? error?.message ?? "Download failed"); return; }
    // Direct browser -> R2 via anchor navigation. No fetch, no blob, no memory
    // cap — the browser streams the file straight from R2 to disk.
    triggerAnchorDownload(data.url, data.filename ?? `${item.name}.zip`);
  };

  return (
    <div className="glass-card p-4 flex flex-col h-full">
      <div className="chromatic-edge" />
      <div className="relative z-10 flex flex-col h-full">
        <div className="relative aspect-square rounded-2xl overflow-hidden mb-4" style={{ background: item.cover_gradient ?? "#333" }}>
          {item.cover_url ? (
            <img src={item.cover_url} alt={item.name} className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center p-4">
              <div className="font-display text-2xl text-center">{item.name}</div>
            </div>
          )}
        </div>
        <h3 className="font-display text-lg leading-tight truncate tracking-wide">{item.name}</h3>
        <div className="label-mini mt-1 mb-4">Purchased {formatDate(item.last_purchased)}</div>
        <div className="mt-auto flex gap-2">
          {item.slug && (
            <Link to="/shop/p/$slug" params={{ slug: item.slug }} className="btn-ghost !text-xs flex-1 text-center">VIEW</Link>
          )}
          <button onClick={download} disabled={busy} className="btn-primary !text-xs flex-1 inline-flex items-center justify-center gap-1.5">
            <Download className="w-3.5 h-3.5" /> {busy ? "..." : "DOWNLOAD"}
          </button>
        </div>
      </div>
    </div>
  );
}

function EmptyStash({ hasAny }: { hasAny: boolean }) {
  return (
    <GlassCard className="p-12 text-center">
      <div className="opacity-30 mb-6 mx-auto w-24 h-24 flex items-center justify-center text-6xl">▦</div>
      <h2 className="font-display text-3xl tracking-wide mb-2">{hasAny ? "NO MATCHES." : "YOUR STASH IS EMPTY."}</h2>
      <p className="text-white/70 mb-8">{hasAny ? "Try a different search." : "Time to load up. Your DAW's been waiting."}</p>
      <Link to="/shop" className="btn-primary">BROWSE THE WAREHOUSE →</Link>
    </GlassCard>
  );
}
