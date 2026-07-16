import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { GlassCard } from "@/components/GlassCard";

type FaqItem = { q: string; a: string };
type FaqGroup = { cat: string; items: FaqItem[] };

const FAQS: FaqGroup[] = [
  {
    cat: "GETTING STARTED",
    items: [
      { q: "How do downloads work?", a: "After checkout, your plugins appear in your library instantly. Re-download whenever you need to — links stay tied to your account." },
      { q: "Do I need an account?", a: "Yes — your account holds your library and lets you re-download forever. Guest checkout still works, and we email download links so nothing gets lost." },
    ],
  },
  {
    cat: "PLUGINS & COMPATIBILITY",
    items: [
      { q: "Which DAWs are supported?", a: "Ableton, FL Studio, Logic, Pro Tools, Studio One, Cubase, Reaper — and anything else that runs VST, VST3, AU, or AAX." },
      { q: "Mac or PC?", a: "Both. Apple Silicon native where the vendor supports it, Intel Mac and Windows builds included on every product page." },
    ],
  },
  {
    cat: "INSTALLATION",
    items: [
      { q: "Why won't the plugin show up in my DAW?", a: "Rescan your plugin folder in your DAW, then restart it. Nine times out of ten that's it. If it still doesn't show, hit us up with your DAW and OS and we'll walk you through it." },
    ],
  },
  {
    cat: "REFUNDS & SUPPORT",
    items: [
      { q: "Can I get a refund?", a: "Read the return policy first. Because plugins are instant digital downloads, we troubleshoot install and compatibility issues before refunding — most problems get solved fast." },
    ],
  },
];

export const Route = createFileRoute("/faq")({
  head: () => {
    const title = "FAQ — Plugin Warehouse";
    const desc = "Answers to common questions about Plugin Warehouse downloads, DAW compatibility, installation on Mac and PC, refunds and support.";
    const url = "https://www.thepluginwarehouse.com/faq";
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:url", content: url },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  component: FaqPage,
});

function FaqPage() {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return FAQS;
    return FAQS
      .map((g) => ({
        ...g,
        items: g.items.filter((i) => i.q.toLowerCase().includes(q) || i.a.toLowerCase().includes(q)),
      }))
      .filter((g) => g.items.length > 0);
  }, [query]);

  const totalMatches = filtered.reduce((n, g) => n + g.items.length, 0);

  return (
    <div className="px-4 sm:px-6 md:px-12 py-12 md:py-16 max-w-3xl mx-auto">
      <div className="font-mono text-[11px] sm:text-xs tracking-[0.24em] text-[var(--accent-red-glow)] mb-3">
        EVERYTHING YOU MIGHT BE WONDERING
      </div>
      <h1
        className="font-black chrome-text leading-[0.9] mb-4"
        style={{ fontSize: "clamp(3rem, 10vw, 6rem)", fontFamily: "'Anton', 'Outfit', sans-serif", letterSpacing: "-0.01em" }}
      >
        FAQ.
      </h1>
      <p className="text-base sm:text-lg text-white/65 mb-8 max-w-xl">
        Quick answers. If yours isn't here, hit us up — we usually get back within a few hours.
      </p>

      <label className="relative block mb-10">
        <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" strokeWidth={2} />
        <input
          className="input-glass !pl-11"
          placeholder="Search the FAQ..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search the FAQ"
        />
      </label>

      {query && (
        <div className="font-mono text-xs tracking-[0.18em] text-white/50 mb-6">
          {totalMatches === 0
            ? "NO MATCHES — TRY ANOTHER WORD"
            : `${totalMatches} MATCH${totalMatches === 1 ? "" : "ES"}`}
        </div>
      )}

      <div className="space-y-12">
        {filtered.map((g) => (
          <section key={g.cat}>
            <div className="flex items-center gap-3 mb-5">
              <span className="h-px flex-1 bg-gradient-to-r from-[var(--accent-red)]/60 to-transparent" />
              <h2 className="font-mono text-[11px] sm:text-xs tracking-[0.28em] text-white font-bold shrink-0">
                {g.cat}
              </h2>
              <span className="h-px flex-1 bg-gradient-to-l from-white/10 to-transparent" />
            </div>

            <div className="space-y-4">
              {g.items.map((i) => (
                <GlassCard key={i.q} variant="subtle" className="p-5 sm:p-7">
                  <h3
                    className="text-lg sm:text-xl font-black leading-snug mb-2 sm:mb-3 text-white"
                    style={{ letterSpacing: "-0.005em" }}
                  >
                    <span className="text-[var(--accent-red-glow)] mr-2 font-mono text-sm align-middle">→</span>
                    {i.q}
                  </h3>
                  <p className="text-white/70 text-[15px] sm:text-base leading-relaxed">
                    {i.a}
                  </p>
                </GlassCard>
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="mt-16 sm:mt-20 text-center border-t border-white/10 pt-12">
        <div className="font-mono text-[11px] tracking-[0.24em] text-white/40 mb-3">STILL STUCK?</div>
        <h3 className="font-black text-2xl sm:text-3xl mb-5 chrome-text">DIDN'T FIND IT?</h3>
        <p className="text-white/60 mb-6 max-w-md mx-auto text-sm sm:text-base">
          Send us the details and we'll get back to you within a few hours.
        </p>
        <Link to="/contact-us" className="btn-primary inline-block">
          HIT US UP →
        </Link>
      </div>
    </div>
  );
}
