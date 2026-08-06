import { createFileRoute } from "@tanstack/react-router";

// Scheduled every 15 minutes by pg_cron. Runs the behavioral email sequences.
export const Route = createFileRoute("/api/public/hooks/email-automation")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = request.headers.get("apikey") ?? "";
        const allowed = [
          process.env.SUPABASE_ANON_KEY,
          process.env.SUPABASE_PUBLISHABLE_KEY,
          process.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined,
        ].filter(Boolean) as string[];
        const expected = allowed.includes(key) ? key : "";

        if (!key || !expected || key !== expected) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }
        try {
          const body = (await request.json().catch(() => ({}))) as {
            dryRun?: boolean;
            onlyEmail?: string;
          };
          const { runBehavioralEmailJob } = await import("@/lib/behavioral-email.server");
          const stats = await runBehavioralEmailJob({
            dryRun: body.dryRun === true,
            onlyEmail: body.onlyEmail,
          });
          console.log("[email-automation]", stats);
          return new Response(JSON.stringify({ ok: true, ...stats }), {
            headers: { "Content-Type": "application/json" },
          });
        } catch (e) {
          console.error("[email-automation] failed", e);
          return new Response(JSON.stringify({ ok: false, error: (e as Error).message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
