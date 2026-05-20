import { createFileRoute } from "@tanstack/react-router";
import { StaticPage } from "@/components/StaticPage";
import { GlassCard } from "@/components/GlassCard";
import { useState } from "react";

const FAQS = [
  { cat: "GETTING STARTED", items: [
    { q: "How do downloads work?", a: "After checkout, your plugins appear in your library instantly. Re-download whenever." },
    { q: "Do I need an account?", a: "Yes — your account holds your library and lets you re-download forever." },
  ]},
  { cat: "PLUGINS & COMPATIBILITY", items: [
    { q: "Which DAWs are supported?", a: "Ableton, FL Studio, Logic, Pro Tools, Studio One, Cubase, Reaper, and anything that runs VST/VST3/AU/AAX." },
    { q: "Mac or PC?", a: "Both. Apple Silicon native where the vendor supports it." },
  ]},
  { cat: "INSTALLATION", items: [
    { q: "Why won't the plugin show up?", a: "Rescan your plugin folder in your DAW. If it still doesn't show, hit us up." },
  ]},
  { cat: "REFUNDS & SUPPORT", items: [
    { q: "Can I get a refund?", a: "Read the return policy. We troubleshoot install issues before refunding." },
  ]},
];

export const Route = createFileRoute("/faq")({
  head: () => ({ meta: [{ title: "FAQ — Plugin Warehouse" }] }),
  component: () => {
    const [query, setQuery] = useState("");
    return (
      <div className="px-4 md:px-12 py-12 max-w-3xl mx-auto">
        <div className="font-mono text-xs tracking-[0.2em] text-[var(--accent-red-glow)] mb-3">EVERYTHING YOU MIGHT BE WONDERING</div>
        <h1 className="font-black chrome-text leading-[0.95] mb-3" style={{ fontSize: "clamp(2.5rem, 6vw, 5rem)" }}>FAQ.</h1>
        <p className="text-lg text-white/65 mb-8">Quick answers. If yours isn't here, hit us up.</p>

        <input className="input-glass mb-8" placeholder="Search the FAQ" value={query} onChange={(e) => setQuery(e.target.value)} />

        {FAQS.map((g) => (
          <div key={g.cat} className="mb-8">
            <h2 className="font-mono text-xs tracking-[0.2em] text-white/40 mb-3">{g.cat}</h2>
            <div className="space-y-2">
              {g.items.filter((i) => !query || i.q.toLowerCase().includes(query.toLowerCase())).map((i) => (
                <details key={i.q} className="group">
                  <GlassCard variant="subtle" className="p-5">
                    <summary className="font-bold cursor-pointer list-none flex justify-between items-center">{i.q} <span className="text-white/40 group-open:rotate-45 transition">+</span></summary>
                    <p className="mt-3 text-white/70">{i.a}</p>
                  </GlassCard>
                </details>
              ))}
            </div>
          </div>
        ))}

        <div className="mt-12 text-center">
          <h3 className="font-black text-2xl mb-3">DIDN'T FIND IT?</h3>
          <a href="/contact-us" className="btn-primary">HIT US UP →</a>
        </div>
      </div>
    );
  },
});
