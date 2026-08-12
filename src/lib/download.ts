/* ============================================================================
 * THE ONE AND ONLY PLUGIN DOWNLOAD FUNCTION. DO NOT WRITE ANOTHER ONE.
 * ============================================================================
 *
 * READ THIS BEFORE TOUCHING DOWNLOAD CODE.
 *
 * Plugin zips are BIG (30 GB+). The file bytes must NEVER pass through
 * JavaScript — not on the client, not on the server. The moment any download
 * path does:
 *
 *     fetch(url).then(r => r.blob())        // ❌
 *     fetch(url).then(r => r.arrayBuffer()) // ❌
 *     URL.createObjectURL(blob)             // ❌
 *     new FileReader()                      // ❌
 *
 * every download silently truncates at exactly 2,147,483,648 bytes (2 GB,
 * the 32-bit signed int limit). This bug has been reintroduced MULTIPLE times,
 * always because someone wanted a friendly filename via `a.download` (which is
 * ignored for cross-origin URLs, so blobs "fix" it).
 *
 * SECOND, EQUALLY IMPORTANT RULE — THE HOST MATTERS:
 *
 *   Downloads MUST be served from the R2 CUSTOM DOMAIN
 *   (https://thepluginwarehousefiles.com/...).
 *
 *   The R2 S3 API endpoint (*.r2.cloudflarestorage.com) TRUNCATES responses at
 *   exactly 2 GB. Presigned URLs are ONLY possible on that S3 endpoint —
 *   R2 custom domains do NOT support presigning — so introducing a presigned
 *   URL anywhere in the download path silently reintroduces the 2 GB ceiling.
 *   DO NOT PRESIGN DOWNLOADS. Entitlement is verified server-side; access
 *   control after that comes from the long, unguessable random object path.
 *
 * THE ONLY CORRECT SHAPE:
 *   1. ask the server to verify entitlement and hand back a custom-domain URL
 *   2. navigate the browser to that URL
 *
 * ESLint rules (see eslint.config.js) fail the build if buffering APIs, the S3
 * endpoint, or presign helpers appear anywhere in src/. Keep it that way.
 * ========================================================================= */

import { supabase } from "@/integrations/supabase/client";
import { guestDownloadUrl } from "@/lib/checkout.functions";
import { toast } from "sonner";

type DownloadArgs = {
  productId: string | null | undefined;
  /** Stripe checkout session id — guest (not logged in) post-purchase path. */
  sessionId?: string | null;
  /** True when the visitor has no account session. */
  guest?: boolean;
};

/**
 * Verifies entitlement server-side, then NAVIGATES the browser to the file.
 * Returns true when a download was started.
 */
export async function downloadPlugin({ productId, sessionId, guest }: DownloadArgs): Promise<boolean> {
  if (!productId) {
    toast.error("Missing product id");
    return false;
  }

  let url: string | undefined;
  let error: string | undefined;

  if (guest && sessionId) {
    const res = await guestDownloadUrl({ data: { sessionId, productId } });
    url = res.url ?? undefined;
    error = res.error ?? undefined;
  } else {
    const { data, error: fnErr } = await supabase.functions.invoke("r2-download-url", {
      body: { productId, ...(sessionId ? { sessionId } : {}) },
    });
    url = data?.url;
    error = data?.error ?? fnErr?.message;
  }

  if (!url) {
    toast.error(error ?? "Download failed");
    return false;
  }

  try {
    assertCustomDomain(url);
  } catch (e) {
    console.error("[download] blocked bad download host", e);
    toast.error("Download blocked: misconfigured file host. Please contact support.");
    return false;
  }

  navigateToFile(url);
  return true;
}

/** The ONLY host allowed to serve plugin files. See the header comment. */
export const DOWNLOAD_HOST = "thepluginwarehousefiles.com";

/**
 * Regression guard. A URL on the R2 S3 API endpoint (or any presigned URL,
 * which can only exist on that endpoint) truncates at exactly 2 GB — so we
 * refuse to serve it instead of handing the user a corrupt file.
 */
function assertCustomDomain(url: string) {
  let host: string;
  try {
    host = new URL(url).host.toLowerCase();
  } catch {
    throw new Error(`Download URL is not a valid URL: ${url}`);
  }
  if (host !== DOWNLOAD_HOST) {
    throw new Error(
      `Download URL host is "${host}" but must be "${DOWNLOAD_HOST}". ` +
        `The R2 S3 API endpoint truncates at 2 GB and custom domains do not support ` +
        `presigned URLs — the download path must never presign.`,
    );
  }
  if (/[?&]X-Amz-(Signature|Credential)=/i.test(url)) {
    throw new Error("Download URL is presigned; presigned URLs truncate at 2 GB.");
  }
}

/**
 * Plain anchor navigation. No fetch, no blob, no `download` attribute (it is
 * ignored cross-origin anyway — the filename comes from the object key /
 * Content-Disposition stored on the object).
 * The browser streams R2 -> disk with zero JS involvement, so size is
 * unbounded and 64-bit safe by construction.
 */
function navigateToFile(url: string) {
  const a = document.createElement("a");
  a.href = url;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
}
