import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowRight, Check, Headphones, Infinity as InfinityIcon, ShoppingCart, Sparkles, Zap } from "lucide-react";
import type { Product } from "@/lib/mock-data";
import { ProductArtwork } from "@/components/ProductArtwork";
import { ProductCard } from "@/components/ProductCard";
import { FadeIn } from "@/components/SectionTitle";
import { actions, useStore } from "@/lib/store";
import { useSalePricing } from "@/lib/sale-pricing";
import { useActiveSale } from "@/hooks/useActiveSale";
import {
  bestsellerIdsQueryOptions,
  latestProductsQueryOptions,
  publishedProductsQueryOptions,
  useBestsellerIds,
  useLatestProducts,
  usePublishedProducts,
} from "@/hooks/useProducts";
import heroVideoAsset from "@/assets/hero_vid_3.mp4.asset.json";

export const Route = createFileRoute("/")({
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(publishedProductsQueryOptions),
      context.queryClient.ensureQueryData(latestProductsQueryOptions(8)),
      context.queryClient.ensureQueryData(bestsellerIdsQueryOptions(20)),
    ]);
  },
  head: () => {
    const title = "Plugin Warehouse | Pro Music Plugins at up to 90% Off Retail";
    const description = "Pro plugins, sample libraries, and creative tools at a fraction of retail. Build your studio for less.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:url", content: "https://www.thepluginwarehouse.com/" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
      ],
      links: [{ rel: "canonical", href: "https://www.thepluginwarehouse.com/" }],
    };
  },
  component: Home,
});

function Home() {
  return <div className="home-v2"><Hero /><PromiseStrip /><PluginRecipes /><OnRotation /><JustAdded /><SoundsOfTheDecade /><PluginOfTheWeek /><Difference /><Newsletter /></div>;
}

function Hero() {
  const { data: products = [] } = usePublishedProducts();
  const { sale } = useActiveSale();
  const picks = useMemo(() => pickDaily(products, 3), [products]);
  const lead = picks[0];
  return (
    <section className="home-hero pwh-horizon">
      <video className="home-hero__video" autoPlay muted loop playsInline preload="metadata" aria-hidden="true"><source src={heroVideoAsset.url} type={heroVideoAsset.content_type} /></video>
      <div className="home-hero__shade" />
      <div className="home-hero__content">
        <div className="home-hero__copy">
          <div className="pwh-eyebrow">Production tools without retail markup</div>
          <h1 className="pwh-display mt-5">BUILD THE SOUND. KEEP THE BUDGET.</h1>
          <p className="home-hero__lede">Plugins, DAWs, libraries, and creative software selected for working producers.</p>
          <div className="home-hero__actions">
            <Link to="/shop" className="btn-primary">Explore the warehouse <ArrowRight className="w-4 h-4" /></Link>
            {sale && <Link to="/sale/$slug" params={{ slug: sale.slug }} className="btn-ghost">{sale.discount_pct}% off now</Link>}
          </div>
        </div>
        <div className="home-hero__catalogue" aria-label="Featured products">
          {lead ? <HeroProduct product={lead} featured /> : <CatalogueEmpty compact />}
          <div className="home-hero__supporting">{picks.slice(1).map((product) => <HeroProduct key={product.slug} product={product} />)}</div>
        </div>
      </div>
    </section>
  );
}

function HeroProduct({ product, featured = false }: { product: Product; featured?: boolean }) {
  const { finalPrice, pct } = useSalePricing(product);
  const price = pct > 0 ? finalPrice : product.price;
  return (
    <Link to="/shop/p/$slug" params={{ slug: product.slug }} className={`hero-product ${featured ? "hero-product--featured" : ""}`}>
      <ProductArtwork src={product.coverUrl} name={product.name} gradient={product.coverGradient} className="hero-product__art" loading={featured ? "eager" : "lazy"} />
      <div className="hero-product__meta"><span>{product.maker}</span><strong>{product.name}</strong><b>{product.isFree ? "FREE" : `$${price.toFixed(2)}`}</b></div>
    </Link>
  );
}

function PromiseStrip() {
  return <div className="promise-strip" aria-label="Store benefits"><span><Zap /> Instant delivery</span><span><InfinityIcon /> Keep it forever</span><span><Headphones /> Human support</span></div>;
}

