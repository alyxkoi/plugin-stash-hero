import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ShopPage } from "@/components/ShopPage";
import { products } from "@/lib/mock-data";
import { supabase } from "@/integrations/supabase/client";

type SaleRow = {
  id: string;
  name: string;
  slug: string;
  headline: string | null;
  subheadline: string | null;
  discount_pct: number;
  theme_color: string | null;
  start_at: string;
  end_at: string;
  status: string;
};

const LEGACY: Record<string, SaleRow> = {
  "summer-steals": {
    id: "legacy-summer",
    name: "Summer Tropical Steals",
    slug: "summer-steals",
    headline: "SUMMER STEALS. 35% OFF.",
    subheadline: "Pro plugins at tropical prices. Until the sun sets on Sept 22.",
    discount_pct: 35,
    theme_color: "#ff003c",
    start_at: new Date(0).toISOString(),
    end_at: new Date(Date.now() + 30 * 86400_000).toISOString(),
    status: "active",
  },
};

export const Route = createFileRoute("/sale/$slug")({
  loader: async ({ params }) => {
    const { data } = await supabase
      .from("sale_events")
      .select("id, name, slug, headline, subheadline, discount_pct, theme_color, start_at, end_at, status")
      .eq("slug", params.slug)
      .maybeSingle();
    const sale = (data as SaleRow) ?? LEGACY[params.slug] ?? null;
    if (!sale) throw notFound();
    return { sale };
  },
  head: ({ loaderData }) => {
    if (!loaderData) return { meta: [{ title: "Sale — Plugin Warehouse" }] };
    const s = loaderData.sale;
    return {
      meta: [
        { title: `${s.name} — Plugin Warehouse` },
        { name: "description", content: s.subheadline ?? `${s.discount_pct}% off. Limited time.` },
      ],
    };
  },
  component: SaleEvent,
});

