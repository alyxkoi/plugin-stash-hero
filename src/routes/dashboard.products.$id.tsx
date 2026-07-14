import { createFileRoute, Link, useParams, useNavigate } from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DashboardShell, DashCard } from "@/components/DashboardShell";
import { LibraryTypeField } from "@/components/LibraryTypeField";
import { supabase } from "@/integrations/supabase/client";
import { productCategories } from "@/lib/dashboard-mock";
import { Upload, X, Sparkles, RefreshCw, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { uploadZipMultipart, type MultipartHandle } from "@/lib/multipart-upload";

const FORMATS = ["VST", "VST3", "AU", "AAX"];

// Search params carried through from the products list, so Save/Back returns
// the user to the exact page, filter, and search they came from.
const editSearchSchema = z.object({
  q: fallback(z.string(), "").default(""),
  cat: fallback(z.string(), "all").default("all"),
  status: fallback(z.string(), "all").default("all"),
  page: fallback(z.number().int(), 1).default(1),
});

export const Route = createFileRoute("/dashboard/products/$id")({
  head: () => ({ meta: [{ title: "Edit product — Plugin Warehouse" }] }),
  validateSearch: zodValidator(editSearchSchema),
  component: EditProduct,
});


type Row = {
  id: string; slug: string; name: string; maker: string; category: string;
  description: string | null; tags: string[] | null; formats: string[] | null;
  version: string | null; library_type: string | null;
  price: number; compare_at_price: number | null;
  status: "draft" | "published" | "archived";
  cover_url: string | null; cover_gradient: string | null;
  supports_windows: boolean; supports_mac: boolean;
  is_free: boolean | null;
};

type FileRow = { zip_url: string; zip_file_name: string | null };

async function fetchProduct(id: string): Promise<Row | null> {
  const { data, error } = await supabase
    .from("products")
    .select("id,slug,name,maker,category,description,tags,formats,version,library_type,price,compare_at_price,status,cover_url,cover_gradient,supports_windows,supports_mac,is_free")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as Row | null;
}

async function fetchProductFile(id: string): Promise<FileRow | null> {
  const { data, error } = await supabase
    .from("product_files")
    .select("zip_url, zip_file_name")
    .eq("product_id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as FileRow | null) ?? null;
}

// Delete objects from R2. Non-blocking — failures are logged but never block
// the user's flow (orphans get swept later by r2-cleanup-staging or manually).
async function deleteR2(paths: Array<string | null | undefined>) {
  const clean = paths.filter((p): p is string => typeof p === "string" && p.length > 0);
  if (!clean.length) return;
  try {
    const { error } = await supabase.functions.invoke("r2-delete-objects", { body: { paths: clean } });
    if (error) console.warn("R2 delete failed:", error.message);
  } catch (e) {
    console.warn("R2 delete threw:", e);
  }
}

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function EditProduct() {
  const { id } = useParams({ from: "/dashboard/products/$id" });
  const returnSearch = Route.useSearch();
  const backToList = () => navigate({ to: "/dashboard/products", search: returnSearch as any });

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: product, isLoading, error } = useQuery({
    queryKey: ["dashboard-product", id],
    queryFn: () => fetchProduct(id),
    staleTime: 0,
  });
  const { data: fileRow, refetch: refetchFile } = useQuery({
    queryKey: ["dashboard-product-file", id],
    queryFn: () => fetchProductFile(id),
    staleTime: 0,
  });

  const [name, setName] = useState("");
  const [maker, setMaker] = useState("");
  const [desc, setDesc] = useState("");
  const [category, setCategory] = useState(productCategories[0]);
  const [price, setPrice] = useState("");
  const [compareAt, setCompareAt] = useState("");
  const [version, setVersion] = useState("");
  const [libraryType, setLibraryType] = useState<string>("");
  const [formats, setFormats] = useState<Set<string>>(new Set());
  const [tags, setTags] = useState<string[]>([]);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [coverGradient, setCoverGradient] = useState<string | null>(null);
  const [status, setStatus] = useState<"draft" | "published" | "archived">("draft");
  const [supportsWindows, setSupportsWindows] = useState(true);
  const [supportsMac, setSupportsMac] = useState(false);
  const [isFree, setIsFree] = useState(false);

  const [coverUploading, setCoverUploading] = useState(false);
  const [zipUploading, setZipUploading] = useState(false);
  const [zipProgress, setZipProgress] = useState(0);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [typed, setTyped] = useState("");
  const zipInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [pendingReplaceFile, setPendingReplaceFile] = useState<File | null>(null);
  const uploadHandleRef = useRef<MultipartHandle | null>(null);
  const [coverDrag, setCoverDrag] = useState(false);
  const [zipDrag, setZipDrag] = useState(false);

  useEffect(() => {
    if (!product) return;
    setName(product.name);
    setMaker(product.maker || "");
    setDesc(product.description || "");
    setCategory(product.category);
    setPrice(String(product.price ?? ""));
    setCompareAt(product.compare_at_price ? String(product.compare_at_price) : "");
    setVersion(product.version || "");
    setLibraryType(product.library_type || "");
    setFormats(new Set(product.formats || []));
    setTags(product.tags || []);
    setCoverUrl(product.cover_url);
    setCoverGradient(product.cover_gradient);
    setStatus(product.status);
    setSupportsWindows(product.supports_windows ?? true);
    setSupportsMac(product.supports_mac ?? false);
    setIsFree(!!product.is_free || Number(product.price) === 0);
  }, [product]);


  if (isLoading) {
    return <DashboardShell title="Loading…"><DashCard><p className="text-sm text-white/50 font-mono py-6 text-center">Loading product…</p></DashCard></DashboardShell>;
  }
  if (error) {
    return <DashboardShell title="Error"><DashCard><p className="text-sm text-[var(--accent-red-glow)] py-6 text-center">Couldn't load product: {(error as Error).message}</p></DashCard></DashboardShell>;
  }
  if (!product) {
    return <DashboardShell title="Product not found"><DashCard><p className="text-sm text-white/60">No product matches that id. <Link to="/dashboard/products" className="text-[var(--accent-red-glow)]">Back to products</Link></p></DashCard></DashboardShell>;
  }

  const uploadCover = async (f: File) => {
    setCoverUploading(true);
    const oldCover = coverUrl;
    try {
      const { data, error } = await supabase.functions.invoke("r2-upload-url", {
        body: { kind: "cover", filename: f.name, size: f.size, contentType: f.type || "image/jpeg" },
      });
      if (error || !data?.uploadUrl) throw new Error(data?.error || error?.message || "Failed to get upload URL");
      const put = await fetch(data.uploadUrl, { method: "PUT", body: f });
      if (!put.ok) throw new Error(`Cover upload failed (${put.status})`);
      const newUrl = data.publicUrl || data.objectKey;
      setCoverUrl(newUrl);
      // Persist immediately so old cover can safely be deleted.
      await supabase.from("products").update({ cover_url: newUrl }).eq("id", id);
      // Delete previous cover from R2 (fire-and-forget).
      if (oldCover && oldCover !== newUrl) void deleteR2([oldCover]);
      toast.success("Cover uploaded.");
    } catch (e: any) {
      toast.error(e.message || "Cover upload failed");
    } finally { setCoverUploading(false); }
  };

  const replaceZip = async (f: File) => {
    if (zipUploading) return;
    if (!/\.zip$/i.test(f.name)) { toast.error("Plugin file must be a .zip"); return; }
    if (f.size > 50 * 1024 * 1024 * 1024) { toast.error("Max 50GB."); return; }
    setZipUploading(true);
    setZipProgress(0);
    const oldKey = fileRow?.zip_url ?? null;
    try {
      // 1. Upload the new file FIRST via multipart. Old file stays intact
      //    until the new file is verified — a failed upload never leaves the
      //    product without a working download.
      const handle = uploadZipMultipart(f, { onProgress: setZipProgress });
      uploadHandleRef.current = handle;
      const { objectKey: newKey } = await handle.promise;

      // 2. Point product_files at the new key (only after successful upload).
      if (fileRow) {
        const { error: uErr } = await supabase.from("product_files").update({
          zip_url: newKey, zip_file_name: f.name,
        }).eq("product_id", id);
        if (uErr) throw new Error(uErr.message);
      } else {
        const { error: iErr } = await supabase.from("product_files").insert({
          product_id: id, zip_url: newKey, zip_file_name: f.name,
        });
        if (iErr) throw new Error(iErr.message);
      }
      await supabase.from("products").update({ file_size: formatBytes(f.size) }).eq("id", id);

      // 3. NOW delete the previous zip from R2 — the DB already points at the
      //    verified new file, so this is safe. Awaited so we can surface a
      //    clear success message that also confirms the old file is gone.
      let oldDeleted = false;
      if (oldKey && oldKey !== newKey) {
        try {
          const { error: dErr } = await supabase.functions.invoke("r2-delete-objects", { body: { paths: [oldKey] } });
          if (dErr) console.warn("R2 delete failed:", dErr.message);
          else oldDeleted = true;
        } catch (e) {
          console.warn("R2 delete threw:", e);
        }
      }

      await refetchFile();
      queryClient.invalidateQueries({ queryKey: ["dashboard-products"] });
      if (oldKey) {
        toast.success(oldDeleted
          ? "New plugin file is live. Old file deleted from storage."
          : "New plugin file is live. Old file couldn't be removed from storage — it'll be swept later.");
      } else {
        toast.success("Plugin file uploaded.");
      }
    } catch (e: any) {
      toast.error(e.message || "File replace failed");
    } finally {
      uploadHandleRef.current = null;
      setZipUploading(false);
      setZipProgress(0);
      if (zipInputRef.current) zipInputRef.current.value = "";
    }
  };

  const cancelUpload = () => {
    try { uploadHandleRef.current?.abort(); } catch { /* */ }
    uploadHandleRef.current = null;
  };

  const generateDesc = async () => {
    if (!name.trim()) { toast.error("Enter a plugin name first."); return; }
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-product-description", {
        body: { name, category, tags, daws: Array.from(formats) },
      });
      if (error || !data?.description) throw new Error(data?.error || error?.message || "AI request failed");
      setDesc(data.description);
      toast.success("Description regenerated.");
    } catch (e: any) {
      toast.error(e.message || "Couldn't generate description");
    } finally { setGenerating(false); }
  };

  const save = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const effectivePrice = isFree ? 0 : (Number(price) || 0);
      const isLibrary = category === "libraries";
      const { error: upErr } = await supabase.from("products").update({
        name: name.trim(),
        maker: maker.trim(),
        description: desc,
        category,
        price: effectivePrice,
        compare_at_price: !isFree && Number(compareAt) > 0 ? Number(compareAt) : null,
        version,
        library_type: isLibrary ? (libraryType.trim() || null) : null,
        formats: isLibrary ? [] : Array.from(formats),
        cover_url: coverUrl,
        status,
        supports_windows: isLibrary ? false : supportsWindows,
        supports_mac: isLibrary ? false : supportsMac,
        is_free: isFree || effectivePrice === 0,
        published_at: status === "published" ? new Date().toISOString() : null,
      }).eq("id", id);
      if (upErr) throw new Error(upErr.message);

      queryClient.invalidateQueries({ queryKey: ["dashboard-products"] });
      toast.success("Product saved.");
      backToList();
    } catch (e: any) {
      toast.error(e.message || "Save failed");
    } finally { setSaving(false); }
  };

  const remove = async () => {
    // 1. Collect every R2 object attached to this product BEFORE nuking DB rows.
    const paths: string[] = [];
    if (coverUrl) paths.push(coverUrl);
    const { data: files } = await supabase.from("product_files").select("zip_url").eq("product_id", id);
    for (const r of (files ?? []) as Array<{ zip_url: string | null }>) {
      if (r.zip_url) paths.push(r.zip_url);
    }

    // 2. Delete DB row (product_files cascade via FK, or explicit cleanup here).
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }

    // 3. Delete R2 objects so nothing lingers and re-uploads start clean.
    if (paths.length) void deleteR2(paths);

    queryClient.invalidateQueries({ queryKey: ["dashboard-products"] });
    toast.success("Product and files deleted.");
    backToList();
  };

  return (
    <DashboardShell title={`Edit · ${product.name}`}>
      <div className="max-w-4xl mx-auto pb-24 space-y-6">
        <DashCard title="Details">
          <div className="grid grid-cols-1 md:grid-cols-[8rem_1fr] gap-4">
            <div
              onDragOver={(e) => { e.preventDefault(); setCoverDrag(true); }}
              onDragEnter={(e) => { e.preventDefault(); setCoverDrag(true); }}
              onDragLeave={() => setCoverDrag(false)}
              onDrop={(e) => {
                e.preventDefault();
                setCoverDrag(false);
                const f = e.dataTransfer.files?.[0];
                if (!f) return;
                if (!f.type.startsWith("image/")) { toast.error("Drop an image file"); return; }
                uploadCover(f);
              }}
              onClick={() => coverInputRef.current?.click()}
              className={`w-32 h-32 rounded-lg overflow-hidden border-2 border-dashed cursor-pointer relative transition-all ${coverDrag ? "border-[var(--accent-red-glow)] bg-[var(--accent-red)]/10 scale-[1.02]" : "border-white/20 hover:border-white/40"}`}
              title="Click or drag an image to replace"
            >
              <input ref={coverInputRef} type="file" accept="image/*" hidden onChange={e => { const f = e.target.files?.[0]; if (f) uploadCover(f); if (coverInputRef.current) coverInputRef.current.value = ""; }} />
              {coverUrl
                ? <img src={coverUrl} alt="cover" className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center text-[10px] text-white/60 text-center px-2" style={{ background: coverGradient || undefined }}>{coverUploading ? "Uploading…" : "Drop image or click to upload"}</div>}
              {coverDrag && (
                <div className="absolute inset-0 flex items-center justify-center bg-[var(--accent-red)]/30 text-[10px] font-mono text-white pointer-events-none">Drop to replace</div>
              )}
              {coverUploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-[10px] font-mono text-white">Uploading…</div>
              )}
            </div>
            <div className="space-y-3">
              <Field label="Name"><input value={name} onChange={e => setName(e.target.value)} className="ipt" /></Field>
              <Field label="Maker"><input value={maker} onChange={e => setMaker(e.target.value)} className="ipt" /></Field>
              <Field
                label={<>
                  Description
                  <button
                    type="button"
                    onClick={generateDesc}
                    disabled={generating}
                    className="ml-2 inline-flex items-center gap-1 text-[10px] text-[var(--accent-red-glow)] hover:underline disabled:opacity-50"
                  >
                    <Sparkles size={11} /> {generating ? "Thinking…" : "Generate description"}
                  </button>
                </>}
              >
                <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={5} className="ipt resize-none" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Category">
                  <select value={category} onChange={e => setCategory(e.target.value)} className="ipt">
                    {productCategories.map(c => <option key={c} value={c} className="bg-[#1F0540]">{c}</option>)}
                  </select>
                </Field>
                {category === "libraries" ? (
                  <Field label="Library type">
                    <LibraryTypeField value={libraryType || null} onChange={setLibraryType} />
                  </Field>
                ) : (
                  <Field label="Version"><input value={version} onChange={e => setVersion(e.target.value)} className="ipt" /></Field>
                )}
              </div>
              {category !== "libraries" && (
                <Field label="Formats">
                  <div className="flex flex-wrap gap-2">
                    {FORMATS.map(f => {
                      const on = formats.has(f);
                      return (
                        <button key={f} onClick={() => { const n = new Set(formats); on ? n.delete(f) : n.add(f); setFormats(n); }}
                          className={`text-xs px-3 py-1.5 rounded-md border font-mono ${on ? "bg-[var(--accent-red)]/15 border-[var(--accent-red)]/60" : "bg-white/5 border-white/15 text-white/70"}`}>{f}</button>
                      );
                    })}
                  </div>
                </Field>
              )}
              {category !== "libraries" && (
                <Field label="Operating system">
                  <div className="flex flex-wrap gap-2">
                    <label className={`inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-md border font-mono cursor-pointer ${supportsWindows ? "bg-[var(--accent-red)]/15 border-[var(--accent-red)]/60" : "bg-white/5 border-white/15 text-white/70"}`}>
                      <input type="checkbox" checked={supportsWindows} onChange={e => setSupportsWindows(e.target.checked)} className="accent-[var(--accent-red)]" />
                      Windows
                    </label>
                    <label className={`inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-md border font-mono cursor-pointer ${supportsMac ? "bg-[var(--accent-red)]/15 border-[var(--accent-red)]/60" : "bg-white/5 border-white/15 text-white/70"}`}>
                      <input type="checkbox" checked={supportsMac} onChange={e => {
                        const mac = e.target.checked;
                        setSupportsMac(mac);
                        setFormats((prev) => {
                          const n = new Set(prev);
                          if (mac) n.add("AU");
                          else n.delete("AU");
                          return n;
                        });
                      }} className="accent-[var(--accent-red)]" />
                      Mac
                    </label>
                  </div>
                </Field>
              )}
            </div>
          </div>
        </DashCard>

        <DashCard title="Plugin file">
          <div
            onDragOver={(e) => { e.preventDefault(); if (!zipUploading) setZipDrag(true); }}
            onDragEnter={(e) => { e.preventDefault(); if (!zipUploading) setZipDrag(true); }}
            onDragLeave={(e) => {
              // Only clear when leaving the zone itself, not children
              if (e.currentTarget === e.target) setZipDrag(false);
            }}
            onDrop={(e) => {
              e.preventDefault();
              setZipDrag(false);
              if (zipUploading) return;
              const f = e.dataTransfer.files?.[0];
              if (!f) return;
              if (!/\.zip$/i.test(f.name)) { toast.error("Plugin file must be a .zip"); return; }
              if (f.size > 50 * 1024 * 1024 * 1024) { toast.error("Max 50GB."); return; }
              if (fileRow) setPendingReplaceFile(f);
              else replaceZip(f);
            }}
            className={`space-y-3 rounded-lg border-2 border-dashed p-4 transition-all ${zipDrag ? "border-[var(--accent-red-glow)] bg-[var(--accent-red)]/10" : "border-white/15"}`}
          >
            <div className="text-[11px] font-mono text-white/60">
              {fileRow?.zip_file_name
                ? <>Current: <span className="text-white/90">{fileRow.zip_file_name}</span></>
                : <span className="text-[var(--accent-red-glow)]">No file attached — drop a .zip or click below.</span>}
            </div>
            <div className={`text-xs font-mono ${zipDrag ? "text-[var(--accent-red-glow)]" : "text-white/50"}`}>
              {zipDrag ? "Drop the .zip to replace" : "Drag & drop a .zip here, or use the button below"}
            </div>
            <input
              ref={zipInputRef}
              type="file"
              accept=".zip,application/zip,application/x-zip-compressed"
              hidden
              onChange={e => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (!f) return;
                if (!/\.zip$/i.test(f.name)) { toast.error("Plugin file must be a .zip"); return; }
                if (fileRow) setPendingReplaceFile(f);
                else replaceZip(f);
              }}
            />
            <div className="flex items-center gap-3 flex-wrap">
              <button
                type="button"
                disabled={zipUploading}
                onClick={() => zipInputRef.current?.click()}
                className="btn-ghost !text-xs !py-2 !px-4 inline-flex items-center gap-2 disabled:opacity-50"
              >
                <RefreshCw size={13} className={zipUploading ? "animate-spin" : ""} />
                {zipUploading ? `Uploading… ${zipProgress}%` : (fileRow ? "Replace plugin file" : "Upload plugin file")}
              </button>
              {zipUploading && (
                <button type="button" onClick={cancelUpload} className="text-[11px] text-white/60 hover:text-[var(--accent-red-glow)] underline">Cancel</button>
              )}
            </div>
            {zipUploading && (
              <div className="max-w-md h-1.5 bg-white/10 rounded overflow-hidden">
                <div className="h-full bg-[var(--accent-red)] transition-all" style={{ width: `${zipProgress}%` }} />
              </div>
            )}
            <p className="text-[10px] text-white/40 font-mono">
              Up to 50GB · multipart upload · 8 parallel chunks · resumable per chunk. The old file stays live until the new upload completes and verifies — then it's deleted from storage.
            </p>
          </div>
        </DashCard>

        {pendingReplaceFile && (
          <ReplaceConfirmDialog
            file={pendingReplaceFile}
            currentFileName={fileRow?.zip_file_name ?? null}
            onCancel={() => setPendingReplaceFile(null)}
            onConfirm={() => {
              const f = pendingReplaceFile;
              setPendingReplaceFile(null);
              if (f) replaceZip(f);
            }}
          />
        )}

        <DashCard title="Pricing & status">
          <label className="flex items-start gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5 mb-4 cursor-pointer hover:bg-white/[0.05]">
            <input
              type="checkbox"
              checked={isFree}
              onChange={e => setIsFree(e.target.checked)}
              className="accent-[var(--accent-red)] mt-0.5"
            />
            <div>
              <div className="font-mono text-xs tracking-wider text-white">FREEBIE</div>
              <div className="text-[11px] text-white/50 font-mono mt-0.5">
                Give this plugin away for free. Price locks at $0 and the storefront shows "FREE".
              </div>
            </div>
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="Price">
              <input
                type="number"
                value={isFree ? "0" : price}
                onChange={e => setPrice(e.target.value)}
                disabled={isFree}
                className={`ipt ${isFree ? "opacity-50 cursor-not-allowed" : ""}`}
              />
            </Field>
            <Field label="Compare-at price">
              <input
                type="number"
                value={compareAt}
                onChange={e => setCompareAt(e.target.value)}
                disabled={isFree}
                className={`ipt ${isFree ? "opacity-50 cursor-not-allowed" : ""}`}
                placeholder="optional"
              />
            </Field>
            <Field label="Status">
              <select value={status} onChange={e => setStatus(e.target.value as any)} className="ipt">
                <option value="draft" className="bg-[#1F0540]">Draft</option>
                <option value="published" className="bg-[#1F0540]">Published</option>
                <option value="archived" className="bg-[#1F0540]">Archived</option>
              </select>
            </Field>
          </div>

          <div className="text-[10px] text-white/40 mt-3 font-mono">Slug: {product.slug}</div>
          {coverUrl && <div className="text-[10px] text-white/40 mt-1 font-mono break-all">cover_url: {coverUrl}</div>}
        </DashCard>

        <div className="glass-card p-5 border !border-[var(--accent-red)]/40">
          <div className="chromatic-edge" />
          <div className="relative z-10">
            <h3 className="font-display text-base text-[var(--accent-red-glow)] mb-3">Danger zone</h3>
            <p className="text-[11px] text-white/60 mb-3 font-mono">Deletes this product AND its plugin file + cover image from storage.</p>
            <button onClick={() => setConfirmDelete(true)} className="btn-primary !text-xs !py-2 !px-4">Delete permanently</button>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 md:left-[220px] right-0 z-30 border-t border-white/10 bg-[#13002C]/95 backdrop-blur-md px-6 py-3 flex items-center gap-3">
        <Link to="/dashboard/products" search={returnSearch as any} className="btn-ghost !text-xs !py-2 !px-4">Back</Link>
        <button onClick={save} disabled={saving} className="btn-primary !text-xs !py-2 !px-6 ml-auto">{saving ? "Saving…" : "Save changes"}</button>
      </div>

      {confirmDelete && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setConfirmDelete(false)}>
          <div className="glass-card p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="chromatic-edge" />
            <div className="relative z-10">
              <div className="flex justify-between items-center mb-3"><h3 className="font-display text-lg">Confirm delete</h3><button onClick={() => setConfirmDelete(false)}><X size={16} /></button></div>
              <p className="text-sm text-white/70 mb-4">Type <span className="font-mono text-[var(--accent-red-glow)]">{product.name}</span> to confirm.</p>
              <input value={typed} onChange={e => setTyped(e.target.value)} className="ipt mb-4" />
              <div className="flex gap-2 justify-end">
                <button onClick={() => setConfirmDelete(false)} className="btn-ghost !text-xs !py-2 !px-4">Cancel</button>
                <button disabled={typed !== product.name} onClick={remove} className="btn-primary !text-xs !py-2 !px-4 disabled:opacity-40">Delete</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`.ipt{width:100%;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.15);border-radius:8px;padding:0.55rem 0.75rem;font-size:13px;color:#fff;outline:none;transition:border-color .15s}.ipt:focus{border-color:var(--accent-red)}`}</style>
    </DashboardShell>
  );
}