function PluginRecipes() {
  const { data: products = [] } = usePublishedProducts();
  const recipes = useMemo(() => {
    const effects = products.filter((p) => p.category === "effects");
    const instruments = products.filter((p) => p.category === "instruments");
    const libraries = products.filter((p) => p.category === "libraries");
    return [
      { title: "VOCALS THAT SIT FORWARD", note: "Shape, control, then add space.", items: [effects[0], effects[1], effects[2]].filter(Boolean) as Product[] },
      { title: "A WIDER HOOK", note: "Layer tone, movement, and depth.", items: [instruments[0], effects[3], libraries[0]].filter(Boolean) as Product[] },
      { title: "A CLEANER MASTER", note: "Balance, glue, and final detail.", items: [effects[4], effects[5], effects[6]].filter(Boolean) as Product[] },
    ].filter((group) => group.items.length > 0);
  }, [products]);
  if (!recipes.length) return null;
  return (
    <section className="pwh-section recipes-section"><FadeIn>
      <SectionIntro kicker="Plugin recipes" title="START WITH A CHAIN." body="Three practical routes into the catalogue. Every ingredient stays visible, with no carousel hiding the next move." />
      <div className="recipe-grid">{recipes.map((recipe, recipeIndex) => (
        <article key={recipe.title} className="recipe-card pwh-solid-panel">
          <div className="recipe-card__index">0{recipeIndex + 1}</div><h3>{recipe.title}</h3><p>{recipe.note}</p>
          <div className="recipe-card__products">{recipe.items.map((product, index) => (
            <Link key={product.slug} to="/shop/p/$slug" params={{ slug: product.slug }} className="recipe-product">
              <ProductArtwork src={product.coverUrl} name={product.name} gradient={product.coverGradient} className="recipe-product__art" /><span className="recipe-product__step">{index + 1}</span><span className="recipe-product__name">{product.name}</span>
            </Link>
          ))}</div>
        </article>
      ))}</div>
    </FadeIn></section>
  );
}

function OnRotation() {
  const { data: products = [] } = usePublishedProducts();
  const { data: bestsellerIds = [] } = useBestsellerIds(20);
  const ranked = useMemo(() => {
    const byId = new Map(products.map((p) => [p.id, p]));
    const selected = bestsellerIds.map((id) => byId.get(id)).filter(Boolean) as Product[];
    return (selected.length ? selected : products.filter((p) => p.isBestseller)).slice(0, 8);
  }, [products, bestsellerIds]);
  if (!ranked.length) return null;
  return <section className="pwh-section pwh-shelf-section"><FadeIn><SectionIntro kicker="On rotation" title="PRODUCERS KEEP REACHING FOR THESE." /><div className="pwh-product-row">{ranked.map((product, index) => <div key={product.slug} className="pwh-product-row__item"><ProductCard product={product} rank={index + 1} /></div>)}</div></FadeIn></section>;
}

function JustAdded() {
  const { data: latest = [] } = useLatestProducts(8);
  if (!latest.length) return null;
  return <section className="pwh-section"><FadeIn><SectionIntro kicker="Just added" title="FRESH ON THE SHELF." action={<Link to="/shop" className="pwh-inline-link">Shop all <ArrowRight /></Link>} /><div className="home-product-grid">{latest.slice(0, 8).map((product) => <ProductCard key={product.slug} product={product} />)}</div></FadeIn></section>;
}

function SoundsOfTheDecade() {
  const { data: products = [] } = usePublishedProducts();
  const selection = products.filter((p) => p.category === "instruments" || p.category === "libraries").slice(0, 5);
  if (!selection.length) return null;
  const [lead, ...rest] = selection;
  return (
    <section className="pwh-section decade-section"><FadeIn><SectionIntro kicker="Sounds of the decade" title="FUTURE CLASSICS, ALREADY IN REACH." />
      <div className="decade-layout pwh-solid-panel">
        <Link to="/shop/p/$slug" params={{ slug: lead.slug }} className="decade-lead"><ProductArtwork src={lead.coverUrl} name={lead.name} gradient={lead.coverGradient} className="decade-lead__art" /><div><span>{lead.maker}</span><h3>{lead.name}</h3><p>{lead.tagline || lead.description}</p><b>{lead.isFree ? "FREE" : `$${lead.price.toFixed(2)}`}</b></div></Link>
        <div className="decade-list">{rest.map((product, index) => <Link key={product.slug} to="/shop/p/$slug" params={{ slug: product.slug }} className="decade-row"><span className="decade-row__rank">0{index + 2}</span><ProductArtwork src={product.coverUrl} name={product.name} gradient={product.coverGradient} className="decade-row__art" /><span className="min-w-0"><strong>{product.name}</strong><small>{product.maker}</small></span><b>{product.isFree ? "FREE" : `$${product.price.toFixed(2)}`}</b></Link>)}</div>
      </div>
    </FadeIn></section>
  );
}

