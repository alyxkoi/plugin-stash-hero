import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ActiveSale = {
  id: string;
  name: string;
  slug: string;
  headline: string | null;
  subheadline: string | null;
  discount_pct: number;
  scope: "all" | "categories" | "selected";
  theme_color: string | null;
  start_at: string;
  end_at: string;
};

// Returns the currently-active sale (status='active' AND now between start/end),
// or null. Also auto-refreshes when the end date passes so the banner disappears.
export function useActiveSale() {
  const [sale, setSale] = useState<ActiveSale | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const nowIso = new Date().toISOString();
      const { data } = await supabase
        .from("sale_events")
        .select("id, name, slug, headline, subheadline, discount_pct, scope, theme_color, start_at, end_at, status")
        .in("status", ["active", "scheduled", "ended"])
        .lte("start_at", nowIso)
        .gte("end_at", nowIso)
        .order("start_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cancelled) return;
      setSale((data as ActiveSale) ?? null);
      setLoaded(true);
    }
    load();
    // Re-check frequently and react to sale deletes/updates so banners disappear cleanly.
    const i = setInterval(load, 15_000);
    // Unique per-mount channel name — reusing a single name across mounts
    // (or across the two components that call this hook) throws
    // "cannot add postgres_changes callbacks after subscribe()", which
    // bubbles up to the root errorComponent as "Something went wrong".
    const channel = supabase
      .channel(`active-sale-refresh-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "sale_events" }, load)
      .subscribe();
    window.addEventListener("focus", load);
    return () => {
      cancelled = true;
      clearInterval(i);
      window.removeEventListener("focus", load);
      supabase.removeChannel(channel);
    };
  }, []);

  return { sale, loaded };
}
