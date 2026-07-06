import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ActiveSale = {
  id: string;
  name: string;
  slug: string;
  headline: string | null;
  subheadline: string | null;
  discount_pct: number;
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
        .select("id, name, slug, headline, subheadline, discount_pct, theme_color, start_at, end_at, status")
        .neq("status", "draft")
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
    const channel = supabase
      .channel("active-sale-refresh")
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
