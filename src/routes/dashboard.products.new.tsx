import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { DashboardShell, DashCard } from "@/components/DashboardShell";
import { productCategories, saleEvents, formatMoney } from "@/lib/dashboard-mock";
import { Upload, Sparkles, CheckCircle2, X } from "lucide-react";
import { toast } from "sonner";

const FORMATS = ["VST", "VST3", "AU", "AAX"];

export const Route = createFileRoute("/dashboard/products/new")({
  head: () => ({ meta: [{ title: "New product — Plugin Warehouse" }] }),
  component: NewProduct,
});

function NewProduct() {
  const navigate = useNavigate();
  const [file, setFile] = useState<{ name: string; size: number } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [generating, setGenerating] = useState(false);
  const [cover, setCover] = useState<string | null>(null);
  const [category, setCategory] = useState(productCategories[0]);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [formats, setFormats] = useState<Set<string>>(new Set(["VST3", "AU"]));
  const [price, setPrice] = useState("");
  const [compareAt, setCompareAt] = useState("");
  const [includeSale, setIncludeSale] = useState(false);
  const [publishStatus, setPublishStatus] = useState<"publish" | "draft">("publish");

  const activeSale = saleEvents.find(s => s.status === "active");
  const priceNum = Number(price) || 0;
  const compareNum = Number(compareAt) || 0;
  const baseDiscountPct = compareNum > priceNum && compareNum > 0 ? Math.round((1 - priceNum / compareNum) * 100) : 0;
  const salePrice = priceNum && activeSale && includeSale ? Math.round(priceNum * (1 - activeSale.discountPct / 100)) : null;

  const onFile = (f: File) => {
    setFile({ name: f.name, size: f.size });
    setUploading(true);
    // TODO: backend — replace with R2 presigned URL upload flow.
    setTimeout(() => { setUploading(false); setUploaded(true); toast.success("Uploaded to R2"); }, 1400);
  };

  const generateDesc = () => {
    if (!name) { toast.error("Enter a plugin name first."); return; }
    setGenerating(true);
    // TODO: backend — wire to OpenAI API endpoint with brand voice prompt.
    setTimeout(() => {
      setDesc(`${name} is a bold, direct tool built for producers who want results without the fluff. Designed to slot into modern workflows, it brings character and clarity wherever you drop it. Yours forever.`);
      setGenerating(false);
    }, 1200);
  };

  const addTag = () => { if (tagInput && !tags.includes(tagInput)) { setTags([...tags, tagInput]); setTagInput(""); } };

  const save = (status: "publish" | "draft") => {
    if (!name || !price) { toast.error("Fill in required fields."); return; }
    toast.success(status === "publish" ? "Product published." : "Draft saved.");
    setTimeout(() => navigate({ to: "/dashboard/products" as any }), 600);
  };

  return (
    <DashboardShell title="New product">
      <div className="max-w-4xl mx-auto pb-32 space-y-6">
        {/* File upload */}
        <DashCard title="Plugin file">
          <label className="block border-2 border-dashed border-[var(--accent-red)]/40 rounded-xl p-8 text-center cursor-pointer hover:border-[var(--accent-red)] transition">
            <input type="file" accept=".zip" hidden onChange={e => e.target.files?.[0] && onFile(e.target.files[0])} />
            <Upload size={28} className="mx-auto mb-2 text-[var(--accent-red-glow)]" />
            <div className="text-sm">Drop your ZIP here or click to browse</div>
            <div className="text-[11px] text-white/40 mt-1">Max 5GB</div>
            {file && (
              <div className="mt-4 max-w-sm mx-auto text-left bg-white/5 rounded-lg p-3">
                <div className="flex justify-between items-center"><span className="text-xs font-mono truncate">{file.name}</span><span className="text-[10px] text-white/40 font-mono">{(file.size/1024/1024).toFixed(1)} MB</span></div>
                {uploading && <div className="mt-2 h-1.5 bg-white/10 rounded overflow-hidden"><div className="h-full bg-[var(--accent-red)] animate-pulse" style={{ width: "70%" }} /></div>}
                {uploaded && <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-400"><CheckCircle2 size={12} /> Uploaded to R2</div>}
              </div>
            )}
          </label>
        </DashCard>

        {/* Details */}
        <DashCard title="Details">
          <div className="space-y-4">
            <Field label="Plugin name *"><input value={name} onChange={e => setName(e.target.value)} className="ipt" /></Field>
            <Field label={<>Description <button onClick={generateDesc} disabled={generating} className="ml-2 inline-flex items-center gap-1 text-[10px] text-[var(--accent-red-glow)] hover:underline"><Sparkles size={11} /> {generating ? "Generating…" : "Generate description"}</button></>}>
              <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={6} className="ipt resize-none" />
              <div className="text-[10px] text-white/40 mt-1 text-right font-mono">{desc.length} chars</div>
            </Field>
            <Field label="Cover art (JPG or PNG, 1:1, max 5MB)">
              <label className="block border border-dashed border-white/20 rounded-lg p-4 text-center cursor-pointer hover:border-white/40 transition">
                <input type="file" accept="image/*" hidden onChange={e => {
                  const f = e.target.files?.[0];
                  if (f) { const r = new FileReader(); r.onload = () => setCover(r.result as string); r.readAsDataURL(f); }
                }} />
                {cover ? <img src={cover} alt="cover" className="w-32 h-32 object-cover mx-auto rounded" /> : <div className="text-xs text-white/60">Drop image or click</div>}
              </label>
            </Field>
            <Field label="Category">
              <select value={category} onChange={e => setCategory(e.target.value)} className="ipt">
                {productCategories.map(c => <option key={c} value={c} className="bg-[#1F0540]">{c.charAt(0).toUpperCase()+c.slice(1)}</option>)}
              </select>
            </Field>
            <Field label="Tags">
              <div className="flex flex-wrap gap-2 mb-2">
                {tags.map(t => <span key={t} className="inline-flex items-center gap-1 bg-white/5 border border-white/15 rounded-full px-3 py-1 text-xs">{t}<button onClick={() => setTags(tags.filter(x => x !== t))}><X size={11} /></button></span>)}
              </div>
              <input value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addTag())} placeholder="Type and press enter" className="ipt" />
            </Field>
            <Field label="Compatible formats">
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
              <Field label="Price *">
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
            <div>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" disabled={!activeSale} checked={includeSale} onChange={e => setIncludeSale(e.target.checked)} className="accent-[var(--accent-red)]" />
                <span>Stack <strong>extra</strong> discount from current sale event{activeSale ? ` (${activeSale.name}, ${activeSale.discountPct}% off)` : ""}</span>
              </label>
              {!activeSale && <p className="text-[10px] text-white/40 mt-1">No active sale to apply.</p>}
              {salePrice && <p className="text-xs text-[var(--accent-red-glow)] mt-2 font-mono">Final sale price after stack: {formatMoney(salePrice)}</p>}
            </div>
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
        <Link to="/dashboard/products" className="btn-ghost !text-xs !py-2 !px-4">Cancel</Link>
        <button onClick={() => save("draft")} className="btn-ghost !text-xs !py-2 !px-4 ml-auto">Save draft</button>
        <button onClick={() => save("publish")} className="btn-primary !text-xs !py-2 !px-6">Publish</button>
      </div>

      <style>{`.ipt{width:100%;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.15);border-radius:8px;padding:0.55rem 0.75rem;font-size:13px;color:#fff;outline:none;transition:border-color .15s}.ipt:focus{border-color:var(--accent-red)}`}</style>
    </DashboardShell>
  );
}

function Field({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return <label className="block"><span className="label-mini text-[10px] opacity-70 mb-1.5 block">{label}</span>{children}</label>;
}
