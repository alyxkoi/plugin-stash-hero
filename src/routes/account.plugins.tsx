import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, FileText, ArrowUpDown, Gift } from "lucide-react";
import { GlassCard } from "@/components/GlassCard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const INSTALL_GUIDE_URL =
  "https://thepluginwarehousefiles.com/other%20files/the_plugin_warehouse_installation_guide.pdf";

type OwnedPlugin = {
  product_id: string;
  name: string;
  slug: string | null;
  cover_gradient: string | null;
  cover_url: string | null;
  last_purchased_at: string;
  is_gift: boolean;
};

type SortMode = "recent" | "alpha";

export const Route = createFileRoute("/account/plugins")({
  head: () => ({ meta: [{ title: "My Plugins — Plugin Warehouse" }] }),
  component: PluginsPage,
});

function PluginsPage() {
  const { user, loading } = useAuth();
  const [ready, setReady] = useState(false);
  const [plugins, setPlugins] = useState<OwnedPlugin[]>([]);
  const [updatedIds, setUpdatedIds] = useState<Set<string>>(new Set());
  const [giftIds, setGiftIds] = useState<Set<string>>(new Set());
  const [sort, setSort] = useState<SortMode>("recent");

  const refreshUpdates = async () => {
    const { data } = await (supabase as any).rpc("get_my_product_file_updates");
    const s = new Set<string>();
    for (const r of (data ?? []) as Array<{ product_id: string; file_updated_at: string; acknowledged_at: string | null }>) {
      if (!r.acknowledged_at || new Date(r.file_updated_at) > new Date(r.acknowledged_at)) s.add(r.product_id);
    }
    setUpdatedIds(s);
  };

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("orders")
      .select("created_at, order_items(product_id, product_slug, name, cover_gradient, cover_url)")
      .eq("user_id", user.id)
      // Fully refunded orders no longer entitle the customer to the files.
      .in("status", ["completed", "partial"])
      .order("created_at", { ascending: false });

    const map = new Map<string, OwnedPlugin>();
    for (const o of (data ?? []) as any[]) {
      for (const it of (o.order_items ?? [])) {
        if (!it.product_id) continue;
        const existing = map.get(it.product_id);
        if (!existing) {
          map.set(it.product_id, {
            product_id: it.product_id,
            name: it.name,
            slug: it.product_slug,
            cover_gradient: it.cover_gradient,
            cover_url: it.cover_url,
            last_purchased_at: o.created_at,
            is_gift: false,
          });
        } else if (new Date(o.created_at) > new Date(existing.last_purchased_at)) {
          existing.last_purchased_at = o.created_at;
        }
      }
    }

    // Active plugin grants (gifts) join the library, deduplicated by product.
    const { data: grants } = await supabase
      .from("plugin_grants")
      .select("product_id, granted_at, acknowledged_at, products(name, slug, cover_url, cover_gradient)")
      .eq("customer_id", user.id)
      .is("revoked_at", null);

    const unseenGifts = new Set<string>();
    for (const g of (grants ?? []) as any[]) {
      if (!g.product_id) continue;
      if (!g.acknowledged_at) unseenGifts.add(g.product_id);
      const existing = map.get(g.product_id);
      if (!existing) {
        map.set(g.product_id, {
          product_id: g.product_id,
          name: g.products?.name ?? "Plugin",
          slug: g.products?.slug ?? null,
          cover_gradient: g.products?.cover_gradient ?? null,
          cover_url: g.products?.cover_url ?? null,
          last_purchased_at: g.granted_at,
          is_gift: true,
        });
      }
    }
    setGiftIds(unseenGifts);

    // Resolve live name + cover from products so admin renames reflect immediately.
    // Fall back to the stored snapshot when a product has been deleted.
    const ids = Array.from(map.keys());
    if (ids.length) {
      const { data: live } = await supabase
        .from("products")
        .select("id, name, slug, cover_url, cover_gradient")
        .in("id", ids);
      for (const p of (live ?? []) as any[]) {
        const owned = map.get(p.id);
        if (!owned) continue;
        owned.name = p.name ?? owned.name;
        owned.slug = p.slug ?? owned.slug;
        owned.cover_url = p.cover_url ?? owned.cover_url;
        owned.cover_gradient = p.cover_gradient ?? owned.cover_gradient;
      }
    }

    setPlugins(Array.from(map.values()));
    await refreshUpdates();
    setReady(true);
  }, [user]);

  useEffect(() => {
    if (loading || !user) return;
    load();
  }, [user, loading, load]);

  // Live updates when a gift lands while the portal is open. A dropped socket
  // never blanks the list — we only ever re-load into the same state shape.
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`account-grants-${user.id}-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "plugin_grants", filter: `customer_id=eq.${user.id}` },
        () => { load(); },
      )
      .subscribe((status) => {
        // Realtime hiccups stay silent — they must never surface as page errors.
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") console.warn("[realtime]", status);
      });
    return () => { supabase.removeChannel(channel); };
  }, [user, load]);

  const sorted = useMemo(() => {
    const arr = [...plugins];
    if (sort === "alpha") arr.sort((a, b) => a.name.localeCompare(b.name));
    else arr.sort((a, b) => +new Date(b.last_purchased_at) - +new Date(a.last_purchased_at));
    return arr;
  }, [plugins, sort]);

  const acknowledgeGift = async (productId: string) => {
    if (!giftIds.has(productId)) return;
    await (supabase as any).rpc("acknowledge_plugin_grants", { _product_ids: [productId] });
    setGiftIds((prev) => { const n = new Set(prev); n.delete(productId); return n; });
  };

  async function download(productId: string, name: string) {
    const ok = await downloadPlugin({ productId });
    if (!ok) return;
    // acknowledge update
    if (updatedIds.has(productId)) {
      await (supabase as any).rpc("acknowledge_product_files", { _product_ids: [productId] });
      setUpdatedIds((prev) => { const n = new Set(prev); n.delete(productId); return n; });
    }
    await acknowledgeGift(productId);
  }

  const acknowledgeOnView = async (productId: string) => {
    if (updatedIds.has(productId)) {
      await (supabase as any).rpc("acknowledge_product_files", { _product_ids: [productId] });
      setUpdatedIds((prev) => { const n = new Set(prev); n.delete(productId); return n; });
    }
    await acknowledgeGift(productId);
  };

  if (!ready) return <div className="p-8 text-white/60">Loading your library…</div>;

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-5">
        <div>
          <h1 className="font-display text-[clamp(2.25rem,5vw,4rem)] leading-[0.95] tracking-tight">MY PLUGINS</h1>
          <div className="mt-4 label-mini text-[#C9BEDD]">
            {plugins.length} PLUGIN{plugins.length !== 1 ? "S" : ""} IN YOUR LIBRARY
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <a
            href={INSTALL_GUIDE_URL}
            target="_blank"
            rel="noreferrer"
            className="glass-card px-4 h-10 rounded-full inline-flex items-center gap-2 border border-[#FF003C]/50 hover:border-[#FF003C] transition group"
          >
            <span className="chromatic-edge" />
            <span className="relative z-10 flex items-center gap-2">
              <FileText className="w-4 h-4 text-[var(--accent-red-glow)]" strokeWidth={1.7} />
              <span className="font-mono text-[11px] tracking-[0.14em] text-white/90 group-hover:text-white">
                INSTALLATION GUIDE
              </span>
            </span>
          </a>
          <div className="glass-card !p-1 rounded-full inline-flex items-center gap-1">
            <div className="relative z-10 flex items-center gap-1 pl-2 pr-1">
              <ArrowUpDown className="w-3.5 h-3.5 text-[#C9BEDD]" />
              <button
                onClick={() => setSort("recent")}
                className={`px-3 h-8 rounded-full font-mono text-[10px] tracking-[0.14em] transition ${
                  sort === "recent" ? "bg-[#FF003C] text-white" : "text-[#C9BEDD] hover:text-white"
                }`}
              >
                LAST PURCHASED
              </button>
              <button
                onClick={() => setSort("alpha")}
                className={`px-3 h-8 rounded-full font-mono text-[10px] tracking-[0.14em] transition ${
                  sort === "alpha" ? "bg-[#FF003C] text-white" : "text-[#C9BEDD] hover:text-white"
                }`}
              >
                A–Z
              </button>
            </div>
          </div>
        </div>
      </header>

      {sorted.length === 0 ? (
        <GlassCard className="p-12 text-center">
          <div className="opacity-30 mb-6 mx-auto w-24 h-24 flex items-center justify-center text-6xl">▢</div>
          <h2 className="font-display text-3xl tracking-wide mb-2">YOUR LIBRARY IS EMPTY.</h2>
          <p className="text-[#C9BEDD] mb-8">Plugins you own will live here.</p>
          <Link to="/shop" className="btn-primary">BROWSE THE WAREHOUSE →</Link>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {sorted.map((p) => (
            <PluginCard
              key={p.product_id}
              plugin={p}
              hasUpdate={updatedIds.has(p.product_id)}
              isNewGift={giftIds.has(p.product_id)}
              onDownload={() => download(p.product_id, p.name)}
              onView={() => acknowledgeOnView(p.product_id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PluginCard({
  plugin, hasUpdate, isNewGift, onDownload, onView,
}: {
  plugin: OwnedPlugin;
  hasUpdate: boolean;
  isNewGift: boolean;
  onDownload: () => void;
  onView: () => void;
}) {
  return (
    <div className="glass-card overflow-hidden group flex flex-col">
      <div className="chromatic-edge" />
      <div className="glass-noise" />
      <div className="relative z-10 flex flex-col h-full">
        <div
          className="relative aspect-square overflow-hidden"
          style={{ background: plugin.cover_gradient ?? "#190737" }}
        >
          {plugin.cover_url && (
            <img
              src={plugin.cover_url}
              alt={plugin.name}
              className="absolute inset-0 w-full h-full object-cover"
              loading="lazy"
              onLoad={onView}
            />
          )}
          <div className="absolute top-2 left-2 flex flex-col items-start gap-1.5">
            {hasUpdate && (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#FF003C]/20 border border-[#FF003C]/60 text-white font-mono text-[9px] tracking-[0.18em] font-bold backdrop-blur">
                <span className="w-1.5 h-1.5 rounded-full bg-[#FF003C] shadow-[0_0_6px_#FF003C]" />
                UPDATED
              </span>
            )}
            {isNewGift && (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/90 border border-white text-black font-mono text-[9px] tracking-[0.18em] font-bold backdrop-blur">
                <Gift className="w-2.5 h-2.5" strokeWidth={2.4} />
                GIFT
              </span>
            )}
          </div>
        </div>
        <div className="p-3 md:p-4 flex flex-col gap-3 flex-1">
          <div className="font-bold text-sm md:text-base leading-tight line-clamp-2 min-h-[2.5em]">
            {plugin.name}
          </div>
          <button
            onClick={onDownload}
            className="btn-primary !text-xs !py-2 !px-3 inline-flex items-center justify-center gap-1.5 w-full"
          >
            <Download className="w-3.5 h-3.5" /> Download
          </button>
        </div>
      </div>
    </div>
  );
}
