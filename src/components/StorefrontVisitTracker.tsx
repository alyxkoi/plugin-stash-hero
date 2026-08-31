import { useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";

let lastPath = "";
let lastSentAt = 0;

export function StorefrontVisitTracker() {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });

  useEffect(() => {
    if (pathname.startsWith("/dashboard")) return;

    const now = Date.now();
    if (pathname === lastPath && now - lastSentAt < 1_000) return;
    lastPath = pathname;
    lastSentAt = now;

    const body = JSON.stringify({
      path: pathname,
      referrer: document.referrer || null,
    });

    try {
      if (navigator.sendBeacon?.(
        "/api/public/visit",
        new Blob([body], { type: "application/json" }),
      )) {
        return;
      }
    } catch {
      // The keepalive fallback below is equally non-blocking.
    }

    void fetch("/api/public/visit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => undefined);
  }, [pathname]);

  return null;
}
