import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ArchiveRestore, ArrowRight, AudioWaveform, Check, Headphones, Infinity as InfinityIcon, Layers3, ShoppingCart, Sparkles, Zap } from "lucide-react";
import type { Product } from "@/lib/mock-data";
import { ProductArtwork } from "@/components/ProductArtwork";
import { ProductCard } from "@/components/ProductCard";
import { ProductPrice } from "@/components/ProductPrice";
import { FadeIn } from "@/components/SectionTitle";
import { actions, useStore } from "@/lib/store";
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
    const [products, latest, bestsellerIds] = await Promise.all([
      context.queryClient.ensureQueryData(publishedProductsQueryOptions),
      context.queryClient.ensureQueryData(latestProductsQueryOptions(8)),
      context.queryClient.ensureQueryData(bestsellerIdsQueryOptions(20)),
    ]);
    return { products, latest, bestsellerIds };
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
  const { products, latest, bestsellerIds } = Route.useLoaderData();
  return <div className="home-v2"><Hero initialProducts={products} /><JustAdded initialProducts={latest} /><PromiseStrip /><PluginRecipes initialProducts={products} /><OnRotation initialProducts={products} initialBestsellerIds={bestsellerIds} /><SoundsOfTheDecade initialProducts={products} /><PluginOfTheWeek initialProducts={products} /><Difference /><Newsletter /></div>;
}

function Hero({ initialProducts }: { initialProducts: Product[] }) {
  const { data } = usePublishedProducts();
  const products = data ?? initialProducts;
  const { sale } = useActiveSale();
  const picks = useMemo(() => pickDaily(products, 3), [products]);
  return (
    <section className="home-hero pwh-horizon">
      <video className="home-hero__video" autoPlay muted loop playsInline preload="metadata" aria-hidden="true"><source src={heroVideoAsset.url} type={heroVideoAsset.content_type} /></video>
      <div className="home-hero__shade" />
      <div className="home-hero__content">
        <div className="home-hero__copy">
          <h1 className="pwh-display">BUILD THE SOUND. KEEP THE BUDGET.</h1>
          <p className="home-hero__lede">Plugins, DAWs, libraries, and creative software selected for working producers.</p>
          <div className="home-hero__actions">
            <Link to="/shop" className="btn-primary">Explore the warehouse <ArrowRight className="w-4 h-4" /></Link>
            {sale && <Link to="/deals" className="btn-ghost">{sale.scope === "all" ? `${sale.discount_pct}% OFF STOREWIDE` : sale.name.toUpperCase()}</Link>}
          </div>
        </div>
        <div className="home-hero__catalogue" aria-label="Featured products">
          {picks.length ? picks.map((product, index) => <HeroProduct key={product.slug} product={product} priority={index === 0} />) : <CatalogueEmpty compact />}
        </div>
      </div>
    </section>
  );
}

function HeroProduct({ product, priority = false }: { product: Product; priority?: boolean }) {
  return (
    <Link to="/shop/p/$slug" params={{ slug: product.slug }} className="hero-product">
      <ProductArtwork src={product.coverUrl} name={product.name} gradient={product.coverGradient} className="hero-product__art" loading={priority ? "eager" : "lazy"}>
        <div className="hero-product__overlay">
          <strong>{product.name}</strong>
          <ProductPrice product={product} currentClassName="hero-product__current" retailClassName="hero-product__retail" />
          <span>View product <ArrowRight aria-hidden="true" /></span>
        </div>
      </ProductArtwork>
    </Link>
  );
}

function PromiseStrip() {
  return <div className="promise-strip" aria-label="Store benefits"><span><Zap /> Instant delivery</span><span><InfinityIcon /> Keep it forever</span><span><Headphones /> Human support</span></div>;
}

