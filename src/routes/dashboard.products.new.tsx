import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useRef, useMemo } from "react";
import { DashboardShell, DashCard } from "@/components/DashboardShell";
import { productCategories } from "@/lib/dashboard-mock";
import { supabase } from "@/integrations/supabase/client";
import { Upload, Sparkles, CheckCircle2, X, RotateCcw, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const FORMATS = ["VST", "VST3", "AU", "AAX"];
const DRAFT_KEY = "pw:new-product-draft:v2";

const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

// Detect OS support from a filename. Case-insensitive, tolerant of any
// separator. If neither is detected, default to Windows-only.
const detectOSFromFilename = (name: string): { win: boolean; mac: boolean } => {
  const s = name.toLowerCase();
  const win = /(^|[^a-z])(win(dows|32|64)?|w(?:in)?64|x64)([^a-z]|$)/i.test(s);
  const mac = /(^|[^a-z])(mac(os|osx)?|osx|os-x|apple|darwin|universal)([^a-z]|$)/i.test(s);
  if (!win && !mac) return { win: true, mac: false };
  return { win, mac };
};

const formatBytes = (n: number): string => {
  if (!n || n <= 0) return "";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(units.length - 1, Math.floor(Math.log(n) / Math.log(1024)));
  const v = n / Math.pow(1024, i);
  return `${v >= 10 || i === 0 ? Math.round(v) : v.toFixed(1)} ${units[i]}`;
};


export const Route = createFileRoute("/dashboard/products/new")({
  head: () => ({ meta: [{ title: "New product — Plugin Warehouse" }] }),
  component: NewProduct,
});

type UploadState = "idle" | "uploading" | "complete" | "error";

type DraftShape = {
  fileName: string | null;
  fileSize: number;
  stagingKey: string | null;
  uploadState: UploadState;
  // Multipart resume state — populated while a large-file upload is in flight
  // and cleared once complete/aborted. Persisted synchronously via patchDraft
  // so a tab freeze between chunks never loses part progress.
  mpUploadId: string | null;
  mpKey: string | null;
  mpPartSize: number;
  mpFileName: string | null;
  mpFileSize: number;
  mpParts: Record<number, string>; // partNumber -> ETag
  name: string;
  maker: string;
  desc: string;
  coverUrl: string | null;
  category: string;
  tags: string[];
  formats: string[];
  price: string;
  compareAt: string;
  version: string;
  includeSale: boolean;
  publishStatus: "publish" | "draft";
  supportsWindows: boolean;
  supportsMac: boolean;
};

const emptyDraft = (): DraftShape => ({
  fileName: null, fileSize: 0, stagingKey: null, uploadState: "idle",
  mpUploadId: null, mpKey: null, mpPartSize: 0, mpFileName: null, mpFileSize: 0, mpParts: {},
  name: "", maker: "Plugin Warehouse", desc: "", coverUrl: null,
  category: productCategories[0], tags: [], formats: ["VST3", "AU"],
  price: "", compareAt: "", version: "1.0",
  includeSale: false, publishStatus: "publish",
  supportsWindows: true, supportsMac: false,
});


const loadDraft = (): { draft: DraftShape; resumed: boolean } => {
  if (typeof window === "undefined") return { draft: emptyDraft(), resumed: false };
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return { draft: emptyDraft(), resumed: false };
    const parsed = { ...emptyDraft(), ...JSON.parse(raw) } as DraftShape;
    // Interrupted upload → surface it, don't silently pretend it's fine.
    // If we still have mp resume state, re-selecting the same file will
    // pick up where we left off (existing parts are skipped).
    if (parsed.uploadState === "uploading" && !parsed.stagingKey) {
      parsed.uploadState = "error";
    }
    return { draft: parsed, resumed: true };
  } catch { return { draft: emptyDraft(), resumed: false }; }
};

// Synchronous localStorage write — used at the exact moment upload completes,
// so tab freezing/discarding after the XHR resolves can't drop the stagingKey.
const patchDraft = (patch: Partial<DraftShape>) => {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    const cur = raw ? JSON.parse(raw) : emptyDraft();
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...cur, ...patch }));
  } catch { /* quota */ }
};

