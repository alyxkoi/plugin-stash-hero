import { createFileRoute } from "@tanstack/react-router";
import { requestTrafficIdentity } from "@/lib/traffic.server";

type VisitPayload = {
  path?: unknown;
  referrer?: unknown;
};

function noContent() {
  return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}

export const Route = createFileRoute("/api/public/visit")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const payload = (await request.json()) as VisitPayload;
          const path = typeof payload.path === "string" ? payload.path.slice(0, 500) : "";
          if (!path.startsWith("/") || path.startsWith("/dashboard")) return noContent();

          const referrer =
            typeof payload.referrer === "string" && payload.referrer
              ? payload.referrer.slice(0, 1_000)
              : null;
          const identity = requestTrafficIdentity(request);
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

          await (supabaseAdmin as any).from("storefront_pageviews").insert({
            path,
            referrer,
            visitor_hash: identity.visitorHash,
            is_bot: identity.isBot || identity.isPrefetch,
          });
        } catch {
          // Analytics must never affect the storefront response path.
        }
        return noContent();
      },
    },
  },
});
