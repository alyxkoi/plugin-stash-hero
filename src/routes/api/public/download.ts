import { createFileRoute } from "@tanstack/react-router";

// 302-redirects to the R2 CUSTOM DOMAIN URL for a purchased plugin. Verifies
// purchase via the checkout session id (works for guest and logged-in orders).
//
// Query params: session_id, product_id
//
// Delegates verification + URL resolution to the r2-download-url edge function
// (guest path: sessionId + productId). This route only ever returns a 302 —
// it must NEVER stream the file body (that would buffer and cap at 2 GB), and
// the target must be on thepluginwarehousefiles.com: the R2 S3 API endpoint
// truncates at 2 GB and custom domains do not support presigned URLs.

export const Route = createFileRoute("/api/public/download")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const sessionId = url.searchParams.get("session_id");
        const productId = url.searchParams.get("product_id");
        if (!sessionId || !productId) {
          return new Response("Missing session_id or product_id", { status: 400 });
        }

        const supabaseUrl = process.env.SUPABASE_URL!;
        const anonKey = process.env.SUPABASE_PUBLISHABLE_KEY!;
        try {
          const res = await fetch(`${supabaseUrl}/functions/v1/r2-download-url`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              apikey: anonKey,
              Authorization: `Bearer ${anonKey}`,
            },
            body: JSON.stringify({ productId, sessionId }),
          });
          const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
          if (!res.ok || !data.url) {
            return new Response(data.error ?? "Download link unavailable.", { status: res.status || 500 });
          }
          return Response.redirect(data.url, 302);
        } catch (e) {
          console.error("[download-redirect] error", e);
          return new Response("Server error.", { status: 500 });
        }
      },
    },
  },
});
