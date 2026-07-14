// Shared R2 multipart uploader — same pipeline used by the new-product page.
// Workers keep chunk PUTs alive when the tab is backgrounded, retries with
// exponential backoff, 8 parallel parts × 100 MB. Returns the final R2 object
// key (staging/<user>/<ts>-<name>) on success.
import { supabase } from "@/integrations/supabase/client";

const PART_CONCURRENCY = 8;
const PART_RETRIES = 4;

export type MultipartHandle = {
  promise: Promise<{ objectKey: string }>;
  abort: () => void;
};

export function uploadZipMultipart(
  file: File,
  opts: { onProgress?: (pct: number) => void } = {},
): MultipartHandle {
  const onProgress = opts.onProgress ?? (() => {});
  const workers: Worker[] = [];
  const abortCtrl = new AbortController();
  let mpKey: string | null = null;
  let mpUploadId: string | null = null;

  const promise = (async () => {
    // 1) Start multipart on R2.
    const { data: createData, error: createErr } = await supabase.functions.invoke(
      "r2-multipart-create",
      { body: { filename: file.name, size: file.size } },
    );
    if (createErr || !createData?.uploadId) {
      throw new Error(createData?.error || createErr?.message || "Failed to start upload");
    }
    const key: string = createData.key;
    const uploadId: string = createData.uploadId;
    const partSize: number = createData.partSize;
    mpKey = key;
    mpUploadId = uploadId;
    const totalParts = Math.max(1, Math.ceil(file.size / partSize));

    // 2) Presign remaining parts in batches of 100.
    const urls: Record<number, string> = {};
    const pending: number[] = Array.from({ length: totalParts }, (_, i) => i + 1);
    for (let i = 0; i < pending.length; i += 100) {
      const chunk = pending.slice(i, i + 100);
      const { data, error } = await supabase.functions.invoke("r2-multipart-sign", {
        body: { key, uploadId, partNumbers: chunk },
      });
      if (error || !data?.urls) {
        throw new Error(data?.error || error?.message || "Failed to sign parts");
      }
      Object.assign(urls, data.urls);
    }

    // 3) Upload in parallel via worker pool.
    const partLoaded = new Map<number, number>();
    const emit = () => {
      let sum = 0;
      for (const v of partLoaded.values()) sum += v;
      onProgress(Math.min(99, Math.round((sum / file.size) * 100)));
    };
    emit();

    const doneParts: Record<number, string> = {};
    const uploadInWorker = (partNumber: number): Promise<string> =>
      new Promise((resolve, reject) => {
        if (abortCtrl.signal.aborted) return reject(new Error("Aborted"));
        const w = new Worker(new URL("../workers/upload-part.worker.ts", import.meta.url), { type: "module" });
        workers.push(w);
        const cleanup = () => { try { w.terminate(); } catch { /* */ } };
        const onAbort = () => { cleanup(); reject(new Error("Aborted")); };
        abortCtrl.signal.addEventListener("abort", onAbort, { once: true });
        w.onmessage = (ev: MessageEvent) => {
          const m = ev.data as { type: string; partNumber: number; loaded?: number; etag?: string; message?: string };
          if (m.type === "progress") {
            partLoaded.set(m.partNumber, m.loaded ?? 0);
            emit();
          } else if (m.type === "done") {
            partLoaded.set(m.partNumber, file.slice((m.partNumber - 1) * partSize, Math.min(m.partNumber * partSize, file.size)).size);
            emit();
            cleanup();
            resolve(m.etag!);
          } else if (m.type === "error") {
            cleanup();
            reject(new Error(m.message || `Part ${m.partNumber} failed`));
          }
        };
        w.onerror = (err) => { cleanup(); reject(new Error(err.message || "Worker error")); };
        const start = (partNumber - 1) * partSize;
        const end = Math.min(start + partSize, file.size);
        w.postMessage({ partNumber, url: urls[partNumber], blob: file.slice(start, end), retries: PART_RETRIES });
      });

    let cursor = 0;
    const runners = Array.from({ length: Math.min(PART_CONCURRENCY, pending.length) }, async () => {
      while (cursor < pending.length) {
        if (abortCtrl.signal.aborted) throw new Error("Aborted");
        const my = pending[cursor++];
        doneParts[my] = await uploadInWorker(my);
      }
    });
    await Promise.all(runners);

    // 4) Finalize.
    const partList = Object.entries(doneParts).map(([n, etag]) => ({ PartNumber: Number(n), ETag: etag }));
    const { data: comp, error: compErr } = await supabase.functions.invoke("r2-multipart-complete", {
      body: { key, uploadId, parts: partList },
    });
    if (compErr || !comp?.objectKey) {
      throw new Error(comp?.error || compErr?.message || "Failed to finalize upload");
    }
    onProgress(100);
    return { objectKey: comp.objectKey as string };
  })().catch((e) => {
    // On failure, tell R2 to release the in-flight multipart so parts don't linger.
    if (mpKey && mpUploadId) {
      supabase.functions.invoke("r2-multipart-abort", {
        body: { key: mpKey, uploadId: mpUploadId },
      }).catch(() => { /* ignore */ });
    }
    throw e;
  }).finally(() => {
    for (const w of workers) { try { w.terminate(); } catch { /* */ } }
  });

  return {
    promise,
    abort: () => {
      try { abortCtrl.abort(); } catch { /* */ }
      if (mpKey && mpUploadId) {
        supabase.functions.invoke("r2-multipart-abort", {
          body: { key: mpKey, uploadId: mpUploadId },
        }).catch(() => { /* ignore */ });
      }
    },
  };
}
