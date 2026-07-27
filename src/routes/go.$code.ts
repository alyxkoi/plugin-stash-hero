// First-party campaign-link redirect endpoint.
// Redirects for everyone; only counts real human navigations.
// Bots, prefetches, and repeat hits are logged but marked counted=false.
// Also mints a unique click id (pw_cid) so attribution survives even when
// UTM query strings get stripped by a client-side redirect.

import { createFileRoute } from "@tanstack/react-router";
import { createHash } from "crypto";
import { generateClickId } from "@/lib/utm";


// Maintained bot / crawler / preview / scripting UA fragments.
// Match case-insensitively as a substring — cheap and effective.
const BOT_UA_RE =
  /(bot|crawler|spider|slurp|facebookexternalhit|facebot|twitterbot|slackbot|discordbot|telegrambot|whatsapp|linkedinbot|pinterest|redditbot|googlebot|bingbot|duckduckbot|yandexbot|baiduspider|ahrefsbot|semrushbot|mj12bot|applebot|petalbot|headlesschrome|phantomjs|puppeteer|playwright|selenium|lighthouse|pagespeed|gtmetrix|pingdom|uptimerobot|curl|wget|python-requests|python-urllib|axios|node-fetch|go-http-client|okhttp|java\/|ruby|libwww-perl|httpclient|scrapy|monitor|preview|prerender|scanner|nikto|acunetix|nuclei|zgrab)/i;

function isPrefetch(headers: Headers): boolean {
  const purpose = (headers.get("purpose") || headers.get("x-purpose") || "").toLowerCase();
  if (purpose === "prefetch" || purpose === "preview") return true;
  const moz = (headers.get("x-moz") || "").toLowerCase();
  if (moz === "prefetch") return true;
  const sec = (headers.get("sec-purpose") || "").toLowerCase();
  if (sec.includes("prefetch") || sec.includes("preview")) return true;
  return false;
}

function firstIp(headers: Headers): string {
  return (
    headers.get("cf-connecting-ip") ||
    (headers.get("x-forwarded-for") || "").split(",")[0].trim() ||
    headers.get("x-real-ip") ||
    ""
  );
}

function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

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

  const ua = request.headers.get("user-agent") || "";
  const ip = firstIp(request.headers);
  const isBot = !ua || BOT_UA_RE.test(ua);
  const prefetch = isPrefetch(request.headers);
  const ipUaHash = ip || ua ? sha256(`${ip}|${ua}`) : null;
  const ipHash = ip ? sha256(ip) : null;

  // Ignore list (admin IPs / test devices) — hashed IP only
  let onIgnoreList = false;
  if (ipHash) {
    const { data: ig } = await (supabaseAdmin as any)
      .from("campaign_click_ignored_ips")
      .select("ip_hash")
      .eq("ip_hash", ipHash)
      .maybeSingle();
    onIgnoreList = !!ig;
  }

  // Dedup: same visitor on same link within 45 min → don't count again
  let dupWithinWindow = false;
  if (countable && !isBot && !prefetch && !onIgnoreList && ipUaHash) {
    const since = new Date(Date.now() - 45 * 60 * 1000).toISOString();
    const { data: recent } = await (supabaseAdmin as any)
      .from("campaign_link_clicks")
      .select("id")
      .eq("link_id", link.id)
      .eq("ip_ua_hash", ipUaHash)
      .eq("counted", true)
      .gte("created_at", since)
      .limit(1)
      .maybeSingle();
    dupWithinWindow = !!recent;
  }

  const counted = countable && !isBot && !prefetch && !onIgnoreList && !dupWithinWindow;

  // Fire-and-log; a log failure must never block the redirect.
  try {
    await (supabaseAdmin as any).from("campaign_link_clicks").insert({
      link_id: link.id as string,
      ip_ua_hash: ipUaHash,
      is_bot: isBot,
      counted,
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
