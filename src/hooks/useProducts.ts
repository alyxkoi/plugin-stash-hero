import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Product, Category } from "@/lib/mock-data";

type Row = {
  id: string;
  slug: string; name: string; maker: string; category: string;
  formats: string[] | null; daws: string[] | null; version: string | null;
  library_type: string | null;
  tags: string[] | null;
  price: number; compare_at_price: number | null; description: string | null;
  cover_url: string | null; cover_gradient: string | null;
  is_free: boolean | null; is_featured: boolean | null; is_bestseller: boolean | null;
  updated_at: string; published_at: string | null;
};

function mapRow(r: Row): Product {
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    maker: r.maker || "",
    category: ((r.category ?? "").toString().trim().toLowerCase() as Category),
    daws: r.daws ?? [],
    formats: r.formats ?? [],
    version: r.version ?? "1.0",
    libraryType: r.library_type ?? null,
    fileSize: "—",
    updated: new Date(r.updated_at).toLocaleDateString(undefined, { month: "short", year: "numeric" }),
    price: Number(r.price) || 0,
    compareAtPrice: r.compare_at_price ? Number(r.compare_at_price) : undefined,
    tagline: "",
    description: r.description ?? "",
    coverGradient: r.cover_gradient ?? "linear-gradient(135deg,#3a0a4a,#7b0a5a)",
    coverUrl: r.cover_url,
    isFree: !!r.is_free,
    isFeatured: !!r.is_featured,
    isBestseller: !!r.is_bestseller,
  };
}

async function fetchPublished(): Promise<Product[]> {
  const { data, error } = await supabase
    .from("products")
    .select("id,slug,name,maker,category,formats,daws,version,library_type,price,compare_at_price,description,cover_url,cover_gradient,is_free,is_featured,is_bestseller,updated_at,published_at")
    .eq("status", "published")
    .order("published_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data as Row[] ?? []).map(mapRow);
}

export function usePublishedProducts() {
  return useQuery({
    queryKey: ["storefront-products"],
    queryFn: fetchPublished,
    staleTime: 30_000,
  });
}

async function fetchBestsellerIds(limit = 20): Promise<string[]> {
  const { data, error } = await supabase.rpc("get_bestseller_product_ids", { _limit: limit });
  if (error) return [];
  return (data as { product_id: string }[] ?? []).map((r) => r.product_id);
}

export function useBestsellerIds(limit = 20) {
  return useQuery({
    queryKey: ["bestseller-ids", limit],
    queryFn: () => fetchBestsellerIds(limit),
    staleTime: 5 * 60_000,
  });
}
