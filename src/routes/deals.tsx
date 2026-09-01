import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowDown, ArrowRight } from "lucide-react";
import { ShopPage } from "@/components/ShopPage";
import { resolveActiveSale } from "@/hooks/useActiveSale";
import { publishedProductsQueryOptions } from "@/hooks/useProducts";
import { supabase } from "@/integrations/supabase/client";
import heroDesktopAsset from "@/assets/summer-hero-desktop.webp.asset.json";
import heroMobileAsset from "@/assets/summer-hero-mobile.webp.asset.json";

const HERO_DESKTOP = heroDesktopAsset.url;
const HERO_MOBILE = heroMobileAsset.url;
const HERO_LQIP_DESKTOP = "data:image/webp;base64,UklGRp4AAABXRUJQVlA4IJIAAAAwBACdASoYAA0APt1apkyopSOiMAgBEBuJZQCsICXC/QZgztxc6/deQwAA/tRmRXz33vUO5P/TWF9SnXKhX/KMzrSaFKaK5C7qbCCTkf9MilRyPV+YdgAckAB9VCQyxs4QxvM4OiZOYC9gHIomrnNWdfU8UVqFNT04bbtq/ZCxujlYKcxXv1YnChhCYhUpHPWSAA==";
const HERO_LQIP_MOBILE = "data:image/webp;base64,UklGRg4BAABXRUJQVlA4IAIBAAAwBwCdASoYACQAPt1apU2opKMiMBVdURAbiUATpmsfxqMQG8iZKiC2D2r2ljHaK8uusfvo5VuUcXX5gA/MPnv6sQAA/pFpVJWfq69rqbZgA7D5UpV2F471VSeM3uh25OUlJi2ig10jLCOZFN1VvUoOadaVDcj5wdolwaazjNNTg9F7ISZsvDaw1rwAvCI4m6NW1pWaImFakS+xS4gVWBs1Ky+H+mws/P+QDfPUfcDamScEC2TQE7lepYP1+2pe70nCK/dvqS9Sk0RuKnniLC0HIdwsAo38DxuPHXavLu/3CPiN+f2IyjeUXxty4su1YUaIZoitN7soB92fG1E6AIAAAAA=";

export const Route = createFileRoute("/deals")({
  loader: async ({ context }) => {
    const [activeSale] = await Promise.all([
      resolveActiveSale(),
      context.queryClient.ensureQueryData(publishedProductsQueryOptions),
    ]);
    let productIds: string[] = [];
    if (activeSale?.scope === "selected") {
      const { data } = await supabase
        .from("sale_event_products")
        .select("product_id")
        .eq("sale_event_id", activeSale.id);
      productIds = (data ?? []).map((row) => row.product_id);
    }
    const sale = activeSale ? { ...activeSale, productIds } : null;
    return { sale };
  },
  head: ({ loaderData }) => {
    const sale = loaderData?.sale;
    const title = sale
      ? `${sale.name} | Plugin Warehouse`
      : "Plugin Deals | Pro Music Plugins | Plugin Warehouse";
    const description = sale
      ? sale.subheadline || "The best plugin deals online. Pro synths, effects, and bundles at knockout prices. Stack extra savings on already discounted plugins. Limited time."
      : "Browse pro synths, effects, bundles, and production tools at warehouse prices.";
    const url = "https://www.thepluginwarehouse.com/deals";

    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:url", content: url },
        { property: "og:type", content: "website" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
      ],
      links: [
        { rel: "canonical", href: url },
        { rel: "preload", as: "image", href: HERO_MOBILE, media: "(max-width: 767px)", fetchpriority: "high" },
        { rel: "preload", as: "image", href: HERO_DESKTOP, media: "(min-width: 768px)", fetchpriority: "high" },
      ],
    };
  },
  component: DealsPage,
});

function DealsPage() {
  const { sale } = Route.useLoaderData();
  const pct = sale?.discount_pct ?? 35;
  const headline = sale?.headline || (sale ? `${sale.name}. ${pct}% OFF.` : "PRO TOOLS. WAREHOUSE PRICES.");
  const sub = sale?.subheadline || (sale
    ? "Pro tools at warehouse prices for a limited time."
    : "Browse the full catalog of plugins, instruments, effects, and creative tools.");

  const scrollToGrid = (event: React.MouseEvent) => {
    event.preventDefault();
    document.getElementById("grid")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div>
      <section className="sale-hero-v2 pwh-horizon">
        <div
          className="absolute inset-0 overflow-hidden hero-lqip"
          style={{
            maskImage: "linear-gradient(to bottom, #000 38%, rgba(0,0,0,0.15) 68%, transparent 80%)",
            WebkitMaskImage: "linear-gradient(to bottom, #000 38%, rgba(0,0,0,0.15) 68%, transparent 80%)",
            ["--hero-lqip-mobile" as string]: `url("${HERO_LQIP_MOBILE}")`,
            ["--hero-lqip-desktop" as string]: `url("${HERO_LQIP_DESKTOP}")`,
          }}
        >
          <picture>
            <source media="(min-width: 768px)" srcSet={HERO_DESKTOP} type="image/webp" />
            <img
              src={HERO_MOBILE}
              alt=""
              width={900}
              height={1342}
              loading="eager"
              decoding="async"
              fetchPriority="high"
              className="absolute inset-0 w-full h-full object-cover"
            />
          </picture>
        </div>

        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(ellipse 80% 60% at 50% 55%, rgba(11,0,24,0.55) 0%, rgba(11,0,24,0.25) 45%, transparent 75%)",
          }}
        />
        <div
          className="absolute inset-x-0 bottom-0 h-[45%] md:h-[38%] pointer-events-none"
          style={{
            background: "linear-gradient(to bottom, transparent 0%, rgba(4,2,30,.5) 45%, #04021E 100%)",
          }}
        />

        <div className="relative flex flex-col items-center justify-center text-center min-h-[70vh] gap-8 md:gap-10">
          <h1 className="pwh-display max-w-5xl mx-auto">{headline}</h1>
          <p className="text-white/70 text-base md:text-lg max-w-2xl mx-auto pb-2 md:pb-4">{sub}</p>
          <a href="#grid" onClick={scrollToGrid} className="btn-primary">
            <span>{sale ? "SHOP THE SALE" : "SHOP THE CATALOG"}</span>
            <ArrowDown className="w-4 h-4" />
          </a>
        </div>
      </section>

      <div id="grid">
        <ShopPage
          title={sale ? "EVERYTHING ON SALE." : "THE FULL WAREHOUSE."}
          subtitle={sale ? "Pre-filtered. Best discounts up top." : "Browse every plugin in the catalog."}
          initialOnSale={Boolean(sale)}
          activeSale={sale}
        />
      </div>


      <section className="px-4 md:px-12 py-16 text-center">
        <h2 className="font-black chrome-text text-4xl md:text-5xl mb-3">STILL BROWSING?</h2>
        <p className="text-white/65 mb-6">
          {sale ? `Sale ends ${new Date(sale.end_at).toLocaleDateString()}. Don't sleep.` : "New tools land in the warehouse regularly."}
        </p>
        <Link to="/shop" className="btn-ghost !text-base !py-4 !px-8">
          EVERYTHING ELSE <ArrowRight className="w-4 h-4" />
        </Link>
      </section>
    </div>
  );
}
