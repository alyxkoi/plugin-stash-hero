import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ShopPage } from "@/components/ShopPage";
import { AuroraTitle } from "@/components/AuroraTitle";
import { ProductCard } from "@/components/ProductCard";
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
  const color = sale.theme_color || "#ff003c";
  const headline = sale.headline || `${sale.discount_pct}% OFF. ${sale.name.toUpperCase()}.`;
  const sub = sale.subheadline || "Limited time. Shop the sale.";
  const eyebrow = `${sale.name.toUpperCase()} — ${expired ? "ENDED" : "ACTIVE"}`;

  const spotlight = products.filter((p) => p.isFeatured).slice(0, 4);

  return (
    <div>
      <section className="relative px-4 md:px-12 py-16 md:py-24 overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: `radial-gradient(ellipse 70% 80% at 30% 20%, ${color}44, transparent 60%), radial-gradient(ellipse 60% 70% at 80% 80%, #2B28FF33, transparent 60%)` }}
        />
        <div className="relative grid lg:grid-cols-2 gap-12 items-center min-h-[70vh]">
          <div>
            <div className="font-mono text-xs tracking-[0.2em] mb-6" style={{ color }}>{eyebrow}</div>
            <h1 className="font-black chrome-text leading-[0.92] mb-6" style={{ fontSize: "clamp(3rem, 7vw, 6rem)" }}>{headline}</h1>
            <p className="text-white/70 text-lg mb-6 max-w-xl">{sub}</p>
            {expired ? (
              <div className="inline-block font-mono font-bold text-xl mb-8 px-5 py-3 rounded-2xl border border-white/15 bg-white/5 text-white/60">
                THIS SALE HAS ENDED
              </div>
            ) : (
              <div
                className={`inline-block font-mono font-bold text-xl md:text-2xl mb-8 px-5 py-3 rounded-2xl border ${urgent ? "" : "border-white/15 bg-white/5"}`}
                style={urgent ? { borderColor: color, background: `${color}26`, color } : undefined}
              >
                ENDS IN: {d}D {String(h).padStart(2, "0")}H {String(m).padStart(2, "0")}M {String(s).padStart(2, "0")}S
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
                    <div className="absolute top-2 right-2 px-2 py-1 rounded-md font-mono text-[10px] font-bold text-white" style={{ background: color }}>
                      {sale.discount_pct}% OFF
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 md:px-12 mb-12">
        <div className="font-mono text-xs tracking-[0.2em] mb-3" style={{ color }}>TODAY'S SPOTLIGHT</div>
        <AuroraTitle>HAND-PICKED FOR THE STEALS.</AuroraTitle>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
          {spotlight.map((p) => <ProductCard key={p.slug} product={p} />)}
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
