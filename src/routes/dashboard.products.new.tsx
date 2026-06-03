import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useRef, useMemo } from "react";
import { DashboardShell, DashCard } from "@/components/DashboardShell";
import { productCategories, saleEvents, formatMoney } from "@/lib/dashboard-mock";
import { Upload, Sparkles, CheckCircle2, X, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const FORMATS = ["VST", "VST3", "AU", "AAX"];
const DRAFT_KEY = "pw:new-product-draft:v1";

export const Route = createFileRoute("/dashboard/products/new")({
  head: () => ({ meta: [{ title: "New product — Plugin Warehouse" }] }),
  component: NewProduct,
});

type DraftShape = {
  file: { name: string; size: number } | null;
  uploaded: boolean;
  name: string;
  desc: string;
  cover: string | null;
  category: string;
  tags: string[];
  formats: string[];
  price: string;
  compareAt: string;
  includeSale: boolean;
  publishStatus: "publish" | "draft";
};

const emptyDraft = (): DraftShape => ({
  file: null,
  uploaded: false,
  name: "",
  desc: "",
  cover: null,
  category: productCategories[0],
  tags: [],
  formats: ["VST3", "AU"],
  price: "",
  compareAt: "",
  includeSale: false,
  publishStatus: "publish",
});

const loadDraft = (): { draft: DraftShape; resumed: boolean } => {
  if (typeof window === "undefined") return { draft: emptyDraft(), resumed: false };
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return { draft: emptyDraft(), resumed: false };
    const parsed = JSON.parse(raw) as Partial<DraftShape>;
    return { draft: { ...emptyDraft(), ...parsed }, resumed: true };
  } catch {
    return { draft: emptyDraft(), resumed: false };
  }
};

