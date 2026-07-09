import { createFileRoute, Link, useParams, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DashboardShell, DashCard } from "@/components/DashboardShell";
import { supabase } from "@/integrations/supabase/client";
import { productCategories } from "@/lib/dashboard-mock";
import { Upload, X, Sparkles, RefreshCw } from "lucide-react";
import { toast } from "sonner";

const FORMATS = ["VST", "VST3", "AU", "AAX"];

export const Route = createFileRoute("/dashboard/products/$id")({
  head: () => ({ meta: [{ title: "Edit product — Plugin Warehouse" }] }),
  component: EditProduct,
});

type Row = {
  id: string; slug: string; name: string; maker: string; category: string;
  description: string | null; tags: string[] | null; formats: string[] | null;
  version: string | null; price: number; compare_at_price: number | null;
  status: "draft" | "published" | "archived";
  cover_url: string | null; cover_gradient: string | null;
  supports_windows: boolean; supports_mac: boolean;
  is_free: boolean | null;
};

type FileRow = { zip_url: string; zip_file_name: string | null };

async function fetchProduct(id: string): Promise<Row | null> {
  const { data, error } = await supabase
    .from("products")
    .select("id,slug,name,maker,category,description,tags,formats,version,price,compare_at_price,status,cover_url,cover_gradient,supports_windows,supports_mac,is_free")
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

  useEffect(() => {
    if (!product) return;
    setName(product.name);
    setMaker(product.maker || "");
    setDesc(product.description || "");
    setCategory(product.category);
    setPrice(String(product.price ?? ""));
    setCompareAt(product.compare_at_price ? String(product.compare_at_price) : "");
    setVersion(product.version || "");
    setFormats(new Set(product.formats || []));
    setTags(product.tags || []);
    setCoverUrl(product.cover_url);
    setCoverGradient(product.cover_gradient);
    setStatus(product.status);
    setSupportsWindows(product.supports_windows ?? true);
    setSupportsMac(product.supports_mac ?? false);
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
    if (f.size > 5 * 1024 * 1024 * 1024) { toast.error("Max 5GB via edit page. For larger files, use the New Product uploader."); return; }
    setZipUploading(true);
    setZipProgress(0);
    const oldKey = fileRow?.zip_url ?? null;
    try {
      const { data, error } = await supabase.functions.invoke("r2-upload-url", {
        body: { kind: "zip", filename: f.name, size: f.size, contentType: f.type || "application/zip" },
      });
      if (error || !data?.uploadUrl || !data?.objectKey) throw new Error(data?.error || error?.message || "Failed to get upload URL");
      const newKey: string = data.objectKey;

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", data.uploadUrl);
        xhr.upload.onprogress = (ev) => { if (ev.lengthComputable) setZipProgress(Math.round((ev.loaded / ev.total) * 100)); };
        xhr.onload = () => (xhr.status >= 200 && xhr.status < 300) ? resolve() : reject(new Error(`Upload failed (${xhr.status})`));
        xhr.onerror = () => reject(new Error("Network error during upload"));
        xhr.send(f);
      });

      // Point product_files at the new key (upsert on product_id).
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

      // Delete the previous zip from R2 (fire-and-forget).
      if (oldKey && oldKey !== newKey) void deleteR2([oldKey]);

      await refetchFile();
      queryClient.invalidateQueries({ queryKey: ["dashboard-products"] });
      toast.success("Plugin file replaced.");
    } catch (e: any) {
      toast.error(e.message || "File replace failed");
    } finally {
      setZipUploading(false);
      setZipProgress(0);
      if (zipInputRef.current) zipInputRef.current.value = "";
    }
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
      const { error: upErr } = await supabase.from("products").update({
        name: name.trim(),
        maker: maker.trim(),
        description: desc,
        category,
        price: Number(price) || 0,
        compare_at_price: Number(compareAt) > 0 ? Number(compareAt) : null,
        version,
        formats: Array.from(formats),
        cover_url: coverUrl,
        status,
        supports_windows: supportsWindows,
        supports_mac: supportsMac,
        published_at: status === "published" ? new Date().toISOString() : null,
      }).eq("id", id);
      if (upErr) throw new Error(upErr.message);
      queryClient.invalidateQueries({ queryKey: ["dashboard-products"] });
      toast.success("Product saved.");
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
    navigate({ to: "/dashboard/products" as any });
  };

  return (
    <DashboardShell title={`Edit · ${product.name}`}>
      <div className="max-w-4xl mx-auto pb-24 space-y-6">
        <DashCard title="Details">
          <div className="grid grid-cols-1 md:grid-cols-[8rem_1fr] gap-4">
            <label className="block">
              <input type="file" accept="image/*" hidden onChange={e => { const f = e.target.files?.[0]; if (f) uploadCover(f); }} />
              {coverUrl
                ? <img src={coverUrl} alt="cover" className="w-32 h-32 rounded-lg object-cover border border-white/10 cursor-pointer" />
                : <div className="w-32 h-32 rounded-lg flex items-center justify-center text-[10px] text-white/60 cursor-pointer border border-dashed border-white/20" style={{ background: coverGradient || undefined }}>{coverUploading ? "Uploading…" : "Upload cover"}</div>}
            </label>
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
                <Field label="Version"><input value={version} onChange={e => setVersion(e.target.value)} className="ipt" /></Field>
              </div>
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
            </div>
          </div>
        </DashCard>

        <DashCard title="Plugin file">
          <div className="space-y-3">
            <div className="text-[11px] font-mono text-white/60">
              {fileRow?.zip_file_name
                ? <>Current: <span className="text-white/90">{fileRow.zip_file_name}</span></>
                : <span className="text-[var(--accent-red-glow)]">No file attached — upload one below.</span>}
            </div>
            <input
              ref={zipInputRef}
              type="file"
              accept=".zip,application/zip,application/x-zip-compressed"
              hidden
              onChange={e => { const f = e.target.files?.[0]; if (f) replaceZip(f); }}
            />
            <button
              type="button"
              disabled={zipUploading}
              onClick={() => zipInputRef.current?.click()}
              className="btn-ghost !text-xs !py-2 !px-4 inline-flex items-center gap-2 disabled:opacity-50"
            >
              <RefreshCw size={13} className={zipUploading ? "animate-spin" : ""} />
              {zipUploading ? `Uploading… ${zipProgress}%` : (fileRow ? "Replace plugin file" : "Upload plugin file")}
            </button>
            <p className="text-[10px] text-white/40 font-mono">
              Uploading a new file overwrites the current one — the old file is removed from storage automatically.
            </p>
          </div>
        </DashCard>

        <DashCard title="Pricing & status">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="Price"><input type="number" value={price} onChange={e => setPrice(e.target.value)} className="ipt" /></Field>
            <Field label="Compare-at price"><input type="number" value={compareAt} onChange={e => setCompareAt(e.target.value)} className="ipt" placeholder="optional" /></Field>
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
        <Link to="/dashboard/products" className="btn-ghost !text-xs !py-2 !px-4">Back</Link>
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

// Touch unused import to avoid linter trim
void Upload;
