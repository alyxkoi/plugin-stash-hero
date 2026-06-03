// Minimal AWS SigV4 signer for Cloudflare R2 (S3-compatible).
// Supports presigned URLs (PUT/GET) and signed direct requests (COPY/DELETE/LIST).

const enc = new TextEncoder();
const REGION = "auto";
const SERVICE = "s3";

const ACCOUNT_ID  = () => Deno.env.get("CLOUDFLARE_R2_ACCOUNT_ID")!;
const ACCESS_KEY  = () => Deno.env.get("CLOUDFLARE_R2_ACCESS_KEY_ID")!;
const SECRET_KEY  = () => Deno.env.get("CLOUDFLARE_R2_SECRET_ACCESS_KEY")!;
const BUCKET      = () => Deno.env.get("CLOUDFLARE_R2_BUCKET")!;
const PUBLIC_URL  = () => Deno.env.get("CLOUDFLARE_R2_PUBLIC_URL")?.replace(/\/+$/, "") ?? "";

export function r2PublicUrl(key: string) {
  const base = PUBLIC_URL();
  if (!base) throw new Error("CLOUDFLARE_R2_PUBLIC_URL not configured");
  return `${base}/${key.split("/").map(encodeURIComponent).join("/")}`;
}

export function endpoint() {
  return `https://${ACCOUNT_ID()}.r2.cloudflarestorage.com`;
}

export function bucket() { return BUCKET(); }

async function sha256Hex(data: string | Uint8Array) {
  const buf = typeof data === "string" ? enc.encode(data) : data;
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2, "0")).join("");
}

async function hmac(key: ArrayBuffer | Uint8Array, data: string): Promise<Uint8Array> {
  const k = await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", k, enc.encode(data));
  return new Uint8Array(sig);
}

function amzDate(d: Date) {
  const iso = d.toISOString().replace(/[:-]|\.\d{3}/g, "");
  return { amzDate: iso, dateStamp: iso.slice(0, 8) };
}

function uriEscapePath(path: string) {
  return path.split("/").map(p => encodeURIComponent(p)).join("/");
}

async function signingKey(dateStamp: string) {
  const kDate    = await hmac(enc.encode("AWS4" + SECRET_KEY()), dateStamp);
  const kRegion  = await hmac(kDate, REGION);
  const kService = await hmac(kRegion, SERVICE);
  const kSigning = await hmac(kService, "aws4_request");
  return kSigning;
}

