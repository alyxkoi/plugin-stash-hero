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
      // A cookie-only pw_cid still represents a real /go/{code} click,
      // so it's a valid attribution signal on its own.
      if (cid) return { utm_source: null, utm_campaign: null, pw_cid: cid, captured_at: new Date().toISOString() };
      return null;
    }
    const parsed = JSON.parse(raw) as StoredUtm;
    if (!parsed?.captured_at) return null;
    // 30-day attribution window. Expire and refuse to attribute after.
    if (Date.now() - new Date(parsed.captured_at).getTime() > MAX_AGE_MS) {
      try { localStorage.removeItem(KEY); } catch { /* ignore */ }
      return null;
    }
    // Never treat a bare utm_campaign (or referrer-derived value) as a source.
    // Attribution requires an explicit utm_source OR a click id.
    if (!parsed.utm_source && !parsed.pw_cid) {
      const cid = readCookie(CID_COOKIE);
      if (cid) return { ...parsed, pw_cid: cid };
      return null;
    }
    if (!parsed.pw_cid) parsed.pw_cid = readCookie(CID_COOKIE);
    return parsed;
  } catch {
    return null;
  }
}

// Called after an order is placed so stale first-touch attribution can't
// leak into a future, unrelated purchase.
export function clearStoredUtm() {
  if (typeof window === "undefined") return;
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
  try {
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${CID_COOKIE}=; Max-Age=0; Path=/; SameSite=Lax${secure}`;
  } catch { /* ignore */ }
}

function captureFromUrl() {
  if (typeof window === "undefined") return;
  try {
    const params = new URLSearchParams(window.location.search);
    const source = params.get("utm_source");
    const campaign = params.get("utm_campaign");
    const cid = params.get("pw_cid");

    // Attribution is set ONLY by explicit URL params from /go/{code} or a
    // tagged campaign URL. Never from document.referrer, never from a
    // bare utm_campaign. If neither utm_source nor pw_cid is present in
    // the landing URL, the visit is "direct" and nothing is stored.
    if (!source && !cid) return;

    if (cid) writeCookie(CID_COOKIE, cid, MAX_AGE_MS);

    const existing = readStoredUtm();
    if (existing) {
      if (cid && !existing.pw_cid) {
        const merged: StoredUtm = { ...existing, pw_cid: cid };
        try { localStorage.setItem(KEY, JSON.stringify(merged)); } catch { /* ignore */ }
      }
      return;
    }

    const record: StoredUtm = {
      utm_source: source,
      utm_campaign: campaign,
      pw_cid: cid,
      captured_at: new Date().toISOString(),
    };
    try { localStorage.setItem(KEY, JSON.stringify(record)); } catch { /* ignore */ }
  } catch { /* ignore */ }
}

// Eager capture at module load — runs before the router can rewrite or
// redirect away from the landing URL and strip the query string.
captureFromUrl();

export function useUtmCapture() {
  useEffect(() => { captureFromUrl(); }, []);
}

// Keeps pw_cid in the URL across internal navigations so attribution
// survives in-app browsers (Instagram/Facebook) where localStorage and
// cookies are frequently isolated or wiped.
export function usePwCidUrlPersistence(pathname: string) {
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const url = new URL(window.location.href);
      if (url.searchParams.get("pw_cid")) return;
      const cid = readStoredUtm()?.pw_cid;
      if (!cid) return;
      url.searchParams.set("pw_cid", cid);
      window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
    } catch { /* ignore */ }
  }, [pathname]);
}


