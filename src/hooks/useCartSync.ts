import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useStore, actions } from "@/lib/store";
import type { Product } from "@/lib/mock-data";

type Row = {
  id: string; slug: string; name: string; maker: string; category: string; sub_type: string | null;
  daws: string[]; formats: string[]; version: string | null; file_size: string | null;
  price: number; compare_at_price: number | null; tagline: string | null; description: string | null;
  cover_gradient: string | null; cover_url: string | null;
  is_new: boolean; is_bestseller: boolean; is_featured: boolean; is_free: boolean;
  updated_at: string;
};

function toProduct(r: Row): Product {
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    maker: r.maker,
    category: r.category as Product["category"],
    subType: r.sub_type ?? undefined,
    daws: r.daws ?? [],
    formats: r.formats ?? [],
    version: r.version ?? "",
    fileSize: r.file_size ?? undefined,
    updated: r.updated_at,
    price: Number(r.price),
    compareAtPrice: r.compare_at_price != null ? Number(r.compare_at_price) : undefined,
    tagline: r.tagline ?? "",
    description: r.description ?? "",
    coverGradient: r.cover_gradient ?? "linear-gradient(135deg,#111,#222)",
    coverUrl: r.cover_url,
    isNew: r.is_new, isBestseller: r.is_bestseller, isFeatured: r.is_featured, isFree: r.is_free,
  };
}

/**
 * Persist the cart for logged-in users:
 * - On sign-in: merge local cart with server cart, upload the union, reflect in local state.
 * - After sign-in: push every cart mutation to the server (upsert new/changed, delete removed).
 * - On sign-out: keep local cart as session-only.
 */
export function useCartSync() {
  const { user, loading } = useAuth();
  const cart = useStore((s) => s.cart);
  const hydrated = useRef(false);
  const lastUserId = useRef<string | null>(null);
  const syncing = useRef(false);

  // Load + merge on login
  useEffect(() => {
    if (loading) return;
    if (!user) { hydrated.current = false; lastUserId.current = null; return; }
    if (lastUserId.current === user.id) return;
    lastUserId.current = user.id;

    (async () => {
      syncing.current = true;
      try {
        const { data: serverRows } = await supabase
          .from("cart_items")
          .select("product_id, qty, products(*)")
          .eq("user_id", user.id);

        const local = cart;
        const serverQty = new Map(
          (serverRows ?? []).map((row) => [row.product_id as string, Number(row.qty)]),
        );
        const merged = new Map<string, { product: Product; qty: number }>();

        // seed with local (indexed by product id, fall back to slug)
        for (const it of local) {
          const key = it.product.id ?? it.product.slug;
          merged.set(key, { product: it.product, qty: it.qty });
        }
        // merge server items (server wins on qty if higher)
        for (const row of serverRows ?? []) {
          const p = row.products as Row | null;
          if (!p) continue;
          const prod = toProduct(p);
          const key = prod.id ?? prod.slug;
          const existing = merged.get(key);
          if (existing) existing.qty = Math.max(existing.qty, row.qty as number);
          else merged.set(key, { product: prod, qty: row.qty as number });
        }

        const mergedArr = Array.from(merged.values());
        actions.setCart(mergedArr);

        // Push only new/changed rows. Re-upserting unchanged rows refreshes
        // updated_at and prevents the abandoned-cart timer from ever maturing.
        if (mergedArr.length > 0) {
          const upserts = mergedArr
            .filter((i) => i.product.id)
            .map((i) => ({ user_id: user.id, product_id: i.product.id!, qty: i.qty }))
            .filter((row) => serverQty.get(row.product_id) !== row.qty);
          if (upserts.length > 0) {
            await supabase.from("cart_items").upsert(upserts, { onConflict: "user_id,product_id" });
          }
        }
        hydrated.current = true;
      } finally {
        syncing.current = false;
      }
    })();
  }, [user, loading, cart]);

  // Sync mutations to server after initial hydration
  useEffect(() => {
    if (!user || !hydrated.current || syncing.current) return;
    const timer = setTimeout(async () => {
      const rowsToUpsert = cart
        .filter((i) => i.product.id)
        .map((i) => ({ user_id: user.id, product_id: i.product.id!, qty: i.qty }));

      // Fetch current server ids to compute deletions
      const { data: current } = await supabase
        .from("cart_items")
        .select("product_id, qty")
        .eq("user_id", user.id);
      const currentIds = new Set((current ?? []).map((r) => r.product_id as string));
      const currentQty = new Map(
        (current ?? []).map((row) => [row.product_id as string, Number(row.qty)]),
      );
      const nextIds = new Set(rowsToUpsert.map((r) => r.product_id));
      const toDelete = [...currentIds].filter((id) => !nextIds.has(id));
      const changedRows = rowsToUpsert.filter(
        (row) => currentQty.get(row.product_id) !== row.qty,
      );

      if (toDelete.length > 0) {
        await supabase.from("cart_items").delete().eq("user_id", user.id).in("product_id", toDelete);
      }
      if (changedRows.length > 0) {
        await supabase.from("cart_items").upsert(changedRows, { onConflict: "user_id,product_id" });
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [cart, user]);
}