function NewProduct() {
  const navigate = useNavigate();
  const initial = useRef(loadDraft()).current;

  const [file, setFile] = useState(initial.draft.file);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(initial.draft.uploaded);
  const [name, setName] = useState(initial.draft.name);
  const [desc, setDesc] = useState(initial.draft.desc);
  const [generating, setGenerating] = useState(false);
  const [cover, setCover] = useState<string | null>(initial.draft.cover);
  const [category, setCategory] = useState(initial.draft.category);
  const [tags, setTags] = useState<string[]>(initial.draft.tags);
  const [tagInput, setTagInput] = useState("");
  const [formats, setFormats] = useState<Set<string>>(new Set(initial.draft.formats));
  const [price, setPrice] = useState(initial.draft.price);
  const [compareAt, setCompareAt] = useState(initial.draft.compareAt);
  const [includeSale, setIncludeSale] = useState(initial.draft.includeSale);
  const [publishStatus, setPublishStatus] = useState<"publish" | "draft">(initial.draft.publishStatus);
  const [resumed, setResumed] = useState(initial.resumed);
  const [cancelOpen, setCancelOpen] = useState(false);
  const savedRef = useRef(false);

  // Persist on any change (debounced via microtask batching).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const snap: DraftShape = {
      file, uploaded, name, desc, cover, category, tags,
      formats: Array.from(formats), price, compareAt, includeSale, publishStatus,
    };
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(snap)); } catch { /* quota */ }
  }, [file, uploaded, name, desc, cover, category, tags, formats, price, compareAt, includeSale, publishStatus]);

  const activeSale = saleEvents.find(s => s.status === "active");
  const priceNum = Number(price) || 0;
  const compareNum = Number(compareAt) || 0;
  const baseDiscountPct = compareNum > priceNum && compareNum > 0 ? Math.round((1 - priceNum / compareNum) * 100) : 0;
  const salePrice = priceNum && activeSale && includeSale ? Math.round(priceNum * (1 - activeSale.discountPct / 100)) : null;

  const missing = useMemo(() => ({
    file: !(file && uploaded),
    name: !name.trim(),
    desc: !desc.trim(),
    cover: !cover,
    category: !category,
    formats: formats.size === 0,
    price: !(priceNum > 0),
  }), [file, uploaded, name, desc, cover, category, formats, priceNum]);

  const canPublish = !Object.values(missing).some(Boolean);
  const isDirty =
    !!file || !!name || !!desc || !!cover || tags.length > 0 ||
    !!price || !!compareAt || includeSale ||
    formats.size !== 2 || !Array.from(formats).every(f => ["VST3", "AU"].includes(f)) ||
    category !== productCategories[0] || publishStatus !== "publish";

  const clearDraft = () => {
    try { localStorage.removeItem(DRAFT_KEY); } catch { /* */ }
  };

  const resetForm = () => {
    const e = emptyDraft();
    setFile(e.file); setUploaded(e.uploaded); setName(e.name); setDesc(e.desc);
    setCover(e.cover); setCategory(e.category); setTags(e.tags);
    setFormats(new Set(e.formats)); setPrice(e.price); setCompareAt(e.compareAt);
    setIncludeSale(e.includeSale); setPublishStatus(e.publishStatus);
    setResumed(false);
    clearDraft();
  };

  const onFile = (f: File) => {
    setFile({ name: f.name, size: f.size });
    setUploading(true);
    setUploaded(false);
    setTimeout(() => { setUploading(false); setUploaded(true); toast.success("Uploaded to R2"); }, 1400);
  };

  const generateDesc = () => {
    if (!name) { toast.error("Enter a plugin name first."); return; }
    setGenerating(true);
    setTimeout(() => {
      setDesc(`${name} is a bold, direct tool built for producers who want results without the fluff. Designed to slot into modern workflows, it brings character and clarity wherever you drop it. Yours forever.`);
      setGenerating(false);
    }, 1200);
  };

  const addTag = () => { if (tagInput && !tags.includes(tagInput)) { setTags([...tags, tagInput]); setTagInput(""); } };

  const save = (status: "publish" | "draft") => {
    if (status === "publish" && !canPublish) { toast.error("Fill in all required fields."); return; }
    if (status === "draft" && !name.trim()) { toast.error("Add a plugin name to save a draft."); return; }
    toast.success(status === "publish" ? "Product published." : "Draft saved.");
    savedRef.current = true;
    clearDraft();
    setTimeout(() => navigate({ to: "/dashboard/products" as any }), 600);
  };

  const onCancel = () => {
    if (isDirty) setCancelOpen(true);
    else navigate({ to: "/dashboard/products" as any });
  };

  const req = (m: boolean) => m ? <span className="text-[var(--accent-red)] ml-0.5" title="Required">*</span> : null;

  return (
    <DashboardShell title="New product">
      <div className="max-w-4xl mx-auto pb-32 space-y-6">
        {resumed && (
          <div className="flex items-center gap-3 rounded-lg border border-white/15 bg-white/5 px-4 py-2.5 text-xs">
            <RotateCcw size={13} className="text-[var(--accent-red-glow)]" />
            <span className="text-white/80">Resumed from your last session.</span>
            <button
              onClick={() => { resetForm(); toast.success("Draft discarded."); }}
              className="ml-auto text-[var(--accent-red-glow)] hover:underline"
            >
              Discard and start fresh
            </button>
          </div>
        )}

        {/* File upload */}
        <DashCard title={<>Plugin file {req(missing.file)}</>}>
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
            <Field label={<>Plugin name {req(missing.name)}</>}><input value={name} onChange={e => setName(e.target.value)} className="ipt" /></Field>
            <Field label={<>Description {req(missing.desc)} <button onClick={generateDesc} disabled={generating} className="ml-2 inline-flex items-center gap-1 text-[10px] text-[var(--accent-red-glow)] hover:underline"><Sparkles size={11} /> {generating ? "Generating…" : "Generate description"}</button></>}>
              <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={6} className="ipt resize-none" />
              <div className="text-[10px] text-white/40 mt-1 text-right font-mono">{desc.length} chars</div>
            </Field>
            <Field label={<>Cover art (JPG or PNG, 1:1, max 5MB) {req(missing.cover)}</>}>
              <label className="block border border-dashed border-white/20 rounded-lg p-4 text-center cursor-pointer hover:border-white/40 transition">
                <input type="file" accept="image/*" hidden onChange={e => {
                  const f = e.target.files?.[0];
                  if (f) { const r = new FileReader(); r.onload = () => setCover(r.result as string); r.readAsDataURL(f); }
                }} />
                {cover ? <img src={cover} alt="cover" className="w-32 h-32 object-cover mx-auto rounded" /> : <div className="text-xs text-white/60">Drop image or click</div>}
              </label>
            </Field>
            <Field label={<>Category {req(missing.category)}</>}>
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
        <button onClick={onCancel} className="btn-ghost !text-xs !py-2 !px-4">Cancel</button>
        <button onClick={() => save("draft")} className="btn-ghost !text-xs !py-2 !px-4 ml-auto">Save draft</button>
        <button
          onClick={() => save("publish")}
          disabled={!canPublish}
          aria-disabled={!canPublish}
          title={canPublish ? "Publish product" : "Complete required fields to publish"}
          className={`btn-primary !text-xs !py-2 !px-6 transition-all duration-200 ${canPublish ? "" : "opacity-40 grayscale pointer-events-none"}`}
        >
          Publish
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
            <AlertDialogAction
              onClick={() => { clearDraft(); navigate({ to: "/dashboard/products" as any }); }}
              className="bg-[var(--accent-red)] hover:bg-[var(--accent-red)]/90"
            >
              Discard
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
