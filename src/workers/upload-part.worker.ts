/// <reference lib="webworker" />
// Dedicated worker for uploading a single R2 multipart part.
// Runs off the main thread so Chromium's background-tab throttling doesn't
// stall in-flight chunk PUTs. Each worker uploads one part, retries with
// exponential backoff, and posts progress + the final ETag back.

type InMsg = {
  partNumber: number;
  url: string;
  blob: Blob;
  retries: number;
};

type OutMsg =
  | { type: "progress"; partNumber: number; loaded: number }
  | { type: "done"; partNumber: number; etag: string }
  | { type: "error"; partNumber: number; message: string };

const post = (m: OutMsg) => (self as unknown as Worker).postMessage(m);

async function uploadOnce(url: string, blob: Blob, partNumber: number, signal: AbortSignal): Promise<string> {
  // fetch() with a ReadableStream body would give us upload progress, but
  // Safari/Firefox don't fully support duplex streaming yet. We report
  // 0% → 100% on completion instead — good enough because a stalled part
  // will error out (and be retried) rather than hang silently.
  const res = await fetch(url, { method: "PUT", body: blob, signal });
  if (!res.ok) throw new Error(`Part ${partNumber} failed (${res.status})`);
  const etag = res.headers.get("ETag") || res.headers.get("etag");
  if (!etag) throw new Error("R2 did not return an ETag (check bucket CORS ExposeHeader: ETag)");
  post({ type: "progress", partNumber, loaded: blob.size });
  return etag;
}

self.addEventListener("message", async (e: MessageEvent<InMsg>) => {
  const { partNumber, url, blob, retries } = e.data;
  const controller = new AbortController();
  let lastErr: Error | null = null;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const etag = await uploadOnce(url, blob, partNumber, controller.signal);
      post({ type: "done", partNumber, etag });
      return;
    } catch (err) {
      lastErr = err as Error;
      post({ type: "progress", partNumber, loaded: 0 });
      await new Promise(r => setTimeout(r, Math.min(30_000, 1000 * Math.pow(2, attempt))));
    }
  }
  post({ type: "error", partNumber, message: lastErr?.message ?? `Part ${partNumber} failed` });
});

export {};
