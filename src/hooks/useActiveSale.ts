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
        .eq("status", "active")
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
    // Re-check every minute so banner disappears when end_at passes without a reload.
    const i = setInterval(load, 60_000);
    return () => { cancelled = true; clearInterval(i); };
  }, []);

  return { sale, loaded };
}
