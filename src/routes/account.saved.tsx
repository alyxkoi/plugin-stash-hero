import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Heart } from "lucide-react";
import { GlassCard } from "@/components/GlassCard";
import { ProductArtwork } from "@/components/ProductArtwork";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type SavedProduct = {
  id: string;
  name: string;
  slug: string | null;
  price: number | null;
  cover_url: string | null;
  cover_gradient: string | null;
};

export const Route = createFileRoute("/account/saved")({
  head: () => ({
    meta: [
      { title: "Saved Plugins — Plugin Warehouse" },
      { name: "description", content: "Every plugin you've saved for later, ready to grab whenever you are." },
      { property: "og:title", content: "Saved Plugins — Plugin Warehouse" },
      { property: "og:description", content: "Every plugin you've saved for later, ready to grab whenever you are." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SavedPage,
});

function SavedPage() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["saved-products", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<SavedProduct[]> => {
      const { data: rows, error } = await supabase
        .from("saved_items")
        .select("product_id, created_at, products(id, name, slug, price, cover_url, cover_gradient)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return ((rows ?? []) as any[])
        .map((r) => r.products)
        .filter(Boolean) as SavedProduct[];
    },
  });

  const items = data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-baseline gap-3">
        <h1 className="font-black text-2xl">SAVED PLUGINS</h1>
        <span className="font-mono text-xs text-white/40">{items.length} saved</span>
      </div>

      {isLoading ? (
        <div className="font-mono text-xs text-white/40">Loading…</div>
      ) : items.length === 0 ? (
        <GlassCard className="p-10 text-center">
          <Heart className="mx-auto mb-4 h-8 w-8 text-white/25" />
          <p className="text-white/65 mb-5">You haven't saved anything yet. Tap the heart on any plugin to keep it here.</p>
          <Link to="/shop" className="btn-primary">BROWSE THE WAREHOUSE →</Link>
        </GlassCard>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((p) => (
            <GlassCard key={p.id} className="p-4">
              <Link
                to="/shop/p/$slug"
                params={{ slug: p.slug ?? p.id }}
                className="block group"
              >
                <ProductArtwork
                  name={p.name}
                  src={p.cover_url}
                  gradient={p.cover_gradient ?? undefined}
                  className="mb-3 aspect-video w-full rounded-xl overflow-hidden"
                />
                <div className="font-black leading-tight group-hover:text-[hsl(var(--accent))] transition-colors">
                  {p.name}
                </div>
                <div className="font-mono text-sm text-white/55 mt-1">
                  {p.price != null ? (p.price === 0 ? "FREE" : `$${p.price.toFixed(2)}`) : ""}
                </div>
              </Link>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
}
