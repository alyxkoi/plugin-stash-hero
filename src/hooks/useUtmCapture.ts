import { useEffect } from "react";

// First-touch UTM persistence.
// If the current URL carries utm params, store them once in localStorage.
// Subsequent landings never overwrite an already-stored first touch.
// Checkout reads from here so attribution survives multi-page browsing.

export type StoredUtm = {
  utm_source: string | null;
  utm_campaign: string | null;
  captured_at: string;
};

const KEY = "pw_utm_v1";
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export function readStoredUtm(): StoredUtm | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredUtm;
    if (!parsed?.captured_at) return null;
    if (Date.now() - new Date(parsed.captured_at).getTime() > MAX_AGE_MS) {
      localStorage.removeItem(KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function useUtmCapture() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const params = new URLSearchParams(window.location.search);
      const source = params.get("utm_source");
      const campaign = params.get("utm_campaign");
      if (!source && !campaign) return;
      const existing = readStoredUtm();
      if (existing) return; // first-touch wins
      const record: StoredUtm = {
        utm_source: source,
        utm_campaign: campaign,
        captured_at: new Date().toISOString(),
      };
      localStorage.setItem(KEY, JSON.stringify(record));
    } catch { /* ignore */ }
  }, []);
}
