import { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";

const LS_KEY = "pw-library-types";
const DEFAULTS = ["Serum", "Kontakt", "Drum Kit", "Omnisphere", "Sample Pack"];

function loadCustom(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LS_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function saveCustom(list: string[]) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(list)); } catch { /* */ }
}

export function LibraryTypeField({
  value,
  onChange,
  className,
}: {
  value: string | null;
  onChange: (v: string) => void;
  className?: string;
}) {
  const [custom, setCustom] = useState<string[]>([]);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");

  useEffect(() => { setCustom(loadCustom()); }, []);

  // Merge defaults + custom + current value (so a legacy value still shows).
  const all = Array.from(new Set([
    ...DEFAULTS,
    ...custom,
    ...(value ? [value] : []),
  ]));

  const commitAdd = () => {
    const v = draft.trim();
    if (!v) { setAdding(false); return; }
    if (!DEFAULTS.includes(v) && !custom.includes(v)) {
      const next = [...custom, v];
      setCustom(next);
      saveCustom(next);
    }
    onChange(v);
    setDraft("");
    setAdding(false);
  };

  return (
    <div className={className}>
      {adding ? (
        <div className="flex gap-2">
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); commitAdd(); }
              if (e.key === "Escape") { setDraft(""); setAdding(false); }
            }}
            placeholder="e.g. Ableton Rack, Battery, Reaktor…"
            className="ipt flex-1"
          />
          <button type="button" onClick={commitAdd} className="btn-primary !text-xs !py-2 !px-3">Add</button>
          <button type="button" onClick={() => { setDraft(""); setAdding(false); }} className="btn-ghost !text-xs !py-2 !px-2" aria-label="Cancel"><X size={13} /></button>
        </div>
      ) : (
        <div className="flex gap-2">
          <select
            value={value || ""}
            onChange={(e) => {
              if (e.target.value === "__add__") { setAdding(true); return; }
              onChange(e.target.value);
            }}
            className="ipt flex-1"
          >
            <option value="" className="bg-[#1F0540]">Select library type…</option>
            {all.map((t) => (
              <option key={t} value={t} className="bg-[#1F0540]">{t}</option>
            ))}
            <option value="__add__" className="bg-[#1F0540]">＋ Add new type…</option>
          </select>
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="btn-ghost !text-xs !py-2 !px-3 inline-flex items-center gap-1"
            title="Add custom library type"
          >
            <Plus size={13} /> New
          </button>
        </div>
      )}
    </div>
  );
}