function Field({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return <label className="block"><span className="label-mini text-[10px] opacity-70 mb-1.5 block">{label}</span>{children}</label>;
}

function ReplaceConfirmDialog({
  file, currentFileName, onCancel, onConfirm,
}: { file: File; currentFileName: string | null; onCancel: () => void; onConfirm: () => void }) {
  return (
    <div className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-4" style={{ backdropFilter: "blur(6px)" }} onClick={onCancel}>
      <div className="glass-card p-6 w-full max-w-md" onClick={e => e.stopPropagation()} style={{ background: "rgba(20,5,44,0.96)" }}>
        <div className="chromatic-edge" />
        <div className="relative z-10">
          <div className="flex items-start gap-3 mb-3">
            <AlertTriangle className="text-[var(--accent-red-glow)] mt-0.5 shrink-0" size={20} />
            <div>
              <h3 className="font-display text-lg">Replace plugin file?</h3>
              <p className="text-[11px] font-mono text-white/50 mt-0.5">This can't be undone.</p>
            </div>
          </div>
          <div className="text-sm text-white/80 space-y-2 mb-4">
            <div>
              You're about to replace{" "}
              <span className="font-mono text-white/95 break-all">{currentFileName || "the current file"}</span>{" "}
              with{" "}
              <span className="font-mono text-[var(--accent-red-glow)] break-all">{file.name}</span>{" "}
              <span className="text-white/50 font-mono text-xs">({formatBytes(file.size)})</span>.
            </div>
            <div className="text-[12px] text-white/60">
              The old file will be permanently deleted from storage <strong>only after</strong> the new file uploads successfully. If the upload fails, your current file stays live.
            </div>
          </div>
          <div className="flex gap-2 justify-end pt-3 border-t border-white/10">
            <button onClick={onCancel} className="btn-ghost !text-xs !py-2 !px-4">Cancel</button>
            <button onClick={onConfirm} className="btn-primary !text-xs !py-2 !px-4">Replace file</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Touch unused import to avoid linter trim
void Upload;
