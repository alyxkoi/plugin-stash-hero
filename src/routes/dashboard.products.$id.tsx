import { createFileRoute, Link, useParams, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DashboardShell, DashCard } from "@/components/DashboardShell";
import { supabase } from "@/integrations/supabase/client";
import { productCategories } from "@/lib/dashboard-mock";
import { Upload, X } from "lucide-react";
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
};

async function fetchProduct(id: string): Promise<Row | null> {
  const { data, error } = await supabase
    .from("products")
    .select("id,slug,name,maker,category,description,tags,formats,version,price,compare_at_price,status,cover_url,cover_gradient,supports_windows,supports_mac")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as Row | null;
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

  const [name, setName] = useState("");
  const [maker, setMaker] = useState("");
  const [desc, setDesc] = useState("");
  const [category, setCategory] = useState(productCategories[0]);
  const [price, setPrice] = useState("");
  const [compareAt, setCompareAt] = useState("");
  const [version, setVersion] = useState("");
  const [formats, setFormats] = useState<Set<string>>(new Set());
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [coverGradient, setCoverGradient] = useState<string | null>(null);
  const [status, setStatus] = useState<"draft" | "published" | "archived">("draft");
  const [supportsWindows, setSupportsWindows] = useState(true);
  const [supportsMac, setSupportsMac] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [typed, setTyped] = useState("");

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
    } finally { setCoverUploading(false); }
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
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Deleted.");
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
              <Field label="Description"><textarea value={desc} onChange={e => setDesc(e.target.value)} rows={5} className="ipt resize-none" /></Field>
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
                  {([["Windows", supportsWindows, setSupportsWindows], ["Mac", supportsMac, setSupportsMac]] as const).map(([label, checked, setter]) => (
                    <label key={label} className={`inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-md border font-mono cursor-pointer ${checked ? "bg-[var(--accent-red)]/15 border-[var(--accent-red)]/60" : "bg-white/5 border-white/15 text-white/70"}`}>
                      <input type="checkbox" checked={checked} onChange={e => setter(e.target.checked)} className="accent-[var(--accent-red)]" />
                      {label}
                    </label>
                  ))}
                </div>
              </Field>
            </div>
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
