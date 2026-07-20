// First-party campaign-link redirect endpoint.
// Logs a click and 302s to the link's destination with UTM params appended,
// so downstream checkout attribution captures utm_source + utm_campaign.

import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/go/$code")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: link } = await (supabaseAdmin as any)
          .from("campaign_links")
          .select("id, utm_source, utm_campaign, destination_path")
          .eq("code", params.code)
          .maybeSingle();
        if (!link) {
          return new Response(null, { status: 302, headers: { Location: "/" } });
        }
        // Fire-and-log; a click-log failure must not block the redirect.
        try {
          await (supabaseAdmin as any).from("campaign_link_clicks").insert({ link_id: link.id as string });
        } catch { /* ignore */ }

        let dest = (link.destination_path as string) || "/";
        if (!/^https?:\/\//i.test(dest) && !dest.startsWith("/")) dest = "/" + dest;
        // Build the URL relative to a placeholder host so we can safely add search params
        // whether the destination is absolute or relative.
        const abs = /^https?:\/\//i.test(dest);
        const base = abs ? undefined : "http://placeholder.local";
        const url = new URL(dest, base);
        url.searchParams.set("utm_source", (link.utm_source as string) || "");
        if (link.utm_campaign) url.searchParams.set("utm_campaign", link.utm_campaign as string);
        const location = abs ? url.toString() : url.pathname + url.search + url.hash;
        return new Response(null, {
          status: 302,
          headers: {
            Location: location,
            "Cache-Control": "no-store",
          },
        });
      },
    },
  },
  // No page render; the server handler already returned a redirect.
  component: () => null,
});
