import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { ProductCard } from "@/components/ProductCard";
import { GlassCard } from "@/components/GlassCard";
import { SectionTitle, FadeIn } from "@/components/SectionTitle";
import { featuredProducts, newProducts, categories, SALE, products } from "@/lib/mock-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Plugin Warehouse — Pro plugins at a fraction of the price" },
      { name: "description", content: "Synths, effects, libraries, DAWs, and creative software at a fraction of the price. Yours forever." },
      { property: "og:title", content: "Plugin Warehouse" },
      { property: "og:description", content: "Pro-tier plugins at a fraction of the price." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div>
      <Hero />
      <Ticker />
      <Section title="LOADED & READY">
        <Grid>{featuredProducts.map((p) => <ProductCard key={p.slug} product={p} />)}</Grid>
      </Section>
      <TuneIn />
      <Section title="FRESH OFF THE TRUCK">
        <Grid>{(newProducts.length >= 4 ? newProducts : products.slice(0, 4)).slice(0, 4).map((p) => <ProductCard key={p.slug} product={p} />)}</Grid>
      </Section>
      <PluginOfTheWeek />
      <Difference />
      <Newsletter />
    </div>
  );
}

function Hero() {
  const cover1 = useRef<HTMLDivElement>(null);
  const cover2 = useRef<HTMLDivElement>(null);
  const cover3 = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const on = () => {
      const y = window.scrollY;
      if (cover1.current) cover1.current.style.transform = `translateY(${y * 0.08}px) rotate(-6deg)`;
      if (cover2.current) cover2.current.style.transform = `translateY(${y * 0.12}px) rotate(4deg) translateX(${y * 0.02}px)`;
      if (cover3.current) cover3.current.style.transform = `translateY(${y * 0.06}px) rotate(-2deg)`;
    };
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  return (
    <section className="relative px-4 md:px-6 pt-4 pb-12 md:pb-24 overflow-hidden">
      <div className="absolute inset-0 pointer-events-none opacity-50">
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 60% 80% at 20% 30%, #FF003C33, transparent 60%), radial-gradient(ellipse 50% 70% at 80% 20%, #2B28FF33, transparent 60%), radial-gradient(ellipse 80% 50% at 60% 90%, #FF1F5C22, transparent 60%)" }} />
      </div>

      <div className="relative grid lg:grid-cols-2 gap-12 items-center min-h-[70vh]">
        <div>
          <div className="label-mini mb-6"><span className="text-red">Summer Tropical Steals</span> — active</div>
          <h1 className="font-display leading-[0.92] tracking-tight mb-6" style={{ fontSize: "clamp(3rem, 8vw, 6.5rem)" }}>
            <span className="block text-red">35% OFF.</span>
            <span className="block">EVERYTHING.</span>
            <span className="block">UNTIL <span className="text-red">SEPT 22.</span></span>
          </h1>
          <p className="text-lg md:text-xl text-white/75 max-w-xl mb-8 leading-relaxed">
            Pro-tier plugins at a <span className="text-red">fraction of the price</span>. Your DAW's been hungry. Load up before the steals end.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link to="/sale/$slug" params={{ slug: "summer-steals" }} className="btn-primary !text-base !py-4 !px-8">LOAD UP →</Link>
            <Link to="/shop" search={{ sort: "fresh" } as any} className="btn-ghost !text-base !py-4 !px-8">WHAT'S NEW</Link>
          </div>
        </div>

        <div className="relative h-[420px] md:h-[520px] hidden lg:block">
          {[
            { p: products.find(p => p.slug === "serum")!, pos: "top-0 left-8", rot: "-6deg", ref: cover1, z: 1 },
            { p: products.find(p => p.slug === "ozone-12")!, pos: "top-20 left-1/3", rot: "4deg", ref: cover2, z: 3 },
            { p: products.find(p => p.slug === "omnisphere")!, pos: "top-8 right-0", rot: "-2deg", ref: cover3, z: 2 },
          ].map((c, i) => (
            <div key={i} ref={c.ref} className={`absolute ${c.pos} w-64`} style={{ zIndex: c.z, transform: `rotate(${c.rot})` }}>
              <div className="glass-card glass-card--heavy p-3 relative">
                <div className="chromatic-edge" />
                <div className="absolute inset-0 glow-breathe pointer-events-none rounded-3xl" style={{ background: "radial-gradient(ellipse at center, rgba(255,0,60,0.6), transparent 70%)", filter: "blur(20px)", zIndex: -1 }} />
                <div className="relative z-10 aspect-square rounded-2xl overflow-hidden" style={{ background: c.p.coverGradient }}>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="label-mini mb-2">{c.p.maker}</div>
                      <div className="font-display text-3xl">{c.p.name}</div>
                    </div>
                  </div>
                  <div className="absolute top-2 right-2 px-2 py-1 rounded-md font-mono text-[10px] font-bold bg-[var(--accent-red)] text-white">35% OFF</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Ticker() {
  const items = [
    <>🌴 <span className="text-red">Summer Steals</span> active</>,
    <><span className="text-red">35% OFF</span> store-wide</>,
    <>Ends <span className="text-red">{SALE.endsLabel}</span></>,
    <>Your DAW is hungry</>,
    <>Load up before they're gone</>,
  ];
  const repeated = [...items, ...items, ...items, ...items];
  return (
    <div className="relative overflow-hidden border-y border-white/10 marquee-pause">
      <div className="h-px" style={{ background: "linear-gradient(90deg, transparent, #FF1F5C, #2B28FF, #FF1F5C, transparent)" }} />
      <div className="py-3 overflow-hidden">
        <div className="marquee-track flex gap-12 whitespace-nowrap font-display text-sm tracking-[0.12em] text-white/80 uppercase">
          {repeated.map((item, i) => (
            <span key={i} className="flex items-center gap-12 shrink-0">
              {item}
              <span className="w-1 h-1 rounded-full bg-[var(--accent-red-glow)]" />
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="px-4 md:px-12 py-16 md:py-24">
      <SectionTitle>{title}</SectionTitle>
      <FadeIn>{children}</FadeIn>
    </section>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">{children}</div>;
}

/* ===== TUNE IN — full-width flat category bars ===== */
const TUNE_IN_BARS: { slug: string; name: string; count: number; bg: string }[] = [
  { slug: "instruments", name: "INSTRUMENTS", count: categories.find(c=>c.slug==="instruments")?.count ?? 0, bg: "radial-gradient(ellipse at 30% 50%, #FF003C 0%, #1F0540 45%, #0a0018 100%), linear-gradient(120deg, #2b0050, #13002C)" },
  { slug: "effects", name: "EFFECTS", count: categories.find(c=>c.slug==="effects")?.count ?? 0, bg: "radial-gradient(ellipse at 70% 50%, #0E0BD1 0%, #1F0540 45%, #0a0018 100%)" },
  { slug: "libraries", name: "LIBRARIES", count: categories.find(c=>c.slug==="libraries")?.count ?? 0, bg: "linear-gradient(90deg, #13002C 0%, #FF1F5C 50%, #13002C 100%)" },
  { slug: "daws", name: "DAWS", count: categories.find(c=>c.slug==="daws")?.count ?? 0, bg: "radial-gradient(ellipse at 50% 30%, #2B28FF 0%, #0E0BD1 35%, #0a0018 100%)" },
  { slug: "software", name: "SOFTWARE", count: categories.find(c=>c.slug==="software")?.count ?? 0, bg: "linear-gradient(120deg, #FF003C 0%, #FF1F5C 30%, #1F0540 70%, #0a0018 100%)" },
  { slug: "freebies", name: "FREEBIES", count: categories.find(c=>c.slug==="freebies")?.count ?? 0, bg: "linear-gradient(60deg, #0E0BD1 0%, #2B28FF 35%, #FF003C 100%)" },
];

function TuneIn() {
  return (
    <section className="py-16 md:py-24">
      <SectionTitle>TUNE IN</SectionTitle>
      <FadeIn>
        <div className="flex flex-col">
          {TUNE_IN_BARS.map((b) => <TuneInBar key={b.slug} {...b} />)}
        </div>
      </FadeIn>
    </section>
  );
}

function TuneInBar({ slug, name, count, bg }: { slug: string; name: string; count: number; bg: string }) {
  const ref = useRef<HTMLAnchorElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current; const bgEl = bgRef.current;
    if (!el || !bgEl) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const on = () => {
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const pct = Math.max(-1, Math.min(1, (rect.top + rect.height / 2 - vh / 2) / vh));
      bgEl.style.transform = `scale(1.15) translateY(${pct * 18}px)`;
    };
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  return (
    <Link
      ref={ref}
      to="/shop/$category"
      params={{ category: slug }}
      className="group relative block overflow-hidden border-t border-white/8 last:border-b"
      aria-label={name}
    >
      <div
        ref={bgRef}
        className="absolute inset-0 transition-transform duration-500 group-hover:scale-125"
        style={{ background: bg, transform: "scale(1.15)" }}
      />
      <div className="absolute inset-0 bg-gradient-to-r from-black/65 via-black/40 to-black/65" />
      <div className="relative z-10 flex items-center justify-between gap-6 px-6 md:px-16 py-10 md:py-14 transition-transform duration-300 group-hover:translate-x-1">
        <h3 className="font-display text-[clamp(2.5rem,6vw,5rem)] leading-none tracking-tight uppercase">
          {name}
        </h3>
        <div className="flex items-center gap-4 md:gap-8 shrink-0">
          <span className="label-mini hidden sm:inline">{count} ITEMS</span>
          <span className="text-3xl md:text-5xl text-white/85 group-hover:text-red transition-colors">→</span>
        </div>
      </div>
    </Link>
  );
}

/* ===== PLUGIN OF THE WEEK ===== */
function PluginOfTheWeek() {
  const featured = products.find(p => p.slug === "omnisphere") || products[0];
  return (
    <section className="px-4 md:px-12 py-16 md:py-24">
      <SectionTitle>PLUGIN OF THE WEEK</SectionTitle>
      <FadeIn>
        <div className="max-w-2xl mx-auto relative">
          <div className="spin-glow" />
          <div className="glass-card glass-card--heavy p-6 md:p-10 relative">
            <div className="chromatic-edge" />
            <div className="relative z-10 flex flex-col items-center text-center gap-6">
              <div className="w-full max-w-md aspect-square rounded-3xl overflow-hidden relative" style={{ background: featured.coverGradient }}>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="label-mini mb-2">{featured.maker}</div>
                    <div className="font-display text-5xl md:text-6xl">{featured.name}</div>
                  </div>
                </div>
                <div className="absolute inset-0 glow-breathe pointer-events-none" style={{ background: "radial-gradient(ellipse at center, rgba(255,0,60,0.45), transparent 65%)" }} />
              </div>
              <div>
                <div className="label-mini">{featured.maker}</div>
                <h3 className="font-display text-5xl md:text-6xl mt-1">{featured.name}</h3>
                <p className="text-white/75 mt-3 max-w-md">{featured.tagline || "Hand-picked, this week only."}</p>
              </div>
              <div className="flex items-center gap-4">
                {featured.compareAtPrice && featured.compareAtPrice > featured.price && (
                  <span className="font-mono text-white/40 line-through text-lg">${featured.compareAtPrice}</span>
                )}
                <span className="font-mono text-3xl font-bold text-red">${featured.price}</span>
              </div>
              <Link to="/shop/p/$slug" params={{ slug: featured.slug }} className="btn-primary !text-base !py-4 !px-8">LOAD UP →</Link>
            </div>
          </div>
        </div>
      </FadeIn>
    </section>
  );
}

function Difference() {
  const items = [
    { t: "DELIVERED IN SECONDS.", d: "In your library before your DAW finishes booting." },
    { t: "YOURS FOREVER.", d: "Re-download whenever. Updates included. No license keys to babysit." },
    { t: "WORKS WITH WHATEVER YOU RUN.", d: "VST. VST3. AU. AAX. Whatever your DAW speaks, we speak." },
  ];
  return (
    <section className="px-4 md:px-12 py-16 md:py-24">
      <SectionTitle>THE DIFFERENCE</SectionTitle>
      <FadeIn>
        <div className="grid md:grid-cols-3 gap-8">
          {items.map((i) => (
            <GlassCard key={i.t} className="p-8">
              <h3 className="font-display text-2xl mb-3 leading-tight">{i.t}</h3>
              <p className="text-white/70 leading-relaxed">{i.d}</p>
            </GlassCard>
          ))}
        </div>
      </FadeIn>
    </section>
  );
}

function Newsletter() {
  return (
    <section className="px-4 md:px-12 py-16 md:py-24">
      <div className="max-w-2xl mx-auto">
        <GlassCard variant="heavy" className="p-10 md:p-14 text-center">
          <h2 className="font-display text-4xl md:text-5xl mb-4">GET DROPS BEFORE THEY HIT.</h2>
          <p className="text-white/70 mb-8">First in line on every drop. No spam, just heat.</p>
          <form className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto" onSubmit={(e) => e.preventDefault()}>
            <input type="email" placeholder="you@email.com" className="input-glass flex-1" required />
            <button type="submit" className="btn-primary">SUBSCRIBE →</button>
          </form>
        </GlassCard>
      </div>
    </section>
  );
}