function PluginRecipes({ initialProducts }: { initialProducts: Product[] }) {
  const { data } = usePublishedProducts();
  const products = data ?? initialProducts;
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
      <SectionIntro title="START WITH A CHAIN." body="Three practical routes into the catalogue. Every ingredient stays visible, with no carousel hiding the next move." />
      <div className="recipe-grid">{recipes.map((recipe, recipeIndex) => (
        <article key={recipe.title} className="recipe-card pwh-solid-panel">
          <div className="recipe-card__index">0{recipeIndex + 1}</div><h3>{recipe.title}</h3><p>{recipe.note}</p>
          <div className="recipe-card__products">{recipe.items.map((product, index) => (
            <Link key={product.slug} to="/shop/p/$slug" params={{ slug: product.slug }} className="recipe-product">
              <span className="recipe-product__step">{index + 1}</span><ProductArtwork src={product.coverUrl} name={product.name} gradient={product.coverGradient} className="recipe-product__art" /><span className="recipe-product__name">{product.name}</span>
            </Link>
          ))}</div>
        </article>
      ))}</div>
    </FadeIn></section>
  );
}

function OnRotation({ initialProducts, initialBestsellerIds }: { initialProducts: Product[]; initialBestsellerIds: string[] }) {
  const { data: productData } = usePublishedProducts();
  const { data: bestsellerData } = useBestsellerIds(20);
  const products = productData ?? initialProducts;
  const bestsellerIds = bestsellerData ?? initialBestsellerIds;
  const ranked = useMemo(() => {
    const byId = new Map(products.map((p) => [p.id, p]));
    const selected = bestsellerIds.map((id) => byId.get(id)).filter((product): product is Product => Boolean(product && !product.isFree));
    return (selected.length ? selected : products.filter((product) => product.isBestseller && !product.isFree)).slice(0, 8);
  }, [products, bestsellerIds]);
  const [touchPaused, setTouchPaused] = useState(false);
  if (!ranked.length) return null;
  return <section className="pwh-section rotation-section"><FadeIn><SectionIntro title="PRODUCERS KEEP REACHING FOR THESE." /><div className={`rotation-marquee ${touchPaused ? "is-paused" : ""}`} onTouchStart={() => setTouchPaused(true)} onTouchEnd={() => setTouchPaused(false)} onTouchCancel={() => setTouchPaused(false)}><div className="rotation-track">{[false, true].map((duplicate) => <div key={duplicate ? "duplicate" : "primary"} className="rotation-set" aria-hidden={duplicate || undefined}>{ranked.map((product) => <RotationCard key={`${duplicate ? "copy-" : ""}${product.slug}`} product={product} duplicate={duplicate} />)}</div>)}</div></div></FadeIn></section>;
}

function RotationCard({ product, duplicate }: { product: Product; duplicate: boolean }) {
  const inCartState = useStore((state) => state.cart.some((item) => item.product.slug === product.slug));
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const inCart = mounted && inCartState;
  return <article className="rotation-card"><Link to="/shop/p/$slug" params={{ slug: product.slug }} tabIndex={duplicate ? -1 : undefined}><ProductArtwork src={product.coverUrl} name={product.name} gradient={product.coverGradient} className="rotation-card__art" /></Link><div className="rotation-card__details"><strong>{product.name}</strong><div className="rotation-card__buy"><ProductPrice product={product} currentClassName="rotation-card__current" retailClassName="rotation-card__retail" /><button type="button" tabIndex={duplicate ? -1 : undefined} className="rotation-card__cart" onClick={() => actions.addToCart(product)} aria-label={inCart ? `${product.name} is in your cart` : `Add ${product.name} to cart`}>{inCart ? <Check /> : <ShoppingCart />}<span>{inCart ? "Added" : "Add"}</span></button></div></div></article>;
}

function JustAdded({ initialProducts }: { initialProducts: Product[] }) {
  const { data } = useLatestProducts(8);
  const latest = data ?? initialProducts;
  if (!latest.length) return null;
  return <section className="pwh-section fresh-section"><FadeIn><SectionIntro title="FRESH ON THE SHELF." action={<Link to="/shop" className="pwh-inline-link">Shop all <ArrowRight /></Link>} /><div className="home-product-grid reveal-group">{latest.slice(0, 8).map((product) => <ProductCard key={product.slug} product={product} />)}</div></FadeIn></section>;
}

