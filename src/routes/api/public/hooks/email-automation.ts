import { createFileRoute } from "@tanstack/react-router";

// Scheduled every 15 minutes by pg_cron. Runs the behavioral email sequences.
export const Route = createFileRoute("/api/public/hooks/email-automation")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // Supabase publishable/anon keys are intentionally public and must not
        // authorize a route capable of sending email to the entire audience.
        const expected = process.env.EMAIL_AUTOMATION_CRON_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
        const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
        const provided =
          request.headers.get("x-cron-secret") ??
          request.headers.get("apikey") ??
          bearer;

        if (!expected) {
          console.error("[email-automation] no cron secret is configured");
          return new Response(JSON.stringify({ error: "Email automation is not configured" }), {
            status: 503,
            headers: { "Content-Type": "application/json" },
          });
        }

        if (!provided || provided !== expected) {
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