function NewProduct() {
  const navigate = useNavigate();
  const initial = useRef(loadDraft()).current;

  const [fileName, setFileName] = useState(initial.draft.fileName);
  const [fileSize, setFileSize] = useState(initial.draft.fileSize);
  const [stagingKey, setStagingKey] = useState<string | null>(initial.draft.stagingKey);
  const [uploadState, setUploadState] = useState<UploadState>(initial.draft.uploadState);
  const [uploadPct, setUploadPct] = useState(initial.draft.stagingKey ? 100 : 0);
  const [uploadErr, setUploadErr] = useState<string | null>(
    initial.draft.uploadState === "error" && initial.draft.fileName && !initial.draft.stagingKey
      ? (initial.draft.mpUploadId
          ? "Upload was interrupted. Re-select the same file to resume where you left off."
          : "Upload was interrupted (tab was backgrounded too long). Please re-upload.")
      : null,
  );
  const uploading = uploadState === "uploading";
  const abortRef = useRef<AbortController | null>(null);

  const [name, setName] = useState(initial.draft.name);
  const [maker, setMaker] = useState(initial.draft.maker);
  const [desc, setDesc] = useState(initial.draft.desc);
  const [generating, setGenerating] = useState(false);

  const [coverUrl, setCoverUrl] = useState<string | null>(initial.draft.coverUrl);
  const [coverUploading, setCoverUploading] = useState(false);

  const [category, setCategory] = useState(initial.draft.category);
  const [tags, setTags] = useState<string[]>(initial.draft.tags);
  const [tagInput, setTagInput] = useState("");
  const [formats, setFormats] = useState<Set<string>>(new Set(initial.draft.formats));
  const [price, setPrice] = useState(initial.draft.price);
  const [compareAt, setCompareAt] = useState(initial.draft.compareAt);
  const [version, setVersion] = useState(initial.draft.version);
  const [includeSale, setIncludeSale] = useState(initial.draft.includeSale);
  const [publishStatus, setPublishStatus] = useState<"publish" | "draft">(initial.draft.publishStatus);
  const [supportsWindows, setSupportsWindows] = useState(initial.draft.supportsWindows);
  const [supportsMac, setSupportsMac] = useState(initial.draft.supportsMac);

  const [resumed, setResumed] = useState(initial.resumed);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [replaceOpen, setReplaceOpen] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [zipDragOver, setZipDragOver] = useState(false);
  const [coverDragOver, setCoverDragOver] = useState(false);

  // Persist draft (no File objects). Uses patchDraft so it merges into any
  // multipart resume state written synchronously by the uploader.
  useEffect(() => {
    if (typeof window === "undefined") return;
    patchDraft({
      fileName, fileSize, stagingKey, uploadState, name, maker, desc, coverUrl,
      category, tags, formats: Array.from(formats), price, compareAt, version,
      includeSale, publishStatus, supportsWindows, supportsMac,
    });
  }, [fileName, fileSize, stagingKey, uploadState, name, maker, desc, coverUrl, category, tags, formats, price, compareAt, version, includeSale, publishStatus, supportsWindows, supportsMac]);

  // Warn if user tries to close/reload while an upload is in flight.
  useEffect(() => {
    if (!uploading) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [uploading]);

  const priceNum = Number(price) || 0;
  const compareNum = Number(compareAt) || 0;
  const baseDiscountPct = compareNum > priceNum && compareNum > 0 ? Math.round((1 - priceNum / compareNum) * 100) : 0;

  const missing = useMemo(() => ({
    file: !stagingKey || uploadState !== "complete",
    name: !name.trim(),
    maker: !maker.trim(),
    desc: !desc.trim(),
    category: !category,
    formats: formats.size === 0,
    price: !(priceNum > 0),
  }), [stagingKey, uploadState, name, maker, desc, category, formats, priceNum]);

  const canPublish = !Object.values(missing).some(Boolean);
  const isDirty = !!fileName || !!name || !!desc || !!coverUrl || tags.length > 0 ||
    !!price || !!compareAt || includeSale || maker !== "Plugin Warehouse" ||
    formats.size !== 2 || !Array.from(formats).every(f => ["VST3", "AU"].includes(f)) ||
    category !== productCategories[0] || publishStatus !== "publish";

  const clearDraft = () => { try { localStorage.removeItem(DRAFT_KEY); } catch { /* */ } };

  const resetForm = () => {
    const e = emptyDraft();
    setFileName(e.fileName); setFileSize(e.fileSize); setStagingKey(e.stagingKey);
    setUploadState("idle"); setUploadPct(0); setUploadErr(null);
    setName(e.name); setMaker(e.maker); setDesc(e.desc); setCoverUrl(e.coverUrl);
    setCategory(e.category); setTags(e.tags); setFormats(new Set(e.formats));
    setPrice(e.price); setCompareAt(e.compareAt); setVersion(e.version);
    setIncludeSale(e.includeSale); setPublishStatus(e.publishStatus);
    setResumed(false); setCanResumeFromDisk(false); clearDraft();
  };

  // Fully reset the upload zone WITHOUT touching the rest of the form.
  // Aborts any in-flight worker pool, tells R2 to release the multipart
  // upload, wipes persisted resume state, and re-arms the drop zone so a
  // new file can be dropped immediately — no page refresh needed.
  const discardUpload = () => {
    try { abortRef.current?.abort(); } catch { /* */ }
    abortRef.current = null;
    // Read the live mp state directly from storage — state closures may be
    // stale if this runs right after an error.
    let saved: DraftShape | null = null;
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) saved = JSON.parse(raw) as DraftShape;
    } catch { /* */ }
    if (saved?.mpUploadId && saved?.mpKey) {
      // Fire-and-forget: freeing R2 storage shouldn't block the UI reset.
      supabase.functions.invoke("r2-multipart-abort", {
        body: { key: saved.mpKey, uploadId: saved.mpUploadId },
      }).catch(() => { /* ignore */ });
    }
    setFileName(null); setFileSize(0); setStagingKey(null);
    setUploadState("idle"); setUploadPct(0); setUploadErr(null);
    setCanResumeFromDisk(false);
    patchDraft({
      fileName: null, fileSize: 0, stagingKey: null, uploadState: "idle",
      mpUploadId: null, mpKey: null, mpPartSize: 0,
      mpFileName: null, mpFileSize: 0, mpParts: {},
    });
    toast.success("Upload discarded — drop a new file to start.");
  };

  // ---- File upload (zip) — S3 multipart to R2 ----
  // Reliable ceiling: 50 GB per file. Each 100 MB chunk is uploaded from a
  // dedicated Web Worker, which keeps running when the tab is backgrounded
  // (the main thread is aggressively throttled by Chromium/Safari and would
  // otherwise pause in-flight PUTs). Chunks are retried up to 4× with
  // exponential backoff.
  // Resume: completed part ETags are persisted synchronously to localStorage
  // after each part. Re-selecting the same file (matching name + size)
  // picks up where we left off — remaining parts are re-signed and uploaded.
  // 8 parallel parts × 100MB ≈ ~800MB in flight — enough to saturate
  // gigabit uplinks without overwhelming R2's per-connection throughput.
  const PART_CONCURRENCY = 8;
  const PART_RETRIES = 4;

  // Track whether the currently-shown "interrupted" state has resume state
  // we can pick up on a re-select. Drives the visible Resume button + hint.
  const [canResumeFromDisk, setCanResumeFromDisk] = useState<boolean>(!!initial.draft.mpUploadId);
  // File input ref so the visible Resume button can trigger the file picker.
  const zipInputRef = useRef<HTMLInputElement | null>(null);

  // Advisory: tell the user their backgrounded upload is still going.
  useEffect(() => {
    if (!uploading) return;
    let notifiedHidden = false;
    const onVis = () => {
      if (document.visibilityState === "hidden" && !notifiedHidden) {
        notifiedHidden = true;
        // Non-blocking; the worker keeps chunk PUTs alive.
        toast.message("Upload continues in the background", {
          description: "Chunks upload from a Web Worker so tab-switching won't drop them.",
          duration: 4000,
        });
      }
      if (document.visibilityState === "visible") notifiedHidden = false;
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [uploading]);

  const runUpload = async (f: File): Promise<void> => {
    setUploadErr(null);
    setFileName(f.name); setFileSize(f.size);
    setStagingKey(null); setUploadPct(0);
    setUploadState("uploading");
    // Smart pre-fill: infer OS support from filename. User can still toggle.
    const detected = detectOSFromFilename(f.name);
    setSupportsWindows(detected.win);
    setSupportsMac(detected.mac);
    patchDraft({ fileName: f.name, fileSize: f.size, stagingKey: null, uploadState: "uploading", supportsWindows: detected.win, supportsMac: detected.mac });

    // Decide fresh vs resume by comparing name+size against saved mp state.
    let saved: DraftShape | null = null;
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) saved = JSON.parse(raw) as DraftShape;
    } catch { /* ignore */ }
    const canResume = !!(saved?.mpUploadId && saved?.mpKey && saved?.mpPartSize
      && saved.mpFileName === f.name && saved.mpFileSize === f.size);

    let key: string;
    let uploadId: string;
    let partSize: number;
    let doneParts: Record<number, string> = {};

    const workers: Worker[] = [];
    try {
      if (canResume && saved) {
        key = saved.mpKey!;
        uploadId = saved.mpUploadId!;
        partSize = saved.mpPartSize;
        doneParts = { ...(saved.mpParts ?? {}) };
        const doneCount = Object.keys(doneParts).length;
        const totalHint = Math.max(1, Math.ceil(f.size / partSize));
        const pct = Math.min(99, Math.round((doneCount / totalHint) * 100));
        toast.success(`Resuming upload — ${pct}% already complete`);
      } else {
        // Different file selected → abort the stale multipart on R2.
        if (saved?.mpUploadId && saved?.mpKey) {
          supabase.functions.invoke("r2-multipart-abort", {
            body: { key: saved.mpKey, uploadId: saved.mpUploadId },
          }).catch(() => { /* ignore */ });
        }
        const { data, error } = await supabase.functions.invoke("r2-multipart-create", {
          body: { filename: f.name, size: f.size },
        });
        if (error || !data?.uploadId) throw new Error(data?.error || error?.message || "Failed to start upload");
        key = data.key; uploadId = data.uploadId; partSize = data.partSize;
        patchDraft({
          mpKey: key, mpUploadId: uploadId, mpPartSize: partSize,
          mpFileName: f.name, mpFileSize: f.size, mpParts: {},
        });
      }
      setCanResumeFromDisk(true);

      const totalParts = Math.max(1, Math.ceil(f.size / partSize));
      const pending: number[] = [];
      for (let n = 1; n <= totalParts; n++) if (!doneParts[n]) pending.push(n);

      // Progress accounting across all parts.
      const partLoaded = new Map<number, number>();
      for (const n of Object.keys(doneParts).map(Number)) {
        const start = (n - 1) * partSize;
        partLoaded.set(n, Math.max(0, Math.min(partSize, f.size - start)));
      }
      const emitProgress = () => {
        let sum = 0;
        for (const v of partLoaded.values()) sum += v;
        setUploadPct(Math.min(99, Math.round((sum / f.size) * 100)));
      };
      emitProgress();

      // Presign remaining parts in batches of 100.
      const urls: Record<number, string> = {};
      for (let i = 0; i < pending.length; i += 100) {
        const chunk = pending.slice(i, i + 100);
        const { data, error } = await supabase.functions.invoke("r2-multipart-sign", {
          body: { key, uploadId, partNumbers: chunk },
        });
        if (error || !data?.urls) throw new Error(data?.error || error?.message || "Failed to sign parts");
        Object.assign(urls, data.urls);
      }

      const abortCtrl = new AbortController();
      abortRef.current = abortCtrl;

      // Web Worker pool. Workers keep executing while the tab is backgrounded,
      // so in-flight chunk PUTs survive tab-switching (main-thread XHR does not).
      const uploadInWorker = (partNumber: number): Promise<string> => {
        return new Promise((resolve, reject) => {
          const w = new Worker(new URL("../workers/upload-part.worker.ts", import.meta.url), { type: "module" });
          workers.push(w);
          const cleanup = () => { try { w.terminate(); } catch { /* */ } };
          const onAbort = () => { cleanup(); reject(new Error("Aborted")); };
          abortCtrl.signal.addEventListener("abort", onAbort, { once: true });
          w.onmessage = (ev: MessageEvent) => {
            const m = ev.data as { type: string; partNumber: number; loaded?: number; etag?: string; message?: string };
            if (m.type === "progress") {
              partLoaded.set(m.partNumber, m.loaded ?? 0);
              emitProgress();
            } else if (m.type === "done") {
              partLoaded.set(m.partNumber, f.slice((m.partNumber - 1) * partSize, Math.min(m.partNumber * partSize, f.size)).size);
              emitProgress();
              cleanup();
              resolve(m.etag!);
            } else if (m.type === "error") {
              cleanup();
              reject(new Error(m.message || `Part ${m.partNumber} failed`));
            }
          };
          w.onerror = (err) => { cleanup(); reject(new Error(err.message || "Worker error")); };
          const start = (partNumber - 1) * partSize;
          const end = Math.min(start + partSize, f.size);
          const blob = f.slice(start, end);
          w.postMessage({ partNumber, url: urls[partNumber], blob, retries: PART_RETRIES });
        });
      };

      let cursor = 0;
      const runners = Array.from({ length: Math.min(PART_CONCURRENCY, pending.length) }, async () => {
        while (cursor < pending.length) {
          const my = pending[cursor++];
          const etag = await uploadInWorker(my);
          doneParts[my] = etag;
          patchDraft({ mpParts: { ...doneParts } });
        }
      });
      await Promise.all(runners);

      const partList = Object.entries(doneParts).map(([n, etag]) => ({ PartNumber: Number(n), ETag: etag }));
      const { data: comp, error: compErr } = await supabase.functions.invoke("r2-multipart-complete", {
        body: { key, uploadId, parts: partList },
      });
      if (compErr || !comp?.objectKey) throw new Error(comp?.error || compErr?.message || "Failed to finalize upload");

      patchDraft({
        stagingKey: comp.objectKey, uploadState: "complete",
        mpUploadId: null, mpKey: null, mpPartSize: 0,
        mpFileName: null, mpFileSize: 0, mpParts: {},
      });
      setStagingKey(comp.objectKey);
      setUploadPct(100);
      setUploadState("complete");
      setCanResumeFromDisk(false);
      toast.success("Plugin uploaded.");
    } catch (e: any) {
      const msg = e?.message || "Upload failed";
      setUploadErr(canResumeFromDisk ? `${msg} — re-select the same file to resume.` : msg);
      setUploadState("error");
      // Keep mp state so the user can re-select the same file to resume.
      patchDraft({ uploadState: "error", stagingKey: null });
      toast.error(msg);
    } finally {
      abortRef.current = null;
      for (const w of workers) { try { w.terminate(); } catch { /* */ } }
    }
  };

  const uploadFile = async (f: File) => {
    // Guard: don't let an accidental drop/click nuke a completed upload.
    if (stagingKey && uploadState === "complete") { setReplaceOpen(f); return; }
    // Web Locks keep Chromium from discarding the tab while held.
    const locks = (navigator as any).locks;
    if (locks?.request) {
      await locks.request("pw-upload-plugin-zip", { mode: "exclusive" }, () => runUpload(f));
    } else {
      await runUpload(f);
    }
  };


  // ---- Cover upload (image) ----
  const uploadCover = async (f: File) => {
    setCoverUploading(true);
    try {
      const { data, error } = await supabase.functions.invoke("r2-upload-url", {
        body: { kind: "cover", filename: f.name, size: f.size, contentType: f.type || "image/jpeg" },
      });
      if (error || !data?.uploadUrl) throw new Error(data?.error || error?.message || "Failed to get upload URL");
      const put = await fetch(data.uploadUrl, { method: "PUT", body: f });
      if (!put.ok) throw new Error(`Cover upload failed (${put.status})`);
      setCoverUrl(data.publicUrl || data.objectKey);
      toast.success("Cover uploaded.");
    } catch (e: any) {
      toast.error(e.message || "Cover upload failed");
    } finally {
      setCoverUploading(false);
    }
  };

  // ---- AI description ----
  const generateDesc = async () => {
    if (!name.trim()) { toast.error("Enter a plugin name first."); return; }
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-product-description", {
        body: { name, category, tags, daws: Array.from(formats) },
      });
      if (error || !data?.description) throw new Error(data?.error || error?.message || "AI request failed");
      setDesc(data.description);
    } catch (e: any) {
      toast.error(e.message || "Couldn't generate description");
    } finally { setGenerating(false); }
  };

  const addTag = () => { if (tagInput && !tags.includes(tagInput)) { setTags([...tags, tagInput]); setTagInput(""); } };

  // ---- Save / publish ----
  const save = async (status: "publish" | "draft") => {
    if (status === "publish" && !canPublish) { toast.error("Fill in all required fields."); return; }
    if (status === "draft" && !name.trim()) { toast.error("Add a plugin name to save a draft."); return; }
    if (submitting) return;
    setSubmitting(true);
    try {
      const productSlug = `${slugify(name)}-${Date.now().toString(36).slice(-5)}`;

      // File is already uploaded to R2 at `stagingKey`. Publishing only writes
      // the DB row — we no longer copy the object to a "final" folder, which
      // used to make publish time scale with file size (a 35GB CopyObject can
      // take minutes). The staging key IS the permanent key; r2-cleanup-staging
      // skips any object referenced by product_files.zip_url.
      const finalKey: string | null = stagingKey;

      // 2. Insert product
      const { data: product, error: insErr } = await supabase.from("products").insert({
        slug: productSlug,
        name: name.trim(),
        maker: maker.trim(),
        category,
        sub_type: null,
        tags,
        daws: [],
        formats: Array.from(formats),
        version,
        price: priceNum,
        compare_at_price: compareNum > 0 ? compareNum : null,
        description: desc,
        cover_url: coverUrl,
        status: status === "publish" ? "published" : "draft",
        published_at: status === "publish" ? new Date().toISOString() : null,
        is_free: priceNum === 0,
        file_size: fileSize > 0 ? formatBytes(fileSize) : null,
        supports_windows: supportsWindows,
        supports_mac: supportsMac,
      }).select("id").single();


      if (insErr || !product) throw new Error(insErr?.message || "Couldn't save product");

      // 3. Insert private file pointer
      if (finalKey) {
        const { error: fErr } = await supabase.from("product_files").insert({
          product_id: product.id,
          zip_url: finalKey,                // PRIVATE R2 object key — not a URL
          zip_file_name: fileName,
        });
        if (fErr) throw new Error(`Product saved but file link failed: ${fErr.message}`);
      }


      clearDraft();
      toast.success(status === "publish" ? "Plugin published successfully" : "Draft saved.");
      setTimeout(() => navigate({ to: "/dashboard/products" as any }), 250);
    } catch (e: any) {
      toast.error(e.message || "Couldn't save product");
    } finally { setSubmitting(false); }
  };

  const onCancel = () => isDirty ? setCancelOpen(true) : navigate({ to: "/dashboard/products" as any });
  const req = (m: boolean) => m ? <span className="text-[var(--accent-red)] ml-0.5" title="Required">*</span> : null;

  return (
    <DashboardShell title="New product">
      <div className="max-w-4xl mx-auto pb-32 space-y-6">
        {resumed && (
          <div className="flex items-center gap-3 rounded-lg border border-white/15 bg-white/5 px-4 py-2.5 text-xs">
            <RotateCcw size={13} className="text-[var(--accent-red-glow)]" />
            <span className="text-white/80">Resumed from your last session.</span>
            <button onClick={() => { resetForm(); toast.success("Draft discarded."); }} className="ml-auto text-[var(--accent-red-glow)] hover:underline">
              Discard and start fresh
            </button>
          </div>
        )}

        {/* File upload */}
        <DashCard title={<>Plugin file {req(missing.file)}</>}>
          <label
            onDragOver={e => { e.preventDefault(); setZipDragOver(true); }}
            onDragEnter={e => { e.preventDefault(); setZipDragOver(true); }}
            onDragLeave={() => setZipDragOver(false)}
            onDrop={e => {
              e.preventDefault();
              setZipDragOver(false);
              const f = e.dataTransfer.files?.[0];
              if (!f) return;
              if (!/\.zip$/i.test(f.name)) { toast.error("Plugin file must be a .zip"); return; }
              uploadFile(f);
            }}
            className={`block border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition ${zipDragOver ? "border-[var(--accent-red)] bg-[var(--accent-red)]/10" : "border-[var(--accent-red)]/40 hover:border-[var(--accent-red)]"}`}
          >
            <input
              ref={zipInputRef}
              type="file"
              accept=".zip"
              hidden
              // Reset value BEFORE opening — without this, picking the same
              // file twice in a row is a no-op on most browsers (value
              // unchanged → no `change` event fires), which is exactly why
              // "re-select to resume" was silently failing.
              onClick={e => { (e.currentTarget as HTMLInputElement).value = ""; }}
              onChange={e => { const f = e.target.files?.[0]; e.target.value = ""; if (f) uploadFile(f); }}
            />
            <Upload size={28} className="mx-auto mb-2 text-[var(--accent-red-glow)]" />
            <div className="text-sm">{zipDragOver ? "Drop to upload" : "Drop your ZIP here or click to browse"}</div>
            <div className="text-[11px] text-white/40 mt-1">Max 50GB · multipart upload to private R2 · resumable</div>
            {fileName && (
              <div className="mt-4 max-w-sm mx-auto text-left bg-white/5 rounded-lg p-3">
                <div className="flex justify-between items-center gap-2">
                  <span className="text-xs font-mono truncate flex-1">{fileName}</span>
                  <span className="text-[10px] text-white/40 font-mono">{(fileSize/1024/1024).toFixed(1)} MB</span>
                  <button
                    type="button"
                    onClick={e => { e.preventDefault(); e.stopPropagation(); discardUpload(); }}
                    title="Discard this file and reset the upload zone"
                    className="text-white/50 hover:text-[var(--accent-red-glow)] transition p-0.5"
                  >
                    <X size={13} />
                  </button>
                </div>
                {uploading && (
                  <div className="mt-2 h-1.5 bg-white/10 rounded overflow-hidden">
                    <div className="h-full bg-[var(--accent-red)] transition-all" style={{ width: `${uploadPct}%` }} />
                  </div>
                )}
                {uploading && <div className="mt-1 text-[10px] text-white/50 font-mono">{uploadPct}% · {PART_CONCURRENCY} parallel chunks</div>}
                {stagingKey && !uploading && (
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-400">
                    <CheckCircle2 size={12} /> Uploaded to R2 staging
                  </div>
                )}
                {uploadErr && (
                  <div className="mt-2 flex items-start gap-1.5 text-xs text-[var(--accent-red-glow)]">
                    <AlertCircle size={12} className="mt-0.5 shrink-0" />
                    <div className="flex-1">
                      <div>{uploadErr}</div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {canResumeFromDisk && !uploading && (
                          <button
                            type="button"
                            onClick={e => { e.preventDefault(); e.stopPropagation(); zipInputRef.current?.click(); }}
                            className="inline-flex items-center gap-1.5 rounded-md border border-[var(--accent-red)]/60 bg-[var(--accent-red)]/15 px-2.5 py-1 text-[11px] text-white hover:bg-[var(--accent-red)]/25"
                          >
                            <RotateCcw size={11} /> Resume — re-select same file
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={e => { e.preventDefault(); e.stopPropagation(); discardUpload(); }}
                          className="inline-flex items-center gap-1.5 rounded-md border border-white/20 bg-white/5 px-2.5 py-1 text-[11px] text-white/80 hover:bg-white/10"
                        >
                          <X size={11} /> Discard & upload different file
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </label>
        </DashCard>

        {/* Details */}
        <DashCard title="Details">
          <div className="space-y-4">
            <Field label={<>Plugin name {req(missing.name)}</>}><input value={name} onChange={e => setName(e.target.value)} className="ipt" /></Field>
            <Field label={<>Maker {req(missing.maker)} <span className="text-white/40 normal-case font-mono ml-1">(who built this plugin)</span></>}>
              <input value={maker} onChange={e => setMaker(e.target.value)} className="ipt" placeholder="Plugin Warehouse" />
            </Field>
            <Field label={<>Description {req(missing.desc)} <button onClick={generateDesc} disabled={generating} className="ml-2 inline-flex items-center gap-1 text-[10px] text-[var(--accent-red-glow)] hover:underline disabled:opacity-50"><Sparkles size={11} /> {generating ? "Thinking…" : "Generate description"}</button></>}>
              <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={6} className="ipt resize-none" />
              <div className="text-[10px] text-white/40 mt-1 text-right font-mono">{desc.length} chars</div>
            </Field>
            <Field label={<>Cover art <span className="text-white/40 font-normal">(optional — JPG or PNG, 1:1, max 5MB. You can add it later on the edit page.)</span></>}>
              <label
                onDragOver={e => { e.preventDefault(); setCoverDragOver(true); }}
                onDragEnter={e => { e.preventDefault(); setCoverDragOver(true); }}
                onDragLeave={() => setCoverDragOver(false)}
                onDrop={e => {
                  e.preventDefault();
                  setCoverDragOver(false);
                  const f = e.dataTransfer.files?.[0];
                  if (!f) return;
                  if (!f.type.startsWith("image/")) { toast.error("Cover must be an image"); return; }
                  uploadCover(f);
                }}
                className={`block border border-dashed rounded-lg p-4 text-center cursor-pointer transition ${coverDragOver ? "border-[var(--accent-red)] bg-[var(--accent-red)]/10" : "border-white/20 hover:border-white/40"}`}
              >
                <input type="file" accept="image/*" hidden onChange={e => { const f = e.target.files?.[0]; if (f) uploadCover(f); }} />
                {coverUrl
                  ? <img src={coverUrl} alt="cover" className="w-32 h-32 object-cover mx-auto rounded" />
                  : <div className="text-xs text-white/60">{coverUploading ? "Uploading…" : coverDragOver ? "Drop to upload" : "Drop image or click"}</div>}
              </label>
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label={<>Category {req(missing.category)}</>}>
                <select value={category} onChange={e => setCategory(e.target.value)} className="ipt">
                  {productCategories.map(c => <option key={c} value={c} className="bg-[#1F0540]">{c.charAt(0).toUpperCase()+c.slice(1)}</option>)}
                </select>
              </Field>
              <Field label="Version">
                <input value={version} onChange={e => setVersion(e.target.value)} className="ipt" placeholder="1.0" />
              </Field>
            </div>
            <Field label="Tags">
              <div className="flex flex-wrap gap-2 mb-2">
                {tags.map(t => <span key={t} className="inline-flex items-center gap-1 bg-white/5 border border-white/15 rounded-full px-3 py-1 text-xs">{t}<button onClick={() => setTags(tags.filter(x => x !== t))}><X size={11} /></button></span>)}
              </div>
              <input value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addTag())} placeholder="Type and press enter" className="ipt" />
            </Field>
            <Field label={<>Compatible formats {req(missing.formats)}</>}>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {FORMATS.map(d => {
                  const checked = formats.has(d);
                  return (
                    <label key={d} className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-xs cursor-pointer transition border ${checked ? "bg-[var(--accent-red)]/15 border-[var(--accent-red)]/60 text-white" : "bg-white/5 border-white/10 text-white/70 hover:border-white/25"}`}>
                      <input type="checkbox" checked={checked} onChange={() => { const n = new Set(formats); n.has(d) ? n.delete(d) : n.add(d); setFormats(n); }} className="accent-[var(--accent-red)]" />
                      <span className="font-mono tracking-wider">{d}</span>
                    </label>
                  );
                })}
              </div>
            </Field>
          </div>
        </DashCard>

        {/* Pricing */}
        <DashCard title="Pricing">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label={<>Price {req(missing.price)}</>}>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 font-mono">$</span>
                  <input type="number" value={price} onChange={e => setPrice(e.target.value)} className="ipt !pl-7" placeholder="49" />
                </div>
              </Field>
              <Field label={<span>Compare-at price <span className="text-white/40 normal-case font-mono">(optional, struck-through original)</span></span>}>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 font-mono">$</span>
                  <input type="number" value={compareAt} onChange={e => setCompareAt(e.target.value)} className="ipt !pl-7" placeholder="99" />
                </div>
              </Field>
            </div>
            {baseDiscountPct > 0 && (
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-mono text-emerald-300">
                Base discount: <strong className="text-emerald-200">{baseDiscountPct}% off</strong> ({`$${compareNum} → $${priceNum}`})
              </div>
            )}
            <p className="text-[11px] text-white/40 font-mono">
              Site-wide sale events apply automatically to matching products at checkout — no per-product opt-in needed.
            </p>
            <Field label="Publish status">
              <div className="flex gap-3">
                {([["publish","Publish now"],["draft","Save as draft"]] as const).map(([v,l]) => (
                  <label key={v} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="radio" name="pub" checked={publishStatus===v} onChange={() => setPublishStatus(v as any)} className="accent-[var(--accent-red)]" />{l}
                  </label>
                ))}
              </div>
            </Field>
          </div>
        </DashCard>
      </div>

      {/* Sticky footer */}
      <div className="fixed bottom-0 left-0 md:left-[220px] right-0 z-30 border-t border-white/10 bg-[#13002C]/95 backdrop-blur-md px-6 py-3 flex items-center gap-3">
        <button onClick={onCancel} disabled={submitting} className="btn-ghost !text-xs !py-2 !px-4">Cancel</button>
        <button onClick={() => save("draft")} disabled={submitting} className="btn-ghost !text-xs !py-2 !px-4 ml-auto">{submitting ? "Saving…" : "Save draft"}</button>
        <button
          onClick={() => save("publish")}
          disabled={!canPublish || submitting}
          aria-disabled={!canPublish || submitting}
          title={canPublish ? "Publish product" : "Complete required fields to publish"}
          className={`btn-primary !text-xs !py-2 !px-6 transition-all duration-200 ${(canPublish && !submitting) ? "" : "opacity-40 grayscale pointer-events-none"}`}
        >
          {submitting ? "Publishing…" : "Publish"}
        </button>
      </div>

      <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <AlertDialogContent className="bg-[#13002C] border-white/15 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Discard changes?</AlertDialogTitle>
            <AlertDialogDescription className="text-white/60">
              You have unsaved changes. This will permanently discard your in-progress product draft.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-white/20 text-white hover:bg-white/10">Keep editing</AlertDialogCancel>
            <AlertDialogAction onClick={() => { clearDraft(); navigate({ to: "/dashboard/products" as any }); }} className="bg-[var(--accent-red)] hover:bg-[var(--accent-red)]/90">
              Discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!replaceOpen} onOpenChange={(o) => !o && setReplaceOpen(null)}>
        <AlertDialogContent className="bg-[#13002C] border-white/15 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Replace uploaded plugin file?</AlertDialogTitle>
            <AlertDialogDescription className="text-white/60">
              You already have <span className="font-mono text-white/80">{fileName}</span> uploaded. Replacing it will discard that upload and re-upload the new file.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-white/20 text-white hover:bg-white/10">Keep current file</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const f = replaceOpen; setReplaceOpen(null);
                if (!f) return;
                // Force replacement by clearing state, then re-invoke.
                setStagingKey(null); setUploadState("idle");
                patchDraft({ stagingKey: null, uploadState: "idle" });
                setTimeout(() => uploadFile(f), 0);
              }}
              className="bg-[var(--accent-red)] hover:bg-[var(--accent-red)]/90"
            >
              Replace
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <style>{`.ipt{width:100%;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.15);border-radius:8px;padding:0.55rem 0.75rem;font-size:13px;color:#fff;outline:none;transition:border-color .15s}.ipt:focus{border-color:var(--accent-red)}`}</style>
    </DashboardShell>
  );
}

function Field({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return <label className="block"><span className="label-mini text-[10px] opacity-70 mb-1.5 block">{label}</span>{children}</label>;
}
