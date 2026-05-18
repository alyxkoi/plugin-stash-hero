import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { ProductCard } from "@/components/ProductCard";
import { GlassCard } from "@/components/GlassCard";
import { featuredProducts, newProducts, bestsellerProducts, categories, SALE, products } from "@/lib/mock-data";

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
      <Section title="LOADED & READY" eyebrow="// PICKED FOR YOU">
        <Grid>{featuredProducts.map((p) => <ProductCard key={p.slug} product={p} />)}</Grid>
      </Section>
      <Section title="PICK YOUR POISON" eyebrow="// SIX FLAVORS">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
          {categories.map((c) => <CategoryTile key={c.slug} {...c} />)}
        </div>
      </Section>
      <Section title="FRESH OFF THE TRUCK" eyebrow="// NEW DROPS">
        <Grid>{(newProducts.length >= 4 ? newProducts : products.slice(0, 4)).slice(0, 4).map((p) => <ProductCard key={p.slug} product={p} />)}</Grid>
      </Section>
      <Section title="MOST LOADED" eyebrow="// THIS WEEK'S WEIGHT">
        <Grid>{bestsellerProducts.slice(0, 4).map((p, i) => <ProductCard key={p.slug} product={p} variant="blue" rank={i + 1} />)}</Grid>
      </Section>
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
      {/* Tropical gradient sweep */}
      <div className="absolute inset-0 pointer-events-none opacity-50">
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 60% 80% at 20% 30%, #FF003C33, transparent 60%), radial-gradient(ellipse 50% 70% at 80% 20%, #2B28FF33, transparent 60%), radial-gradient(ellipse 80% 50% at 60% 90%, #FF1F5C22, transparent 60%)" }} />
      </div>
      {/* Palm silhouette */}
      <svg className="absolute bottom-0 right-0 w-[400px] h-[400px] pointer-events-none opacity-10" viewBox="0 0 200 200" fill="none">
        <path d="M100 200 L100 120 M100 120 Q60 80 30 70 M100 120 Q140 80 170 70 M100 120 Q70 60 50 30 M100 120 Q130 60 150 30" stroke="white" strokeWidth="1.5" />
      </svg>

      <div className="relative grid lg:grid-cols-2 gap-12 items-center min-h-[70vh]">
        <div>
          <div className="font-mono text-xs tracking-[0.2em] text-[var(--accent-red-glow)] mb-6">// SUMMER TROPICAL STEALS — ACTIVE</div>
          <h1 className="font-black leading-[0.92] tracking-tight mb-6" style={{ fontSize: "clamp(3rem, 8vw, 6.5rem)" }}>
            <span className="block chrome-text">35% OFF.</span>
            <span className="block chrome-text">EVERYTHING.</span>
            <span className="block chrome-text">UNTIL SEPT 22.</span>
          </h1>
          <p className="text-lg md:text-xl text-white/70 max-w-xl mb-8 leading-relaxed">
            Pro-tier plugins at a fraction of the price. Your DAW's been hungry. Load up before the steals end.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link to="/sale/$slug" params={{ slug: "summer-steals" }} className="btn-primary !text-base !py-4 !px-8">LOAD UP →</Link>
            <Link to="/shop" search={{ sort: "fresh" } as any} className="btn-ghost !text-base !py-4 !px-8">WHAT'S NEW</Link>
          </div>
        </div>

        {/* Cascading covers */}
        <div className="relative h-[420px] md:h-[520px] hidden lg:block">
          {[
            { p: products.find(p => p.slug === "serum")!, pos: "top-0 left-8", rot: "-6deg", ref: cover1, z: 1 },
            { p: products.find(p => p.slug === "ozone-12")!, pos: "top-20 left-1/3", rot: "4deg", ref: cover2, z: 3 },
            { p: products.find(p => p.slug === "omnisphere")!, pos: "top-8 right-0", rot: "-2deg", ref: cover3, z: 2 },
          ].map((c, i) => (
            <div key={i} ref={c.ref} className={`absolute ${c.pos} w-64`} style={{ zIndex: c.z, transform: `rotate(${c.rot})` }}>
              <div className="glass-card glass-card--heavy p-3 relative">
                <div className="chromatic-edge" /><div className="glass-noise" />
                <div className="absolute inset-0 glow-breathe pointer-events-none rounded-3xl" style={{ background: "radial-gradient(ellipse at center, rgba(255,0,60,0.6), transparent 70%)", filter: "blur(20px)", zIndex: -1 }} />
                <div className="relative z-10 aspect-square rounded-2xl overflow-hidden" style={{ background: c.p.coverGradient }}>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="font-mono text-[10px] text-white/70 mb-2">// {c.p.maker.toUpperCase()}</div>
                      <div className="font-black text-3xl chrome-text">{c.p.name}</div>
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
  const items = ["🌴 SUMMER STEALS ACTIVE", "35% OFF STORE-WIDE", `ENDS ${SALE.endsLabel.toUpperCase()}`, "YOUR DAW IS HUNGRY", "LOAD UP BEFORE THEY'RE GONE"];
  const repeated = [...items, ...items, ...items, ...items];
  return (
    <div className="relative overflow-hidden border-y border-white/10 marquee-pause">
      <div className="h-px" style={{ background: "linear-gradient(90deg, transparent, #FF1F5C, #2B28FF, #FF1F5C, transparent)" }} />
      <div className="py-3 overflow-hidden">
        <div className="marquee-track flex gap-12 whitespace-nowrap font-mono text-xs tracking-[0.15em] text-white/70">
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

function Section({ title, eyebrow, children }: { title: string; eyebrow?: string; children: React.ReactNode }) {
  return (
    <section className="px-4 md:px-12 py-16 md:py-24">
      {eyebrow && <div className="font-mono text-xs tracking-[0.2em] text-[var(--accent-red-glow)] mb-3">{eyebrow}</div>}
      <h2 className="section-header chrome-text">{title}</h2>
      {children}
    </section>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">{children}</div>;
}

function CategoryTile({ slug, name, description, count }: { slug: string; name: string; description: string; count: number }) {
  return (
    <Link to="/shop/$category" params={{ category: slug }} className="block">
      <GlassCard tilt className="p-6 md:p-8 h-full">
        <div className="w-12 h-12 rounded-xl border border-white/15 flex items-center justify-center mb-4">
          <CategoryIcon slug={slug} />
        </div>
        <h3 className="font-black text-2xl uppercase mb-1">{name}</h3>
        <p className="text-sm text-white/60 mb-4">{description}</p>
        <div className="font-mono text-xs text-white/40">{count} ITEMS →</div>
      </GlassCard>
    </Link>
  );
}

function CategoryIcon({ slug }: { slug: string }) {
  const props = { width: 24, height: 24, stroke: "currentColor", fill: "none", strokeWidth: 1.5, strokeLinecap: "round" as const };
  switch (slug) {
    case "instruments": return <svg {...props} viewBox="0 0 24 24"><rect x="3" y="6" width="18" height="12" rx="2" /><line x1="7" y1="6" x2="7" y2="18" /><line x1="11" y1="6" x2="11" y2="18" /><line x1="15" y1="6" x2="15" y2="18" /></svg>;
    case "effects": return <svg {...props} viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" /><path d="M12 4 V12 L18 14" /></svg>;
    case "libraries": return <svg {...props} viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16" /></svg>;
    case "daws": return <svg {...props} viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M7 9 L7 15 M11 8 L11 16 M15 10 L15 14 M19 9 L19 15" /></svg>;
    case "software": return <svg {...props} viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="14" rx="2" /><path d="M3 18 L21 18 M9 22 H15" /></svg>;
    case "freebies": return <svg {...props} viewBox="0 0 24 24"><path d="M12 21V8M12 8L5 12M12 8L19 12M5 12V19L12 21M19 12V19L12 21" /></svg>;
    default: return null;
  }
}

function Difference() {
  const items = [
    { t: "DELIVERED IN SECONDS.", d: "In your library before your DAW finishes booting." },
    { t: "YOURS FOREVER.", d: "Re-download whenever. Updates included. No license keys to babysit." },
    { t: "WORKS WITH WHATEVER YOU RUN.", d: "VST. VST3. AU. AAX. Whatever your DAW speaks, we speak." },
  ];
  return (
    <section className="px-4 md:px-12 py-16 md:py-24">
      <div className="font-mono text-xs tracking-[0.2em] text-[var(--accent-red-glow)] mb-3">// WHY US</div>
      <h2 className="section-header chrome-text">THE DIFFERENCE</h2>
      <div className="grid md:grid-cols-3 gap-8">
        {items.map((i) => (
          <GlassCard key={i.t} className="p-8">
            <h3 className="font-black text-2xl mb-3 leading-tight">{i.t}</h3>
            <p className="text-white/65 leading-relaxed">{i.d}</p>
          </GlassCard>
        ))}
      </div>
    </section>
  );
}

function Newsletter() {
  return (
    <section className="px-4 md:px-12 py-16 md:py-24">
      <div className="max-w-2xl mx-auto">
        <GlassCard variant="heavy" className="p-10 md:p-14 text-center">
          <div className="font-mono text-xs tracking-[0.2em] text-[var(--accent-red-glow)] mb-3">// JOIN THE LIST</div>
          <h2 className="font-black text-4xl md:text-5xl mb-4 chrome-text">GET DROPS BEFORE THEY HIT.</h2>
          <p className="text-white/65 mb-8">First in line on every drop. No spam, just heat.</p>
          <form className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto" onSubmit={(e) => e.preventDefault()}>
            <input type="email" placeholder="you@email.com" className="input-glass flex-1" required />
            <button type="submit" className="btn-primary">SUBSCRIBE →</button>
          </form>
        </GlassCard>
      </div>
    </section>
  );
}
