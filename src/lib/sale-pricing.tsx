import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export type SaleScope = "all" | "categories" | "selected";

export type ActiveSaleRow = {
  id: string;
  name: string;
  slug: string;
  discount_pct: number;
  scope: SaleScope;
  categories: string[];
  start_at: string;
  end_at: string;
  status: string;
  productIds: string[];
};

type SalesCtx = {
  loaded: boolean;
  sales: ActiveSaleRow[]; // currently-active (status='active' && now in window)
};

const Ctx = createContext<SalesCtx>({ loaded: false, sales: [] });

/**
 * Loads every currently-active sale event plus its product junctions once,
 * refreshing frequently so newly-active, newly-ended, or deleted sales appear
 * automatically without a full reload.
 */
export function SalePricingProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SalesCtx>({ loaded: false, sales: [] });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const nowIso = new Date().toISOString();
      // "Effectively active" = not a draft AND we're within the window.
      // This lets a sale go live/end automatically even if the stored label is stale.
      const { data: rows } = await supabase
        .from("sale_events")
        .select("id, name, slug, discount_pct, scope, categories, start_at, end_at, status")
        .in("status", ["active", "scheduled", "ended"])
        .lte("start_at", nowIso)
        .gte("end_at", nowIso);
      const list = (rows ?? []) as Omit<ActiveSaleRow, "productIds">[];
      let junction: { sale_event_id: string; product_id: string }[] = [];
      if (list.length > 0) {
        const ids = list.map((s) => s.id);
        const { data: jr } = await supabase
          .from("sale_event_products")
          .select("sale_event_id, product_id")
          .in("sale_event_id", ids);
        junction = jr ?? [];
      }
      const byId = new Map<string, string[]>();
      for (const j of junction) {
        const arr = byId.get(j.sale_event_id) ?? [];
        arr.push(j.product_id);
        byId.set(j.sale_event_id, arr);
      }
      const enriched: ActiveSaleRow[] = list.map((s) => ({
        ...s,
        categories: (s as any).categories ?? [],
        productIds: byId.get(s.id) ?? [],
      }));
      if (!cancelled) setState({ loaded: true, sales: enriched });
    }
    load();
    const i = setInterval(load, 15_000);
    const channel = supabase
      .channel(`sale-pricing-refresh-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "sale_events" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "sale_event_products" }, load)
      .subscribe();
    window.addEventListener("focus", load);
    return () => {
      cancelled = true;
      clearInterval(i);
      window.removeEventListener("focus", load);
      supabase.removeChannel(channel);
    };
  }, []);

  return <Ctx.Provider value={state}>{children}</Ctx.Provider>;
}

/**
 * Given a product, return the best active sale discount that applies to it
 * (highest pct wins if — despite overlap-check — two sales somehow both apply).
 */
export function pickSaleFor(
  sales: ActiveSaleRow[],
  product: { id?: string; category?: string | null },
): { pct: number; sale: ActiveSaleRow } | null {
  let best: { pct: number; sale: ActiveSaleRow } | null = null;
  for (const s of sales) {
    let applies = false;
    if (s.scope === "all") applies = true;
    else if (s.scope === "categories") {
      const cat = (product.category ?? "").toString().toLowerCase();
      applies = !!cat && s.categories.map((c) => c.toLowerCase()).includes(cat);
    } else if (s.scope === "selected") {
      applies = !!product.id && s.productIds.includes(product.id);
    }
    if (applies && (!best || s.discount_pct > best.pct)) {
      best = { pct: s.discount_pct, sale: s };
    }
  }
  return best;
}

export function useSalePricing(product: { id?: string; category?: string | null; price: number; isFree?: boolean }) {
  const { sales, loaded } = useContext(Ctx);
  const { id, category, price, isFree } = product;
  return useMemo(() => {
    if (!loaded || isFree) return { finalPrice: price, originalPrice: price, pct: 0, sale: null as ActiveSaleRow | null };
    const hit = pickSaleFor(sales, { id, category });
    if (!hit) return { finalPrice: price, originalPrice: price, pct: 0, sale: null };
    const finalPrice = Math.round((price * (100 - hit.pct)) * 100 / 100) / 100;
    return { finalPrice, originalPrice: price, pct: hit.pct, sale: hit.sale };
  }, [loaded, sales, id, category, price, isFree]);
}

export function useAllActiveSales() {
  return useContext(Ctx);
}
