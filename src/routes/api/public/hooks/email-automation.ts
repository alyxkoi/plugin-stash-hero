import { createFileRoute } from "@tanstack/react-router";

// Authenticated manual/webhook entry point. Production recurrence is handled
// by the Worker's 15-minute scheduled event in src/server.ts.
export const Route = createFileRoute("/api/public/hooks/email-automation")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // Supabase publishable/anon keys are intentionally public and must not
        // authorize a route capable of sending email to the entire audience.
        const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
        const provided = request.headers.get("x-cron-secret") ?? bearer;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: cfg } = await supabaseAdmin
          .from("email_automation_config")
          .select("cron_secret")
          .maybeSingle();

        const accepted = [
          cfg?.cron_secret ?? "",
          process.env.EMAIL_AUTOMATION_CRON_SECRET ?? "",
          process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
        ].filter(Boolean);

        if (accepted.length === 0) {
          console.error("[email-automation] no cron secret is configured");
          return new Response(JSON.stringify({ error: "Email automation is not configured" }), {
            status: 503,
            headers: { "Content-Type": "application/json" },
          });
        }

        if (!provided || !accepted.includes(provided)) {
          console.error("[email-automation] unauthorized trigger attempt");
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
