import { useEffect } from "react";

// First-touch UTM + click-id persistence.
// Captured once on landing; subsequent navigations never overwrite an
// already-stored first touch (or a stored click id with a blank one).
// Checkout reads from here so attribution survives multi-page browsing
// AND client-side redirects that strip the original query string.

export type StoredUtm = {
  utm_source: string | null;
  utm_campaign: string | null;
  pw_cid: string | null;
  captured_at: string;
};

const KEY = "pw_utm_v1";
const CID_COOKIE = "pw_cid";
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp("(?:^|; )" + name.replace(/[.$?*|{}()[\]\\/+^]/g, "\\$&") + "=([^;]*)"));
  return m ? decodeURIComponent(m[1]) : null;
}
function writeCookie(name: string, value: string, maxAgeMs: number) {
  if (typeof document === "undefined") return;
  const secure = typeof window !== "undefined" && window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${name}=${encodeURIComponent(value)}; Max-Age=${Math.floor(maxAgeMs / 1000)}; Path=/; SameSite=Lax${secure}`;
}

export function readStoredUtm(): StoredUtm | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      const cid = readCookie(CID_COOKIE);
      if (cid) return { utm_source: null, utm_campaign: null, pw_cid: cid, captured_at: new Date().toISOString() };
      return null;
    }
    const parsed = JSON.parse(raw) as StoredUtm;
    if (!parsed?.captured_at) return null;
    if (Date.now() - new Date(parsed.captured_at).getTime() > MAX_AGE_MS) {
      localStorage.removeItem(KEY);
      return null;
    }
    // Cookie is the durable fallback; prefer stored cid but fall back to cookie.
    if (!parsed.pw_cid) parsed.pw_cid = readCookie(CID_COOKIE);
    return parsed;
  } catch {
    return null;
  }
}

export function useUtmCapture() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    // Read as early as possible — before any client-side router redirect
    // has a chance to strip these params from location.search.
    try {
      const params = new URLSearchParams(window.location.search);
      const source = params.get("utm_source");
      const campaign = params.get("utm_campaign");
      const cid = params.get("pw_cid");

      // Never overwrite an already-stored value (esp. with a blank one).
      const existing = readStoredUtm();

      // If a fresh pw_cid is in the URL, persist it to both storages (cookie
      // = durable across localStorage clearing; localStorage = quick read).
      if (cid) {
        writeCookie(CID_COOKIE, cid, MAX_AGE_MS);
      }

      if (existing) {
        // Upgrade an existing record with a pw_cid if we just got one and had none.
        if (cid && !existing.pw_cid) {
          const merged: StoredUtm = { ...existing, pw_cid: cid };
          try { localStorage.setItem(KEY, JSON.stringify(merged)); } catch { /* ignore */ }
        }
        return;
      }

      if (!source && !campaign && !cid) return;

      const record: StoredUtm = {
        utm_source: source,
        utm_campaign: campaign,
        pw_cid: cid,
        captured_at: new Date().toISOString(),
      };
      try { localStorage.setItem(KEY, JSON.stringify(record)); } catch { /* ignore */ }
    } catch { /* ignore */ }
  }, []);
}
