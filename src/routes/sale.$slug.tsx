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
      <section className="relative -mt-24 md:-mt-28 px-4 md:px-12 pt-40 md:pt-48 pb-16 md:pb-24 overflow-hidden">
        {/* Summer background image: desktop on md+, mobile/tablet below — blurred layer */}
        <div className="absolute inset-0 overflow-hidden" style={{ maskImage: "linear-gradient(to bottom, #000 40%, rgba(0,0,0,0.35) 82%, transparent 100%)", WebkitMaskImage: "linear-gradient(to bottom, #000 40%, rgba(0,0,0,0.35) 82%, transparent 100%)" }}>
          <picture>
            <source
              media="(min-width: 768px)"
              srcSet="https://ovhpoysgvuupqydprsjx.supabase.co/storage/v1/object/public/imagesvideos/summerdesktop.png"
            />
            <img
              src="https://ovhpoysgvuupqydprsjx.supabase.co/storage/v1/object/public/imagesvideos/summermobile.png"
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
              style={{ filter: "blur(8px)", transform: "scale(1.06)" }}
            />
          </picture>
        </div>

        {/* Dotted halftone texture */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(rgba(255,255,255,0.18) 1px, transparent 1.1px)",
            backgroundSize: "5px 5px",
            opacity: 0.35,
            mixBlendMode: "overlay",
            maskImage: "linear-gradient(to bottom, #000 40%, rgba(0,0,0,0.35) 82%, transparent 100%)",
            WebkitMaskImage: "linear-gradient(to bottom, #000 40%, rgba(0,0,0,0.35) 82%, transparent 100%)",
          }}
        />

        {/* Contrast scrim: stronger behind the content, fading toward edges */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 50% 55%, rgba(11,0,24,0.55) 0%, rgba(11,0,24,0.25) 45%, transparent 75%)",
          }}
        />

        {/* Bottom fade into the page background */}
        <div
          className="absolute inset-x-0 bottom-0 h-[45%] md:h-[38%] pointer-events-none"
          style={{
            background: "linear-gradient(to bottom, rgba(19,0,44,0) 0%, rgba(19,0,44,0.5) 45%, rgba(19,0,44,0.75) 72%, rgba(19,0,44,0.3) 92%, rgba(19,0,44,0) 100%)",
          }}
        />


        <div className="relative flex flex-col items-center justify-center text-center min-h-[70vh] gap-8 md:gap-10">
          <h1 className="font-black chrome-text leading-[0.95] max-w-4xl mx-auto text-balance" style={{ fontSize: "clamp(2.25rem, 6.5vw, 6rem)", textShadow: "0 0 40px rgba(255,255,255,0.35)" }}>{headline}</h1>
          <p className="text-white/70 text-base md:text-lg max-w-2xl mx-auto pb-2 md:pb-4">{sub}</p>
          <a
            href="#grid"
            onClick={scrollToGrid}
            className="relative inline-flex items-center justify-center font-bold text-white text-base py-4 px-8 rounded-full overflow-hidden group animate-gradient-btn hover:animate-gradient-btn-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
          >
            <span className="absolute inset-0 gradient-blob" />
            <span className="relative z-10">SHOP THE SALE →</span>
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