function SaleEvent() {
  const { sale } = Route.useLoaderData();
  const endsAt = new Date(sale.end_at).getTime();
  const [remaining, setRemaining] = useState(endsAt - Date.now());
  useEffect(() => {
    const i = setInterval(() => setRemaining(endsAt - Date.now()), 1000);
    return () => clearInterval(i);
  }, [endsAt]);

  const expired = remaining <= 0;
  const d = Math.max(0, Math.floor(remaining / 86400000));
  const h = Math.max(0, Math.floor((remaining % 86400000) / 3600000));
  const m = Math.max(0, Math.floor((remaining % 3600000) / 60000));
  const s = Math.max(0, Math.floor((remaining % 60000) / 1000));
  const urgent = remaining < 86400000;
  const accent = "#FF2D6E";
  const pct = sale.discount_pct ?? 35;
  const headline = `GAME ON. ${pct}% OFF EVERYTHING.`;
  const sub = "Pro plugins at knockout prices. Every team. Every sound. Until the final whistle.";
  const eyebrow = `WORLD CUP SALE — ${expired ? "ENDED" : "ACTIVE"}`;

  const spotlight = products.filter((p) => p.isFeatured).slice(0, 4);

  return (
    <div>
      <section className="relative px-4 md:px-12 py-16 md:py-24 overflow-hidden" style={{ background: "#13002C" }}>
        {/* Stadium floodlight glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse 60% 70% at 20% 10%, ${accent}55, transparent 60%), radial-gradient(ellipse 50% 60% at 90% 90%, #2B28FF44, transparent 65%), radial-gradient(ellipse 80% 40% at 50% 0%, #ffffff18, transparent 70%)`,
          }}
        />
        {/* Faint pitch lines */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-[0.09]" preserveAspectRatio="none" viewBox="0 0 100 100">
          <line x1="50" y1="0" x2="50" y2="100" stroke="white" strokeWidth="0.15" />
          <circle cx="50" cy="50" r="12" stroke="white" strokeWidth="0.15" fill="none" />
          <rect x="0" y="30" width="18" height="40" stroke="white" strokeWidth="0.15" fill="none" />
          <rect x="82" y="30" width="18" height="40" stroke="white" strokeWidth="0.15" fill="none" />
        </svg>
        {/* Diagonal speed streaks */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="absolute h-[2px] opacity-40"
              style={{
                top: `${10 + i * 15}%`,
                left: "-10%",
                width: "120%",
                background: `linear-gradient(90deg, transparent, ${i % 2 === 0 ? accent : "#2B28FF"}${i % 2 === 0 ? "aa" : "66"}, transparent)`,
                transform: `rotate(-8deg)`,
                filter: "blur(1px)",
              }}
            />
          ))}
        </div>
        {/* Flag color accent bar */}
        <div className="absolute top-0 left-0 right-0 h-[3px] pointer-events-none" style={{ background: `linear-gradient(90deg, ${accent}, #FFD84A, #00C46A, #2B28FF, ${accent})`, opacity: 0.75 }} />
        {/* Equalizer bars — bottom right, sound + energy nod */}
        <div className="absolute bottom-6 right-6 hidden md:flex items-end gap-1 pointer-events-none opacity-70">
          {[14, 28, 42, 22, 36, 50, 30, 18, 44, 26, 38, 20].map((barH, i) => (
            <div
              key={i}
              className="w-[3px] rounded-full animate-pulse"
              style={{
                height: `${barH}px`,
                background: `linear-gradient(180deg, ${accent}, #2B28FF)`,
                animationDelay: `${i * 0.12}s`,
                animationDuration: `${1 + (i % 3) * 0.3}s`,
                boxShadow: `0 0 6px ${accent}88`,
              }}
            />
          ))}
        </div>

        <div className="relative grid lg:grid-cols-2 gap-12 items-center min-h-[70vh]">
          <div>
            <div className="font-mono text-xs tracking-[0.2em] mb-6 flex items-center gap-2" style={{ color: accent }}>
              <span className="inline-block w-2 h-2 rounded-full animate-pulse" style={{ background: accent, boxShadow: `0 0 10px ${accent}` }} />
              {eyebrow}
            </div>
            <h1 className="font-black chrome-text leading-[0.92] mb-6" style={{ fontSize: "clamp(3rem, 7vw, 6rem)", textShadow: `0 0 40px ${accent}55` }}>{headline}</h1>
            <p className="text-white/70 text-lg mb-6 max-w-xl">{sub}</p>
            {expired ? (
              <div className="inline-block font-mono font-bold text-xl mb-8 px-5 py-3 rounded-2xl border border-white/15 bg-white/5 text-white/60">
                THIS SALE HAS ENDED
              </div>
            ) : (
              <div
                className={`inline-block font-mono font-bold text-xl md:text-2xl mb-8 px-5 py-3 rounded-2xl border ${urgent ? "" : "border-white/15 bg-white/5"}`}
                style={urgent ? { borderColor: accent, background: `${accent}26`, color: accent } : undefined}
              >
                FINAL WHISTLE IN: {d}D {String(h).padStart(2, "0")}H {String(m).padStart(2, "0")}M {String(s).padStart(2, "0")}S
              </div>
            )}
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
                    <div className="absolute top-2 right-2 px-2 py-1 rounded-md font-mono text-[10px] font-bold text-white" style={{ background: accent, boxShadow: `0 0 12px ${accent}` }}>
                      {pct}% OFF
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>


      <div id="grid"><ShopPage title="EVERYTHING ON SALE." subtitle="Pre-filtered. Best discounts up top." initialOnSale /></div>

      <section className="px-4 md:px-12 py-16 text-center">
        <h2 className="font-black chrome-text text-4xl md:text-5xl mb-3">STILL BROWSING?</h2>
        <p className="text-white/65 mb-6">Sale ends {new Date(sale.end_at).toLocaleDateString()}. Don't sleep.</p>
        <Link to="/shop" className="btn-ghost !text-base !py-4 !px-8">EVERYTHING ELSE →</Link>
      </section>
    </div>
  );
}
