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
 * That is already solved at the source: the entitlement endpoint issues a
 * short-lived presigned R2 URL carrying
 *   Content-Disposition: attachment; filename="<Product Name>.zip"
 * so plain browser navigation saves the correct filename, streams straight
 * from R2 to disk, supports Range requests / 206 Partial Content (resumable),
 * and has no size ceiling at all.
 *
 * THE ONLY CORRECT SHAPE:
 *   1. ask the server to verify entitlement and hand back a URL
 *   2. navigate the browser to that URL
 *
 * An ESLint rule (see eslint.config.js) fails the build if buffering APIs
 * appear anywhere in src/. Keep it that way.
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

  navigateToFile(url);
  return true;
}

/**
 * Plain anchor navigation. No fetch, no blob, no `download` attribute (it is
 * ignored cross-origin anyway — the filename comes from Content-Disposition).
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