function SoundsOfTheDecade({ initialProducts }: { initialProducts: Product[] }) {
  const { data } = usePublishedProducts();
  const products = data ?? initialProducts;
  const selection = products.filter((p) => p.category === "instruments" || p.category === "libraries").slice(0, 5);
  if (!selection.length) return null;
  const [lead, ...rest] = selection;
  return (
    <section className="pwh-section decade-section"><FadeIn><SectionIntro title="FUTURE CLASSICS, ALREADY IN REACH." />
      <div className="decade-layout">
        <Link to="/shop/p/$slug" params={{ slug: lead.slug }} className="decade-lead"><div className="decade-lead__visual"><ProductArtwork src={lead.coverUrl} name={lead.name} gradient={lead.coverGradient} className="decade-lead__art" /><span className="decade-lead__number">01</span></div><div className="decade-lead__copy"><h3>{lead.name}</h3><p>{lead.tagline || lead.description}</p><ProductPrice product={lead} currentClassName="decade-price__current" retailClassName="decade-price__retail" /></div></Link>
        <div className="decade-list">{rest.map((product, index) => <CuratedProduct key={product.slug} product={product} rank={index + 2} />)}</div>
      </div>
    </FadeIn></section>
  );
}

function CuratedProduct({ product, rank }: { product: Product; rank: number }) {
  return <Link to="/shop/p/$slug" params={{ slug: product.slug }} className="decade-row"><span className="decade-row__rank">{String(rank).padStart(2, "0")}</span><ProductArtwork src={product.coverUrl} name={product.name} gradient={product.coverGradient} className="decade-row__art" /><span className="decade-row__name"><strong>{product.name}</strong><small>{product.tagline || product.category}</small></span><ProductPrice product={product} currentClassName="decade-row__current" retailClassName="decade-row__retail" /></Link>;
}

function PluginOfTheWeek({ initialProducts }: { initialProducts: Product[] }) {
  const { data } = usePublishedProducts();
  const products = data ?? initialProducts;
  const product = products.length ? products[getWeekIndex() % products.length] : undefined;
  return product ? <FeaturedProduct product={product} /> : null;
}

function FeaturedProduct({ product }: { product: Product }) {
  const inCart = useStore((state) => state.cart.some((item) => item.product.slug === product.slug));
  return (
    <section className="pwh-section"><FadeIn><article className="weekly-feature">
      <ProductArtwork src={product.coverUrl} name={product.name} gradient={product.coverGradient} className="weekly-feature__art" />
      <div className="weekly-feature__copy"><h2>{product.name}</h2><p>{product.description}</p><ProductPrice product={product} className="weekly-feature__price" currentClassName="weekly-price__current" retailClassName="weekly-price__retail" /><div className="flex flex-wrap gap-3"><button className="btn-primary" onClick={() => actions.addToCart(product)}>{inCart ? <Check className="w-4 h-4" /> : <ShoppingCart className="w-4 h-4" />}{inCart ? "In your cart" : "Add to cart"}</button><Link to="/shop/p/$slug" params={{ slug: product.slug }} className="btn-ghost">View details</Link></div></div>
    </article></FadeIn></section>
  );
}

function Difference() {
  const items = [{ icon: Layers3, title: "Curated, not crowded", body: "A useful shelf beats an endless aisle." }, { icon: AudioWaveform, title: "Delivered instantly", body: "Your tools arrive while the idea is still fresh." }, { icon: ArchiveRestore, title: "Yours to keep", body: "Build a catalogue you can come back to." }];
  return <section className="pwh-section difference-section"><FadeIn><div className="difference-grid reveal-group">{items.map(({ icon: Icon, title, body }, index) => <article key={title} className="difference-card"><span>0{index + 1}</span><div className="difference-card__icon"><Icon /></div><h3>{title}</h3><p>{body}</p></article>)}</div></FadeIn></section>;
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
  return <section className="pwh-section newsletter-section"><FadeIn><div className="newsletter-panel"><div><h2>GET THE NEXT DROP FIRST.</h2><p>Get early access to new drops and deals before they go public.</p></div>{status === "done" ? <p className="newsletter-done"><Check /> Subscribed</p> : <form onSubmit={onSubmit}><input type="email" className="input-glass" aria-label="Email address" placeholder="you@email.com" required value={email} onChange={(event) => setEmail(event.target.value)} disabled={status === "loading"} /><button type="submit" className="btn-primary" disabled={status === "loading"}>{status === "loading" ? "Joining" : "Subscribe"}</button></form>}</div></FadeIn></section>;
}

function SectionIntro({ title, body, action }: { title: string; body?: string; action?: React.ReactNode }) {
  return <header className="section-intro"><div><h2>{title}</h2>{body && <p>{body}</p>}</div>{action}</header>;
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
