import { createFileRoute, Link } from "@tanstack/react-router";
import { Heart } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { GlassCard } from "@/components/GlassCard";
import { ProductCard } from "@/components/ProductCard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Category, Product } from "@/lib/mock-data";

export const Route = createFileRoute("/account/saved")({
  head: () => ({ meta: [{ title: "Saved — Plugin Warehouse" }] }),
  component: SavedPage,
});

type ProductRow = {
  id: string; slug: string; name: string; maker: string; category: string;
  formats: string[] | null; daws: string[] | null; version: string | null;
  price: number; compare_at_price: number | null;
  cover_url: string | null; cover_gradient: string | null;
  is_free: boolean | null; updated_at: string;
};

function toProduct(r: ProductRow): Product {
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    maker: r.maker || "",
    category: ((r.category ?? "").toString().trim().toLowerCase() as Category),
    daws: r.daws ?? [],
    formats: r.formats ?? [],
    version: r.version ?? "1.0",
    fileSize: "—",
    updated: new Date(r.updated_at).toLocaleDateString(undefined, { month: "short", year: "numeric" }),
    price: Number(r.price) || 0,
    compareAtPrice: r.compare_at_price ? Number(r.compare_at_price) : undefined,
    tagline: "",
    description: "",
    coverGradient: r.cover_gradient ?? "linear-gradient(135deg,#3a0a4a,#7b0a5a)",
    coverUrl: r.cover_url,
    isFree: !!r.is_free,
  };
}

function SavedPage() {
  const { user, loading } = useAuth();

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["saved-products", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Product[]> => {
      const { data, error } = await supabase
        .from("saved_items")
        .select("saved_at, products:product_id(id,slug,name,maker,category,formats,daws,version,price,compare_at_price,cover_url,cover_gradient,is_free,updated_at)")
        .eq("user_id", user!.id)
        .order("saved_at", { ascending: false });
      if (error) throw error;
      return (data ?? [])
        .map((row: { products: ProductRow | null }) => row.products)
        .filter((p): p is ProductRow => !!p)
        .map(toProduct);
    },
  });

  if (loading) return <div className="py-24 text-center font-mono text-white/50">Loading…</div>;

  if (!user) {
    return (
      <GlassCard className="p-12 text-center">
        <Heart className="w-20 h-20 mx-auto mb-6 text-white/30" strokeWidth={1.2} />
        <h2 className="font-black text-3xl tracking-tight mb-2">LOG IN TO VIEW YOUR SAVED</h2>
        <p className="text-white/65 mb-8">Saving requires an account.</p>
        <Link to="/login" className="btn-primary">LOG IN →</Link>
      </GlassCard>
    );
  }

  return (
    <div className="space-y-8">
      <header>
        <div className="font-mono text-xs tracking-[0.18em] text-[var(--accent-red-glow)] mb-3">YOUR SAVED PLUGINS</div>
        <h1 className="font-black text-[clamp(2.25rem,5vw,4rem)] leading-[0.95] tracking-tight chrome-text">SAVED</h1>
        <div className="mt-4 font-mono text-[11px] tracking-[0.14em] text-white/55">
          {products.length} {products.length === 1 ? "PLUGIN" : "PLUGINS"} SAVED
        </div>
      </header>

      {isLoading ? (
        <div className="py-16 text-center font-mono text-white/50">Loading…</div>
      ) : products.length === 0 ? (
        <GlassCard className="p-12 text-center">
          <Heart className="w-20 h-20 mx-auto mb-6 text-white/30" strokeWidth={1.2} />
          <h2 className="font-black text-3xl tracking-tight mb-2">NOTHING SAVED YET.</h2>
          <p className="text-white/65 mb-8">Tap the heart on any plugin to save it here.</p>
          <Link to="/shop" className="btn-primary">BROWSE THE WAREHOUSE →</Link>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {products.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
    </div>
  );
}
