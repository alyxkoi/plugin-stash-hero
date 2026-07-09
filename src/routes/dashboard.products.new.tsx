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
};

const emptyDraft = (): DraftShape => ({
  fileName: null, fileSize: 0, stagingKey: null, uploadState: "idle",
  name: "", maker: "Plugin Warehouse", desc: "", coverUrl: null,
  category: productCategories[0], tags: [], formats: ["VST3", "AU"],
  price: "", compareAt: "", version: "1.0",
  includeSale: false, publishStatus: "publish",
});

const loadDraft = (): { draft: DraftShape; resumed: boolean } => {
  if (typeof window === "undefined") return { draft: emptyDraft(), resumed: false };
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return { draft: emptyDraft(), resumed: false };
    const parsed = { ...emptyDraft(), ...JSON.parse(raw) } as DraftShape;
    // Interrupted upload → surface it, don't silently pretend it's fine.
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
      ? "Upload was interrupted (tab was backgrounded too long). Please re-upload."
      : null,
  );
  const uploading = uploadState === "uploading";
  const xhrRef = useRef<XMLHttpRequest | null>(null);

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

  const [resumed, setResumed] = useState(initial.resumed);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [replaceOpen, setReplaceOpen] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [zipDragOver, setZipDragOver] = useState(false);
  const [coverDragOver, setCoverDragOver] = useState(false);

  // Persist draft (no File objects).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const snap: DraftShape = {
      fileName, fileSize, stagingKey, uploadState, name, maker, desc, coverUrl,
      category, tags, formats: Array.from(formats), price, compareAt, version,
      includeSale, publishStatus,
    };
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(snap)); } catch { /* quota */ }
  }, [fileName, fileSize, stagingKey, uploadState, name, maker, desc, coverUrl, category, tags, formats, price, compareAt, version, includeSale, publishStatus]);

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
    cover: !coverUrl,
    category: !category,
    formats: formats.size === 0,
    price: !(priceNum > 0),
  }), [stagingKey, uploadState, name, maker, desc, coverUrl, category, formats, priceNum]);

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
    setResumed(false); clearDraft();
  };

  // ---- File upload (zip) ----
  const runUpload = async (f: File): Promise<void> => {
    setUploadErr(null);
    setFileName(f.name); setFileSize(f.size);
    setStagingKey(null); setUploadPct(0);
    setUploadState("uploading");
    patchDraft({ fileName: f.name, fileSize: f.size, stagingKey: null, uploadState: "uploading" });
    try {
      const { data, error } = await supabase.functions.invoke("r2-upload-url", {
        body: { kind: "zip", filename: f.name, size: f.size, contentType: f.type || "application/zip" },
      });
      if (error || !data?.uploadUrl) throw new Error(data?.error || error?.message || "Failed to get upload URL");

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhrRef.current = xhr;
        xhr.open("PUT", data.uploadUrl);
        xhr.upload.onprogress = (e) => { if (e.lengthComputable) setUploadPct(Math.round((e.loaded / e.total) * 100)); };
        xhr.onload = () => (xhr.status >= 200 && xhr.status < 300) ? resolve() : reject(new Error(`Upload failed (${xhr.status})`));
        xhr.onerror = () => reject(new Error("Network error during upload"));
        xhr.onabort = () => reject(new Error("Upload cancelled"));
        xhr.send(f);
      });
      // Persist synchronously the moment the upload finishes — this survives
      // tab freeze/discard even if the React commit hasn't run yet.
      patchDraft({ stagingKey: data.objectKey, uploadState: "complete" });
      setStagingKey(data.objectKey);
      setUploadPct(100);
      setUploadState("complete");
      toast.success("Plugin uploaded.");
    } catch (e: any) {
      const msg = e?.message || "Upload failed";
      setUploadErr(msg);
      setUploadState("error");
      patchDraft({ uploadState: "error", stagingKey: null });
      toast.error(msg);
    } finally {
      xhrRef.current = null;
    }
  };

  const uploadFile = async (f: File) => {
    // Guard: don't let an accidental drop/click nuke a completed upload.
    if (stagingKey && uploadState === "complete") { setReplaceOpen(f); return; }
    // Web Locks keep Chromium from freezing/discarding the tab while held,
    // so backgrounded uploads actually finish instead of being killed.
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

      // 1. Finalize R2 (copy staging → final category folder). Only required if file uploaded.
      let finalKey: string | null = null;
      if (stagingKey) {
        const { data: fin, error: finErr } = await supabase.functions.invoke("r2-finalize-upload", {
          body: { stagingKey, category, productSlug, version },
        });
        if (finErr || !fin?.objectKey) throw new Error(fin?.error || finErr?.message || "Failed to finalize file");
        finalKey = fin.objectKey;
      }

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
            <input type="file" accept=".zip" hidden onChange={e => { const f = e.target.files?.[0]; e.target.value = ""; if (f) uploadFile(f); }} />
            <Upload size={28} className="mx-auto mb-2 text-[var(--accent-red-glow)]" />
            <div className="text-sm">{zipDragOver ? "Drop to upload" : "Drop your ZIP here or click to browse"}</div>
            <div className="text-[11px] text-white/40 mt-1">Max 5GB · uploads directly to private R2 staging</div>
            {fileName && (
              <div className="mt-4 max-w-sm mx-auto text-left bg-white/5 rounded-lg p-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-mono truncate">{fileName}</span>
                  <span className="text-[10px] text-white/40 font-mono">{(fileSize/1024/1024).toFixed(1)} MB</span>
                </div>
                {uploading && (
                  <div className="mt-2 h-1.5 bg-white/10 rounded overflow-hidden">
                    <div className="h-full bg-[var(--accent-red)] transition-all" style={{ width: `${uploadPct}%` }} />
                  </div>
                )}
                {uploading && <div className="mt-1 text-[10px] text-white/50 font-mono">{uploadPct}%</div>}
                {stagingKey && !uploading && (
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-400">
                    <CheckCircle2 size={12} /> Uploaded to R2 staging
                  </div>
                )}
                {uploadErr && (
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-[var(--accent-red-glow)]">
                    <AlertCircle size={12} /> {uploadErr}
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
            <Field label={<>Cover art (JPG or PNG, 1:1, max 5MB) {req(missing.cover)}</>}>
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
