import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

type Search = { e?: string; t?: string };

export const Route = createFileRoute("/unsubscribe")({
  head: () => ({
    meta: [
      { title: "Unsubscribe from reminders — Plugin Warehouse" },
      { name: "description", content: "Stop receiving cart and saved-item reminder emails from Plugin Warehouse." },
      { name: "robots", content: "noindex" },
    ],
  }),
  validateSearch: (s: Record<string, unknown>): Search => ({
    e: typeof s.e === "string" ? s.e : undefined,
    t: typeof s.t === "string" ? s.t : undefined,
  }),
  component: Unsubscribe,
});

function Unsubscribe() {
  const { e, t } = Route.useSearch();
  const [state, setState] = useState<"working" | "done" | "error">("working");

  useEffect(() => {
    if (!e || !t) {
      setState("error");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/public/email/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: e, token: t }),
        });
        const json = (await res.json()) as { ok?: boolean };
        if (!cancelled) setState(json.ok ? "done" : "error");
      } catch {
        if (!cancelled) setState("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [e, t]);

  return (
    <main className="min-h-[70vh] flex items-center justify-center px-5 py-24">
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-white/[0.04] p-8 backdrop-blur-xl">
        <div className="text-[11px] font-mono uppercase tracking-[0.26em] text-[var(--accent-red-glow)]">
          Email preferences
        </div>
        {state === "working" && (
          <h1 className="mt-4 text-2xl font-black uppercase tracking-tight">Updating…</h1>
        )}
        {state === "done" && (
          <>
            <h1 className="mt-4 text-3xl font-black uppercase leading-none tracking-tight">You're unsubscribed</h1>
            <p className="mt-3 text-sm leading-relaxed text-white/60">
              {e} will no longer receive cart or saved-item reminder emails. Order confirmations and newsletter
              broadcasts are unaffected.
            </p>
          </>
        )}
        {state === "error" && (
          <>
            <h1 className="mt-4 text-3xl font-black uppercase leading-none tracking-tight">Link not valid</h1>
            <p className="mt-3 text-sm leading-relaxed text-white/60">
              This unsubscribe link is incomplete or expired. Contact us and we'll take care of it.
            </p>
          </>
        )}
        <a href="/contact-us" className="mt-6 inline-block text-xs font-mono uppercase tracking-widest text-white/50 underline hover:text-white">
          Contact us
        </a>
      </div>
    </main>
  );
}
