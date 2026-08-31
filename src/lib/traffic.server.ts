import { createHash } from "crypto";

// Confident bot / crawler / scripting signals only. Missing or ambiguous user
// agents remain countable so real visitors are not silently discarded.
const BOT_UA_RE =
  /(bot\b|bot\/|crawler|spider|slurp|facebookexternalhit|facebot|twitterbot|slackbot|discordbot|telegrambot|linkedinbot|pinterestbot|redditbot|googlebot|bingbot|duckduckbot|yandex|baiduspider|ahrefs|semrushbot|mj12bot|applebot|petalbot|headlesschrome|phantomjs|puppeteer|playwright|selenium|lighthouse|pagespeed|gtmetrix|pingdom|uptimerobot|curl\/|wget|python-requests|python-urllib|node-fetch|go-http-client|scrapy|prerender|nikto|acunetix|nuclei|zgrab)/i;

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

export function isPrefetchRequest(headers: Headers): boolean {
  const purpose = (headers.get("purpose") || headers.get("x-purpose") || "").toLowerCase();
  if (purpose === "prefetch" || purpose === "preview") return true;
  const moz = (headers.get("x-moz") || "").toLowerCase();
  if (moz === "prefetch") return true;
  const sec = (headers.get("sec-purpose") || "").toLowerCase();
  return sec.includes("prefetch") || sec.includes("preview");
}

export function requestTrafficIdentity(request: Request) {
  const userAgent = request.headers.get("user-agent") || "";
  const ip = firstIp(request.headers);
  return {
    visitorHash: ip || userAgent ? sha256(`${ip}|${userAgent}`) : null,
    isBot: BOT_UA_RE.test(userAgent),
    isPrefetch: isPrefetchRequest(request.headers),
  };
}
