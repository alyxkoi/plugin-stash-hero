// First-party campaign-link redirect endpoint.
// Redirects for everyone; only counts real human navigations.
// Bots, prefetches, and repeat hits are logged but marked counted=false.
// Also mints a unique click id (pw_cid) so attribution survives even when
// UTM query strings get stripped by a client-side redirect.

import { createFileRoute } from "@tanstack/react-router";
import { generateClickId } from "@/lib/utm";
import { requestTrafficIdentity } from "@/lib/traffic.server";

// Short dedup window: only collapses double-fires of the same navigation,
// never a genuine repeat visit later in the day.
const DEDUP_MS = 5 * 60 * 1000;

async function logAndRedirect(
  request: Request,
  code: string,
  countable: boolean,
): Promise<Response> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: link } = await (supabaseAdmin as any)
    .from("campaign_links")
    .select("id, utm_source, utm_campaign, utm_content, destination_path")
    .eq("code", code)
    .maybeSingle();
  if (!link) return new Response(null, { status: 302, headers: { Location: "/" } });

  const identity = requestTrafficIdentity(request);
  const { visitorHash: ipUaHash, isBot, isPrefetch: prefetch } = identity;

  let counted = countable && !isBot && !prefetch;

  // Collapse instant double-fires of the same navigation.
  if (counted && ipUaHash) {
    try {
      const since = new Date(Date.now() - DEDUP_MS).toISOString();
      const { data: recent } = await (supabaseAdmin as any)
        .from("campaign_link_clicks")
        .select("id")
        .eq("link_id", link.id)
        .eq("ip_ua_hash", ipUaHash)
        .eq("counted", true)
        .gte("created_at", since)
        .limit(1)
        .maybeSingle();
      if (recent) counted = false;
    } catch { /* dedup lookup failure must never drop a real click */ }
  }

  // Mint a click id for every counted navigation so orders can be attributed
  // via pw_cid even when UTMs get stripped downstream.
  const clickId = counted ? generateClickId() : null;

  // Write the record BEFORE redirecting; a log failure never blocks the link.
  try {
    await (supabaseAdmin as any).from("campaign_link_clicks").insert({
      link_id: link.id as string,
      ip_ua_hash: ipUaHash,
      is_bot: isBot,
      counted,
      click_id: clickId,
    });
  } catch { /* ignore */ }

  let dest = (link.destination_path as string) || "/";
  if (!/^https?:\/\//i.test(dest) && !dest.startsWith("/")) dest = "/" + dest;
  const abs = /^https?:\/\//i.test(dest);
  const base = abs ? undefined : "http://placeholder.local";
  const url = new URL(dest, base);
  if (link.utm_source) url.searchParams.set("utm_source", link.utm_source as string);
  if (link.utm_campaign) url.searchParams.set("utm_campaign", link.utm_campaign as string);
  if ((link as any).utm_content) url.searchParams.set("utm_content", (link as any).utm_content as string);
  if (clickId) url.searchParams.set("pw_cid", clickId);
  const location = abs ? url.toString() : url.pathname + url.search + url.hash;
  return new Response(null, {
    status: 302,
    headers: { Location: location, "Cache-Control": "no-store" },
  });
}


export const Route = createFileRoute("/go/$code")({
  server: {
    handlers: {
      GET: async ({ params, request }) => logAndRedirect(request, params.code, true),
      // HEAD requests (used by crawlers/link checkers) redirect but never count.
      HEAD: async ({ params, request }) => logAndRedirect(request, params.code, false),
    },
  },
  component: () => null,
});
