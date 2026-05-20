import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ShopPage } from "@/components/ShopPage";
import { GlassCard } from "@/components/GlassCard";
import { AuroraTitle } from "@/components/AuroraTitle";
import { ProductCard } from "@/components/ProductCard";
import { SALE, products } from "@/lib/mock-data";

const EVENTS: Record<string, { name: string; headline: string; sub: string; eyebrow: string; motif: string }> = {
  "summer-steals": {
    name: "Summer Tropical Steals",
    headline: "SUMMER STEALS. 35% OFF.",
    sub: "Pro plugins at tropical prices. Until the sun sets on Sept 22.",
    eyebrow: "SUMMER TROPICAL STEALS — ACTIVE",
    motif: "tropical",
  },
};

export const Route = createFileRoute("/sale/$slug")({
  beforeLoad: ({ params }) => { if (!EVENTS[params.slug]) throw notFound(); },
  head: ({ params }) => ({ meta: [{ title: `${EVENTS[params.slug]?.name} — Plugin Warehouse` }, { name: "description", content: EVENTS[params.slug]?.sub }] }),
  component: SaleEvent,
});

function SaleEvent() {
  const { slug } = Route.useParams();
  const e = EVENTS[slug];
  const [remaining, setRemaining] = useState(SALE.endsAt - Date.now());
  useEffect(() => {
    const i = setInterval(() => setRemaining(SALE.endsAt - Date.now()), 1000);
    return () => clearInterval(i);
  }, []);
  const d = Math.max(0, Math.floor(remaining / 86400000));
  const h = Math.max(0, Math.floor((remaining % 86400000) / 3600000));
  const m = Math.max(0, Math.floor((remaining % 3600000) / 60000));
  const s = Math.max(0, Math.floor((remaining % 60000) / 1000));
  const urgent = remaining < 86400000;

  const spotlight = products.filter((p) => p.isFeatured).slice(0, 4);

  return (
    <div>
      <section className="relative px-4 md:px-12 py-16 md:py-24 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 70% 80% at 30% 20%, #FF003C44, transparent 60%), radial-gradient(ellipse 60% 70% at 80% 80%, #2B28FF33, transparent 60%)" }} />
        <div className="relative grid lg:grid-cols-2 gap-12 items-center min-h-[70vh]">
          <div>
            <div className="font-mono text-xs tracking-[0.2em] text-[var(--accent-red-glow)] mb-6">{e.eyebrow}</div>
            <h1 className="font-black chrome-text leading-[0.92] mb-6" style={{ fontSize: "clamp(3rem, 7vw, 6rem)" }}>{e.headline}</h1>
            <p className="text-white/70 text-lg mb-6 max-w-xl">{e.sub}</p>
            <div className={`inline-block font-mono font-bold text-xl md:text-2xl mb-8 px-5 py-3 rounded-2xl border ${urgent ? "border-[var(--accent-red)] bg-[var(--accent-red)]/15 text-[var(--accent-red-glow)]" : "border-white/15 bg-white/5"}`}>
              ENDS IN: {d}D {String(h).padStart(2, "0")}H {String(m).padStart(2, "0")}M {String(s).padStart(2, "0")}S
            </div>
            <div className="flex gap-3 flex-wrap">
              <a href="#grid" className="btn-primary !text-base !py-4 !px-8">SHOP THE SALE →</a>
              <Link to="/shop" className="btn-ghost !text-base !py-4 !px-8">WHAT'S NEW</Link>
            </div>
          </div>
          <div className="relative h-[420px] hidden lg:block">
            {spotlight.slice(0, 3).map((p, i) => (
              <div key={p.slug} className="absolute w-60" style={{ top: `${i * 50}px`, left: `${i * 80}px`, transform: `rotate(${(i - 1) * 4}deg)`, zIndex: 3 - i }}>
                <div className="glass-card glass-card--heavy p-3 relative">
                  <div className="chromatic-edge" /><div className="glass-noise" />
                  <div className="aspect-square rounded-xl flex items-center justify-center" style={{ background: p.coverGradient }}>
                    <div className="text-center">
                      <div className="font-mono text-[10px] text-white/60">{p.maker.toUpperCase()}</div>
                      <div className="font-black text-2xl chrome-text">{p.name}</div>
                    </div>
                    <div className="absolute top-2 right-2 px-2 py-1 rounded-md font-mono text-[10px] font-bold bg-[var(--accent-red)] text-white">35% OFF</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 md:px-12 mb-12">
        <div className="font-mono text-xs tracking-[0.2em] text-[var(--accent-red-glow)] mb-3">TODAY'S SPOTLIGHT</div>
        <AuroraTitle>HAND-PICKED FOR THE STEALS.</AuroraTitle>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
          {spotlight.map((p) => <ProductCard key={p.slug} product={p} />)}
        </div>
      </section>

      <div id="grid"><ShopPage title="EVERYTHING ON SALE." subtitle="Pre-filtered. Best discounts up top." initialOnSale /></div>

      <section className="px-4 md:px-12 py-16 text-center">
        <h2 className="font-black chrome-text text-4xl md:text-5xl mb-3">STILL BROWSING?</h2>
        <p className="text-white/65 mb-6">Sale ends {SALE.endsLabel}. Don't sleep.</p>
        <Link to="/shop" className="btn-ghost !text-base !py-4 !px-8">EVERYTHING ELSE →</Link>
      </section>
    </div>
  );
}