function PluginOfTheWeek() {
  const { data: products = [] } = usePublishedProducts();
  const product = products.length ? products[getWeekIndex() % products.length] : undefined;
  return product ? <FeaturedProduct product={product} /> : null;
}

function FeaturedProduct({ product }: { product: Product }) {
  const inCart = useStore((state) => state.cart.some((item) => item.product.slug === product.slug));
  const { finalPrice, pct } = useSalePricing(product);
  return (
    <section className="pwh-section"><FadeIn><article className="weekly-feature">
      <ProductArtwork src={product.coverUrl} name={product.name} gradient={product.coverGradient} className="weekly-feature__art" />
      <div className="weekly-feature__copy"><div className="pwh-eyebrow">Plugin of the week</div><span>{product.maker}</span><h2>{product.name}</h2><p>{product.description}</p><div className="weekly-feature__price">{product.isFree ? "FREE" : `$${(pct > 0 ? finalPrice : product.price).toFixed(2)}`}</div><div className="flex flex-wrap gap-3"><button className="btn-primary" onClick={() => actions.addToCart(product)}>{inCart ? <Check className="w-4 h-4" /> : <ShoppingCart className="w-4 h-4" />}{inCart ? "In your cart" : "Add to cart"}</button><Link to="/shop/p/$slug" params={{ slug: product.slug }} className="btn-ghost">View details</Link></div></div>
    </article></FadeIn></section>
  );
}

function Difference() {
  const items = [{ icon: Sparkles, title: "Curated, not crowded", body: "A useful shelf beats an endless aisle." }, { icon: Zap, title: "Delivered instantly", body: "Your tools arrive while the idea is still fresh." }, { icon: InfinityIcon, title: "Yours to keep", body: "Build a catalogue you can come back to." }];
  return <section className="pwh-section difference-section"><FadeIn><SectionIntro kicker="The warehouse difference" title="MORE ROOM FOR THE MUSIC." /><div className="difference-grid">{items.map(({ icon: Icon, title, body }, index) => <article key={title} className="difference-card"><span>0{index + 1}</span><Icon /><h3>{title}</h3><p>{body}</p></article>)}</div></FadeIn></section>;
}

function Newsletter() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");
  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (status === "loading") return;
    setStatus("loading");
    try {
      const { subscribeNewsletter } = await import("@/lib/newsletter.functions");
      const result = await subscribeNewsletter({ data: { email: email.trim(), source: "homepage" } });
      if (!result.ok) throw new Error(result.error);
      setStatus("done"); setEmail(""); toast.success("You're on the list.");
    } catch (error) { setStatus("idle"); toast.error((error as Error).message ?? "Something went wrong."); }
  };
  return <section className="pwh-section newsletter-section"><div className="newsletter-panel"><div><div className="pwh-eyebrow">Warehouse signal</div><h2>GET THE NEXT DROP FIRST.</h2><p>New tools and worthwhile deals, sent without the noise.</p></div>{status === "done" ? <p className="newsletter-done"><Check /> Subscribed</p> : <form onSubmit={onSubmit}><input type="email" className="input-glass" placeholder="you@email.com" required value={email} onChange={(event) => setEmail(event.target.value)} disabled={status === "loading"} /><button type="submit" className="btn-primary" disabled={status === "loading"}>{status === "loading" ? "Joining" : "Subscribe"}</button></form>}</div></section>;
}

function SectionIntro({ kicker, title, body, action }: { kicker: string; title: string; body?: string; action?: React.ReactNode }) {
  return <header className="section-intro"><div><div className="pwh-eyebrow">{kicker}</div><h2>{title}</h2>{body && <p>{body}</p>}</div>{action}</header>;
}

function CatalogueEmpty({ compact = false }: { compact?: boolean }) {
  return <div className={`catalogue-empty ${compact ? "catalogue-empty--compact" : ""}`}><Sparkles /><strong>The next drop is being stocked.</strong><span>Check back shortly.</span></div>;
}

function pickDaily(products: Product[], count: number) {
  if (!products.length) return [];
  const eligible = products.filter((product) => product.category !== "software");
  const pool = eligible.length ? eligible : products;
  const day = Math.floor(Date.now() / 86_400_000);
  return Array.from({ length: Math.min(count, pool.length) }, (_, index) => pool[(day + index * 7) % pool.length]);
}

function getWeekIndex() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  return Math.floor((now.getTime() - start.getTime()) / 604_800_000);
}
