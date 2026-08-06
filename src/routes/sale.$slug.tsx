import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ShopPage } from "@/components/ShopPage";
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

// Slug aliases: URLs already sent to subscribers must keep working permanently.
// Each alias resolves to the current target slug in the DB.
const SLUG_ALIASES: Record<string, string> = {
  "summer-steals": "world-cup-sale",
};

export const Route = createFileRoute("/sale/$slug")({
  loader: async ({ params }) => {
    const targetSlug = SLUG_ALIASES[params.slug] ?? params.slug;
    const { data } = await supabase
      .from("sale_events")
      .select("id, name, slug, headline, subheadline, discount_pct, theme_color, start_at, end_at, status")
      .eq("slug", targetSlug)
      .maybeSingle();
    // Fallback: if the aliased target is missing, keep the old URL alive by
    // showing the most-recent non-draft sale rather than 404-ing subscribers.
    let sale = data as SaleRow | null;
    if (!sale && SLUG_ALIASES[params.slug]) {
      const { data: fallback } = await supabase
        .from("sale_events")
        .select("id, name, slug, headline, subheadline, discount_pct, theme_color, start_at, end_at, status")
        .neq("status", "draft")
        .order("start_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      sale = (fallback as SaleRow) ?? null;
    }
    if (!sale) throw notFound();
    return { sale };
  },

  head: ({ params, loaderData }) => {
    const TITLE = "Plugin Deals | Up to 90% Off Pro VST Plugins | Plugin Warehouse";
    const DESC = "The best plugin deals online. Pro synths, effects, and bundles at knockout prices. Stack extra savings on already discounted plugins. Limited time.";
    const url = `https://www.thepluginwarehouse.com/sale/${params.slug}`;
    const title = loaderData?.sale ? `${loaderData.sale.name} | Plugin Warehouse` : TITLE;
    const desc = loaderData?.sale?.subheadline || DESC;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:url", content: url },
        { property: "og:type", content: "website" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: desc },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  component: SaleEvent,
});


function SaleEvent() {
  const { sale } = Route.useLoaderData();

  const accent = "#FF2D6E";
  const pct = sale.discount_pct ?? 35;
  const headline = `SUMMER'S HERE. ${pct}% OFF EVERYTHING.`;
  const sub = "Pro plugins at summer prices. Every sound you need, while the sun's still out.";

  const scrollToGrid = (e: React.MouseEvent) => {
    e.preventDefault();
    document.getElementById("grid")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

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

        <div className="relative flex flex-col items-center justify-center text-center min-h-[70vh] gap-8 md:gap-10">
          <h1 className="font-black chrome-text leading-[0.95] max-w-4xl mx-auto text-balance" style={{ fontSize: "clamp(2.25rem, 6.5vw, 6rem)", textShadow: "0 0 40px rgba(255,255,255,0.35)" }}>{headline}</h1>
          <p className="text-white/70 text-base md:text-lg max-w-2xl mx-auto">{sub}</p>
          <a
            href="#grid"
            onClick={scrollToGrid}
            className="btn-primary !text-base !py-4 !px-8 !bg-transparent !shadow-none !text-white transition-colors duration-200 hover:!bg-[#FF003C]"
            style={{ border: "1.5px solid rgba(255,255,255,0.7)" }}
          >
            SHOP THE SALE →
          </a>
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
