import { createFileRoute } from "@tanstack/react-router";

// One-click unsubscribe from behavioral (reminder) emails only.
// Does NOT touch Mailchimp broadcast subscription.
export const Route = createFileRoute("/api/public/email/unsubscribe")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const json = (await request.json().catch(() => ({}))) as { email?: string; token?: string };
        const email = (json.email ?? "").trim().toLowerCase();
        const token = (json.token ?? "").trim();
        if (!email || !token) {
          return new Response(JSON.stringify({ ok: false, error: "Missing parameters" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }
        const { unsubToken } = await import("@/lib/behavioral-email.server");
        if (unsubToken(email) !== token) {
          return new Response(JSON.stringify({ ok: false, error: "Invalid link" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { error } = await supabaseAdmin.from("email_preferences").upsert(
          {
            customer_email: email,
            behavioral_emails_enabled: false,
            unsubscribed_at: new Date().toISOString(),
          },
          { onConflict: "customer_email" },
        );
        if (error) {
          console.error("[unsubscribe] failed", error);
          return new Response(JSON.stringify({ ok: false, error: "Could not save preference" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
        return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });
      },
    },
  },
});