/** Presigned URL — usable from browser. */
export async function presign(opts: {
  method: "PUT" | "GET";
  key: string;
  expiresIn?: number;        // seconds, default 900
  contentType?: string;      // signed as header if PUT
}) {
  const expiresIn = opts.expiresIn ?? 900;
  const now = new Date();
  const { amzDate: amz, dateStamp } = amzDate(now);
  const host = `${ACCOUNT_ID()}.r2.cloudflarestorage.com`;
  const credential = `${ACCESS_KEY()}/${dateStamp}/${REGION}/${SERVICE}/aws4_request`;
  const canonicalUri = `/${bucket()}/${uriEscapePath(opts.key)}`;

  // Signed headers
  const headers: Record<string, string> = { host };
  if (opts.method === "PUT" && opts.contentType) headers["content-type"] = opts.contentType;
  const signedHeadersList = Object.keys(headers).sort();
  const signedHeaders = signedHeadersList.join(";");
  const canonicalHeaders = signedHeadersList.map(h => `${h}:${headers[h]}\n`).join("");

  const params = new URLSearchParams({
    "X-Amz-Algorithm":  "AWS4-HMAC-SHA256",
    "X-Amz-Credential": credential,
    "X-Amz-Date":       amz,
    "X-Amz-Expires":    String(expiresIn),
    "X-Amz-SignedHeaders": signedHeaders,
  });
  const sortedParams = [...params.entries()].sort(([a],[b]) => a < b ? -1 : 1);
  const canonicalQuery = sortedParams.map(([k,v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join("&");

  const canonicalRequest = [
    opts.method,
    canonicalUri,
    canonicalQuery,
    canonicalHeaders,
    signedHeaders,
    "UNSIGNED-PAYLOAD",
  ].join("\n");

  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amz,
    `${dateStamp}/${REGION}/${SERVICE}/aws4_request`,
    await sha256Hex(canonicalRequest),
  ].join("\n");

  const kSigning = await signingKey(dateStamp);
  const sig = await hmac(kSigning, stringToSign);
  const signature = [...sig].map(b => b.toString(16).padStart(2, "0")).join("");

  return `https://${host}${canonicalUri}?${canonicalQuery}&X-Amz-Signature=${signature}`;
}

/** Signs a direct fetch (server -> R2). Returns headers to attach. */
export async function signRequest(opts: {
  method: string;
  key: string;
  extraHeaders?: Record<string, string>;
  body?: string;
  query?: Record<string, string>;
}) {
  const now = new Date();
  const { amzDate: amz, dateStamp } = amzDate(now);
  const host = `${ACCOUNT_ID()}.r2.cloudflarestorage.com`;
  const canonicalUri = `/${bucket()}/${uriEscapePath(opts.key)}`;
  const payloadHash = await sha256Hex(opts.body ?? "");

  const headers: Record<string, string> = {
    host,
    "x-amz-date": amz,
    "x-amz-content-sha256": payloadHash,
    ...(opts.extraHeaders ?? {}),
  };
  const signedHeadersList = Object.keys(headers).map(h => h.toLowerCase()).sort();
  const canonicalHeaders = signedHeadersList.map(h => `${h}:${headers[Object.keys(headers).find(k => k.toLowerCase() === h)!]}\n`).join("");
  const signedHeaders = signedHeadersList.join(";");

  const queryEntries = Object.entries(opts.query ?? {}).sort(([a],[b]) => a < b ? -1 : 1);
  const canonicalQuery = queryEntries.map(([k,v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join("&");

  const canonicalRequest = [
    opts.method,
    canonicalUri,
    canonicalQuery,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");

  const credentialScope = `${dateStamp}/${REGION}/${SERVICE}/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amz,
    credentialScope,
    await sha256Hex(canonicalRequest),
  ].join("\n");

  const kSigning = await signingKey(dateStamp);
  const sig = await hmac(kSigning, stringToSign);
  const signature = [...sig].map(b => b.toString(16).padStart(2, "0")).join("");

  const authorization = `AWS4-HMAC-SHA256 Credential=${ACCESS_KEY()}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  const url = `https://${host}${canonicalUri}${canonicalQuery ? `?${canonicalQuery}` : ""}`;
  return { url, headers: { ...headers, Authorization: authorization } };
}

/** Server-side copy within same bucket. */
export async function copyObject(srcKey: string, dstKey: string) {
  const copySource = `/${bucket()}/${uriEscapePath(srcKey)}`;
  const { url, headers } = await signRequest({
    method: "PUT",
    key: dstKey,
    extraHeaders: { "x-amz-copy-source": copySource },
  });
  const res = await fetch(url, { method: "PUT", headers });
  if (!res.ok) throw new Error(`CopyObject failed ${res.status}: ${await res.text()}`);
}

export async function deleteObject(key: string) {
  const { url, headers } = await signRequest({ method: "DELETE", key });
  const res = await fetch(url, { method: "DELETE", headers });
  if (!res.ok && res.status !== 404) throw new Error(`DeleteObject failed ${res.status}: ${await res.text()}`);
}

/** List with optional prefix. Returns parsed Contents. */
export async function listObjects(prefix: string): Promise<Array<{ Key: string; LastModified: string; Size: number }>> {
  const { url, headers } = await signRequest({
    method: "GET",
    key: "", // listing is bucket-level; we'll target bucket root
    query: { "list-type": "2", prefix },
  });
  // override canonicalUri to bucket root
  const bucketUrl = url.replace(`/${bucket()}/`, `/${bucket()}/`).replace(/\/\?/, "?");
  // Re-sign properly with bucket root key
  const { url: lurl, headers: lhdrs } = await signListing(prefix);
  const res = await fetch(lurl, { method: "GET", headers: lhdrs });
  if (!res.ok) throw new Error(`ListObjects failed ${res.status}: ${await res.text()}`);
  const xml = await res.text();
  const items: Array<{ Key: string; LastModified: string; Size: number }> = [];
  for (const m of xml.matchAll(/<Contents>([\s\S]*?)<\/Contents>/g)) {
    const block = m[1];
    const key = block.match(/<Key>([\s\S]*?)<\/Key>/)?.[1];
    const lm  = block.match(/<LastModified>([\s\S]*?)<\/LastModified>/)?.[1];
    const sz  = block.match(/<Size>(\d+)<\/Size>/)?.[1];
    if (key && lm) items.push({ Key: key, LastModified: lm, Size: Number(sz ?? 0) });
  }
  // touch unused symbols to satisfy strict lints
  void bucketUrl; void headers;
  return items;
}

async function signListing(prefix: string) {
  const now = new Date();
  const { amzDate: amz, dateStamp } = amzDate(now);
  const host = `${ACCOUNT_ID()}.r2.cloudflarestorage.com`;
  const canonicalUri = `/${bucket()}`;
  const payloadHash = await sha256Hex("");
  const headers: Record<string,string> = {
    host,
    "x-amz-date": amz,
    "x-amz-content-sha256": payloadHash,
  };
  const signedHeaders = Object.keys(headers).sort().join(";");
  const canonicalHeaders = Object.keys(headers).sort().map(h => `${h}:${headers[h]}\n`).join("");
  const params = [
    ["list-type", "2"],
    ["prefix", prefix],
  ].sort(([a],[b]) => a < b ? -1 : 1);
  const canonicalQuery = params.map(([k,v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join("&");
  const canonicalRequest = ["GET", canonicalUri, canonicalQuery, canonicalHeaders, signedHeaders, payloadHash].join("\n");
  const credentialScope = `${dateStamp}/${REGION}/${SERVICE}/aws4_request`;
  const stringToSign = ["AWS4-HMAC-SHA256", amz, credentialScope, await sha256Hex(canonicalRequest)].join("\n");
  const kSigning = await signingKey(dateStamp);
  const sig = await hmac(kSigning, stringToSign);
  const signature = [...sig].map(b => b.toString(16).padStart(2, "0")).join("");
  const authorization = `AWS4-HMAC-SHA256 Credential=${ACCESS_KEY()}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  return {
    url: `https://${host}${canonicalUri}?${canonicalQuery}`,
    headers: { ...headers, Authorization: authorization },
  };
}

export function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export function sanitizeFilename(s: string) {
  return s.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-120);
}
