// One-time admin tool: apply CORS to the R2 bucket via S3 PutBucketCors,
// then read it back with GetBucketCors. Requires R2 token with Admin
// (bucket-level) permissions, not just Object Read/Write.
import { corsHeaders, requireAdmin, json } from "../_shared/auth.ts";

const enc = new TextEncoder();
const REGION = "auto";
const SERVICE = "s3";

const ACCOUNT_ID = () => Deno.env.get("CLOUDFLARE_R2_ACCOUNT_ID")!;
const ACCESS_KEY = () => Deno.env.get("CLOUDFLARE_R2_ACCESS_KEY_ID")!;
const SECRET_KEY = () => Deno.env.get("CLOUDFLARE_R2_SECRET_ACCESS_KEY")!;
const BUCKET     = () => {
  const raw = Deno.env.get("CLOUDFLARE_R2_BUCKET") ?? "";
  // Strip whitespace, surrounding quotes, leading/trailing slashes, accidental URL prefix.
  let name = raw.trim().replace(/^["']|["']$/g, "");
  if (/^https?:\/\//i.test(name)) {
    try { name = new URL(name).pathname.replace(/^\/+|\/+$/g, ""); } catch { /* ignore */ }
  }
  name = name.replace(/^\/+|\/+$/g, "");
  return name;
};

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
async function signingKey(dateStamp: string) {
  const kDate    = await hmac(enc.encode("AWS4" + SECRET_KEY()), dateStamp);
  const kRegion  = await hmac(kDate, REGION);
  const kService = await hmac(kRegion, SERVICE);
  return await hmac(kService, "aws4_request");
}

async function signedFetch(opts: {
  method: string;
  query: Record<string, string>;
  body?: string;
  extraHeaders?: Record<string, string>;
}) {
  const now = new Date();
  const { amzDate: amz, dateStamp } = amzDate(now);
  const host = `${ACCOUNT_ID()}.r2.cloudflarestorage.com`;
  const canonicalUri = `/${BUCKET()}`;
  const body = opts.body ?? "";
  const payloadHash = await sha256Hex(body);

  const headers: Record<string, string> = {
    host,
    "x-amz-date": amz,
    "x-amz-content-sha256": payloadHash,
    ...(opts.extraHeaders ?? {}),
  };
  const sortedHeaderKeys = Object.keys(headers).map(h => h.toLowerCase()).sort();
  const canonicalHeaders = sortedHeaderKeys
    .map(h => `${h}:${headers[Object.keys(headers).find(k => k.toLowerCase() === h)!]}\n`)
    .join("");
  const signedHeaders = sortedHeaderKeys.join(";");

  const qEntries = Object.entries(opts.query).sort(([a],[b]) => a < b ? -1 : 1);
  const canonicalQuery = qEntries.map(([k,v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join("&");

  const canonicalRequest = [opts.method, canonicalUri, canonicalQuery, canonicalHeaders, signedHeaders, payloadHash].join("\n");
  const credentialScope = `${dateStamp}/${REGION}/${SERVICE}/aws4_request`;
  const stringToSign = ["AWS4-HMAC-SHA256", amz, credentialScope, await sha256Hex(canonicalRequest)].join("\n");
  const kSigning = await signingKey(dateStamp);
  const sig = await hmac(kSigning, stringToSign);
  const signature = [...sig].map(b => b.toString(16).padStart(2, "0")).join("");
  const authorization = `AWS4-HMAC-SHA256 Credential=${ACCESS_KEY()}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const url = `https://${host}${canonicalUri}?${canonicalQuery}`;
  return await fetch(url, {
    method: opts.method,
    headers: { ...headers, Authorization: authorization },
    body: body || undefined,
  });
}

const CORS_XML = `<?xml version="1.0" encoding="UTF-8"?>
<CORSConfiguration xmlns="http://s3.amazonaws.com/doc/2006-03-01/">
  <CORSRule>
    <AllowedOrigin>*</AllowedOrigin>
    <AllowedMethod>PUT</AllowedMethod>
    <AllowedMethod>GET</AllowedMethod>
    <AllowedMethod>HEAD</AllowedMethod>
    <AllowedHeader>*</AllowedHeader>
    <ExposeHeader>ETag</ExposeHeader>
    <MaxAgeSeconds>3600</MaxAgeSeconds>
  </CORSRule>
</CORSConfiguration>`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    await requireAdmin(req);

    // Compute MD5 of body for S3 PutBucketCors (required by some S3 impls).
    const md5Buf = await crypto.subtle.digest("MD5" as any, enc.encode(CORS_XML)).catch(() => null);
    const extraHeaders: Record<string, string> = { "content-type": "application/xml" };
    if (md5Buf) {
      const b64 = btoa(String.fromCharCode(...new Uint8Array(md5Buf)));
      extraHeaders["content-md5"] = b64;
    }

    const putRes = await signedFetch({
      method: "PUT",
      query: { cors: "" },
      body: CORS_XML,
      extraHeaders,
    });
    const putText = await putRes.text();

    const bucketDebug = {
      bucket: BUCKET(),
      bucketLength: BUCKET().length,
      host: `${ACCOUNT_ID()}.r2.cloudflarestorage.com`,
      url: `https://${ACCOUNT_ID()}.r2.cloudflarestorage.com/${BUCKET()}?cors=`,
    };

    if (!putRes.ok) {
      const accessDenied = putRes.status === 403 || /AccessDenied|Forbidden/i.test(putText);
      const invalidName  = /InvalidBucketName/i.test(putText);
      return json({
        ok: false,
        step: "PutBucketCors",
        status: putRes.status,
        response: putText,
        debug: bucketDebug,
        ...(accessDenied ? {
          hint: "Your R2 API token only has Object-level permissions. PutBucketCors requires bucket-level Admin. Cloudflare dashboard → R2 → Manage R2 API Tokens → create a token with 'Admin Read & Write' scoped to the bucket, then update CLOUDFLARE_R2_ACCESS_KEY_ID and CLOUDFLARE_R2_SECRET_ACCESS_KEY.",
        } : {}),
        ...(invalidName ? {
          hint: `R2 rejected the bucket name '${bucketDebug.bucket}' (length ${bucketDebug.bucketLength}). Update the CLOUDFLARE_R2_BUCKET secret to exactly the bucket name (no URL, no slashes, no quotes). Note: R2 bucket names are lowercase — if your bucket really is 'PLUGINWAREHOUSE' in the dashboard, R2 stores it as 'pluginwarehouse'.`,
        } : {}),
      }, 500);
    }

    const getRes = await signedFetch({ method: "GET", query: { cors: "" } });
    const getText = await getRes.text();

    return json({
      ok: true,
      debug: bucketDebug,
      put: { status: putRes.status },
      get: { status: getRes.status, body: getText },
    });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("set-r2-cors error", e);
    return json({ error: (e as Error).message ?? "Internal error" }, 500);
  }
});
