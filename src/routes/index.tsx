import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { GlassCard } from "@/components/GlassCard";
import { FadeIn } from "@/components/SectionTitle";
import { AuroraTitle } from "@/components/AuroraTitle";
import {
  Zap,
  Infinity as InfinityIcon,
  Plug,
  ChevronLeft,
  ChevronRight,
  Heart,
  ShoppingCart,
  Check,
  ArrowUpRight,
  Plus,
  Piano,
  Sliders,
  Library,
  AudioWaveform,
  AppWindow,
  Gift,
  type LucideIcon,
} from "lucide-react";
import { type Product } from "@/lib/mock-data";
import { actions, useStore } from "@/lib/store";
import { usePublishedProducts, useBestsellerIds } from "@/hooks/useProducts";
import { useSalePricing } from "@/lib/sale-pricing";
import { useActiveSale } from "@/hooks/useActiveSale";

/* ============ PLACEHOLDER PRODUCTS ============
 * Used so every section keeps its layout, titles, and body copy even before
 * real products exist in the catalog. Replaced automatically once products
 * are added through the dashboard. */
const PLACEHOLDER_GRADIENTS = [
  "radial-gradient(ellipse at 30% 30%, #FF003C 0%, #1F0540 55%, #0a0018 100%)",
  "radial-gradient(ellipse at 70% 40%, #2B28FF 0%, #0E0BD1 45%, #0a0018 100%)",
  "linear-gradient(120deg, #13002C 0%, #FF1F5C 55%, #13002C 100%)",
  "radial-gradient(ellipse at 50% 60%, #FF1F5C 0%, #1F0540 55%, #0a0018 100%)",
  "linear-gradient(60deg, #0E0BD1 0%, #2B28FF 35%, #FF003C 100%)",
  "radial-gradient(ellipse at 20% 70%, #FF003C 0%, #2B28FF 60%, #0a0018 100%)",
  "radial-gradient(ellipse at 80% 20%, #FF1F5C 0%, #0E0BD1 55%, #0a0018 100%)",
  "linear-gradient(135deg, #1F0540 0%, #FF003C 50%, #0a0018 100%)",
];

const placeholder = (i = 0, overrides: Partial<Product> = {}): Product => ({
  slug: `placeholder-${i}`,
  name: "COMING SOON",
  maker: "YOUR LABEL",
  category: "instruments",
  daws: ["Standalone"],
  formats: ["VST", "VST3", "AU"],
  version: "1.0",
  fileSize: "—",
  updated: "—",
  price: 0,
  tagline: "Add your first product from the dashboard to populate this slot.",
  description: "Placeholder product. Visible only while the catalog is empty.",
  coverGradient: PLACEHOLDER_GRADIENTS[i % PLACEHOLDER_GRADIENTS.length],
  ...overrides,
});

const placeholderList = (n: number): Product[] =>
  Array.from({ length: n }, (_, i) => placeholder(i));

/* Deterministic 24h rotation of 3 random hero products drawn from
 * Effects / Instruments / Libraries / DAWs (never Software). */
const HERO_ALLOWED = new Set(["effects", "instruments", "libraries", "daws"]);
function pickDailyHeroProducts(all: Product[]): Product[] {
  const pool = all.filter((p) => HERO_ALLOWED.has(p.category));
  if (pool.length === 0) return [placeholder(0), placeholder(1), placeholder(2)];
  // Seed = whole days since epoch (UTC). Rotates once every 24h.
  let seed = Math.floor(Date.now() / 86_400_000) + 1;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 0x100000000;
  };
  const arr = [...pool];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  const picks: Product[] = [];
  for (let i = 0; i < 3; i++) picks.push(arr[i % arr.length] ?? placeholder(i));
  return picks;
}


/* ============ ROUTE ============ */

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Plugin Warehouse — Pro plugins at a fraction of the price" },
      {
        name: "description",
        content:
          "A curated vault of pro-tier plugins, instruments, and sample libraries. Instant access. Yours forever.",
      },
      { property: "og:title", content: "Plugin Warehouse" },
      {
        property: "og:description",
        content: "Pro-tier plugins at a fraction of the price. Curated for producers.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div>
      <Hero />
      <Ticker />
      <OnRotation />
      <PluginRecipes />
      <BrowseTheVault />
      <SoundsOfTheDecade />
      <PluginOfTheWeek />
      <Difference />
      <Newsletter />
    </div>
  );
}

/* ============ HERO ============ */

function Hero() {
  const { data: allProducts = [] } = usePublishedProducts();
  const { sale } = useActiveSale();
  const salePct = sale?.discount_pct ?? 35;
  const cover1 = useRef<HTMLDivElement>(null);
  const cover2 = useRef<HTMLDivElement>(null);
  const cover3 = useRef<HTMLDivElement>(null);
  const heroPicks: Product[] = pickDailyHeroProducts(allProducts);


  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const on = () => {
      const y = window.scrollY;
      if (cover1.current) cover1.current.style.transform = `translateY(${y * 0.08}px) rotate(-6deg)`;
      if (cover2.current)
        cover2.current.style.transform = `translateY(${y * 0.12}px) rotate(4deg) translateX(${y * 0.02}px)`;
      if (cover3.current) cover3.current.style.transform = `translateY(${y * 0.06}px) rotate(-2deg)`;
    };
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  return (
    <section className="relative px-4 md:px-6 pt-4 pb-12 md:pb-24 overflow-hidden">
      <video
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        src="https://ovhpoysgvuupqydprsjx.supabase.co/storage/v1/object/public/imagesvideos//pwh%20hero%20video.mp4"
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        aria-hidden="true"
      />
      <div className="absolute inset-0 pointer-events-none bg-black/50" />
      <div className="absolute inset-0 pointer-events-none opacity-50">
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 60% 80% at 20% 30%, #FF003C33, transparent 60%), radial-gradient(ellipse 50% 70% at 80% 20%, #2B28FF33, transparent 60%), radial-gradient(ellipse 80% 50% at 60% 90%, #FF1F5C22, transparent 60%)",
          }}
        />
      </div>


      <div className="relative grid lg:grid-cols-2 gap-12 items-center min-h-[70vh]">
        <div>
          <h1
            className="font-display leading-[0.92] tracking-tight mb-6"
            style={{ fontSize: "clamp(3rem, 8vw, 6.5rem)" }}
          >
            <span className="block text-red">EXTRA 25% OFF.</span>
            <span className="block">EVERYTHING.</span>
            <span className="block">
              UNTIL <span className="text-red">SEPT 22.</span>
            </span>
          </h1>
          <p className="text-lg md:text-xl text-white/80 max-w-xl mb-4 leading-relaxed">
            Get your plugins at a <span className="text-red">fraction of retail</span>. Build your
            sound before the drop.
          </p>
          <p className="label-mini mb-8">
            Instant access on launch · Secure checkout · Curated for producers
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/sale/$slug"
              params={{ slug: "summer-steals" }}
              className="btn-primary !text-base !py-4 !px-8"
            >
              SHOP THE SALE →
            </Link>
            <Link to="/shop" className="btn-ghost !text-base !py-4 !px-8">
              SHOP ALL PLUGINS
            </Link>
          </div>
        </div>

        <div className="relative h-[420px] md:h-[520px] lg:h-[640px] hidden lg:block lg:-translate-x-24 xl:-translate-x-32">
          {heroPicks.map((p, i) => {
            const layout = [
              { pos: "top-0 left-0", rot: "-6deg", ref: cover1, z: 1 },
              { pos: "top-24 left-1/3", rot: "4deg", ref: cover2, z: 3 },
              { pos: "top-10 right-0", rot: "-2deg", ref: cover3, z: 2 },
            ][i];
            const c = { p, ...layout };
            return (
            <div
              key={i}
              ref={c.ref}
              className={`absolute ${c.pos} w-80 xl:w-96`}
              style={{ zIndex: c.z, transform: `rotate(${c.rot})` }}
            >
              <Link
                to="/shop/p/$slug"
                params={{ slug: c.p.slug }}
                className="group block glass-card glass-card--heavy p-3 relative transition-transform duration-300 hover:scale-[1.03]"
              >
                <div className="chromatic-edge" />
                <div
                  className="absolute inset-0 pointer-events-none rounded-3xl opacity-30 group-hover:opacity-100 transition-opacity duration-500"
                  style={{
                    background:
                      "radial-gradient(ellipse at center, rgba(255,0,60,0.85), transparent 70%)",
                    filter: "blur(28px)",
                    zIndex: -1,
                  }}
                />
                <div
                  className="relative z-10 aspect-square rounded-2xl overflow-hidden"
                  style={{ background: c.p.coverGradient }}
                >
                  {c.p.coverUrl ? (
                    <img src={c.p.coverUrl} alt={c.p.name} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <div className="label-mini mb-2">{c.p.maker}</div>
                        <div className="font-display text-3xl">{c.p.name}</div>
                      </div>
                    </div>
                  )}
                  <div className="absolute top-2 right-2 px-2 py-1 rounded-md font-mono text-[10px] font-bold bg-[var(--accent-red)] text-white">
                    EXTRA {salePct}% OFF
                  </div>
                </div>
              </Link>
            </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Ticker() {
  const items = [
    <span key="a" className="font-display font-black tracking-[0.18em]">
      FOR PRODUCERS, BY PRODUCERS
    </span>,
    <span key="b" className="font-display font-black tracking-[0.18em]">
      <span className="rainbow-glass-text">35% OFF</span> STOREWIDE
    </span>,
  ];
  const repeated = Array.from({ length: 8 }).flatMap(() => items);
  return (
    <div className="relative overflow-hidden border-y border-white/10">
      <div
        className="h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent, #FF1F5C, #2B28FF, #FF1F5C, transparent)",
        }}
      />
      <div className="py-4 overflow-hidden">
        <div className="marquee-track marquee-track--fast flex gap-16 whitespace-nowrap text-base md:text-lg uppercase">
          {repeated.map((item, i) => (
            <span key={i} className="flex items-center gap-16 shrink-0">
              {item}
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-red-glow)]" />
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ============ ON ROTATION (auto-marquee + progress) ============ */

const ROTATION_DURATION_MS = 38000;

function OnRotation() {
  const { data: allProducts = [] } = usePublishedProducts();
  const { data: bestsellerIds = [] } = useBestsellerIds(12);
  const byId = new Map(allProducts.map((p) => [p.id!, p]));
  const bestsellers = bestsellerIds.map((id) => byId.get(id)).filter(Boolean) as Product[];

  // Manual fallback while there isn't enough real sales data (need ≥6 bestsellers).
  // Matched by name substring so slight catalog naming variations still resolve.
  const MANUAL_PICKS: RegExp[] = [
    /\bserum\s*2\b/i,
    /omnisphere/i,
    /valhalla\s+bundle/i,
    /fabfilter.*bundle|fabfilter\s+complete/i,
    /\bnexus\s*5\b/i,
    /soundtoys\s+bundle/i,
  ];
  const manual: Product[] = MANUAL_PICKS
    .map((rx) => allProducts.find((p) => rx.test(p.name)))
    .filter(Boolean) as Product[];

  // Manual curation stays in effect until we have enough real sales volume
  // that "bestsellers" is meaningful (using a high floor so a handful of
  // early test orders don't flip the section prematurely).
  let source: Product[];
  if (bestsellers.length >= 20) {
    const featured = allProducts.filter((p) => p.isFeatured && !bestsellerIds.includes(p.id!));
    const rest = allProducts.filter((p) => !bestsellerIds.includes(p.id!) && !p.isFeatured);
    source = [...bestsellers, ...featured, ...rest].slice(0, 8);
  } else {
    const manualIds = new Set(manual.map((p) => p.id));
    const rest = allProducts.filter((p) => !manualIds.has(p.id));
    source = [...manual, ...rest].slice(0, 8);
  }

  const list = source.length > 0 ? source : placeholderList(8);
  const [progress, setProgress] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setProgress(0);
      return;
    }
    let raf = 0;
    let start = performance.now();
    let pausedAt: number | null = null;
    const wrap = wrapRef.current;

    const onEnter = () => { pausedAt = performance.now(); };
    const onLeave = () => {
      if (pausedAt != null) {
        start += performance.now() - pausedAt;
        pausedAt = null;
      }
    };
    wrap?.addEventListener("mouseenter", onEnter);
    wrap?.addEventListener("mouseleave", onLeave);

    const loop = (t: number) => {
      const ref = pausedAt ?? t;
      const elapsed = (ref - start) % ROTATION_DURATION_MS;
      setProgress(elapsed / ROTATION_DURATION_MS);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      wrap?.removeEventListener("mouseenter", onEnter);
      wrap?.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  return (
    <section className="px-4 md:px-12 py-16 md:py-24">
      <div className="mb-6">
        <AuroraTitle className="!mb-2">ON ROTATION</AuroraTitle>
      </div>
      <FadeIn>
        <div ref={wrapRef} className="rotation-marquee-wrap">
          <div
            className="rotation-marquee-track"
            style={{ animationDuration: `${ROTATION_DURATION_MS}ms` }}
          >
            {[...list, ...list].map((p, i) => (
              <RotationCard key={`${p.slug}-${i}`} product={p} />
            ))}
          </div>
        </div>
        <div className="rotation-progress mt-2">
          <div
            className="rotation-progress-fill"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      </FadeIn>
    </section>
  );
}


function RotationCard({ product }: { product: Product }) {
  const wished = useStore((s) => s.wishlist.includes(product.slug));
  const [added, setAdded] = useState(false);
  const { finalPrice, pct } = useSalePricing(product);
  const hasCompareAt = !!(product.compareAtPrice && product.compareAtPrice > product.price);
  const onSale = pct > 0 || hasCompareAt;
  const strikePrice = hasCompareAt ? product.compareAtPrice : (pct > 0 ? product.price : undefined);
  const displayPrice = pct > 0 ? finalPrice : product.price;
  const badgePct = pct > 0 ? pct : (hasCompareAt ? Math.round((1 - product.price / (product.compareAtPrice as number)) * 100) : 0);
  const navigate = useNavigate();

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    actions.addToCart(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 1400);
  };

  return (
    <div
      className="rotation-card glass-card"
      onClick={() => navigate({ to: "/shop/p/$slug", params: { slug: product.slug } })}
      role="link"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter") navigate({ to: "/shop/p/$slug", params: { slug: product.slug } });
      }}
    >
      <div className="chromatic-edge" />
      <div className="rotation-artwork" style={{ background: product.coverGradient }}>
        {product.coverUrl ? (
          <img src={product.coverUrl} alt={product.name} loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center p-4 text-center">
            <div className="font-display text-3xl leading-tight">{product.name}</div>
          </div>

        )}
        <div
          className="absolute inset-0 glow-breathe pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(255,0,60,0.28), transparent 65%)",
          }}
        />
        {onSale && !product.isFree && badgePct > 0 && (
          <div className="absolute top-3 right-3 px-2 py-1 rounded-md font-mono text-[10px] font-bold bg-[var(--accent-red)] text-white shadow-lg">
            EXTRA {badgePct}% OFF
          </div>
        )}
      </div>

      {/* Default minimal state: name + price + cart (top-bottom subtle) */}
      <div className="absolute top-3 left-3 z-10 px-2 py-1 rounded-md bg-black/40 backdrop-blur-sm font-mono text-[10px] tracking-wider text-white/90 pointer-events-none">
        {product.isFree ? "FREE" : `$${displayPrice.toFixed(2)}`}
      </div>

      {/* Hover overlay reveals name + favorite + price/cart, compact */}
      <div className="rotation-overlay z-10" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <h3 className="font-display text-lg leading-tight truncate min-w-0">{product.name}</h3>
          <button
            onClick={(e) => {
              e.stopPropagation();
              actions.toggleWishlist(product.slug);
            }}
            className="p-1 rounded-full hover:bg-white/10 transition shrink-0 -mt-0.5"
            aria-label={wished ? "Remove from saved" : "Save"}
          >
            <Heart
              className={`w-4 h-4 ${wished ? "fill-[var(--accent-red)] text-[var(--accent-red)]" : "text-white/85"}`}
            />
          </button>
        </div>


        <div className="flex items-end justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-baseline gap-2">
              <span className="font-mono font-bold text-base">
                {product.isFree ? "FREE" : `$${displayPrice.toFixed(2)}`}
              </span>
              {strikePrice && !product.isFree && (
                <span className="font-mono text-xs text-white/40 line-through">
                  ${strikePrice}
                </span>
              )}
            </div>
            <Link
              to="/shop/p/$slug"
              params={{ slug: product.slug }}
              onClick={(e) => e.stopPropagation()}
              className="font-mono text-[10px] tracking-wider text-white/70 hover:text-white inline-flex items-center gap-1 mt-0.5"
            >
              VIEW DETAILS <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
          <button
            onClick={handleAdd}
            className={`btn-primary !py-2 !px-3 transition-all ${added ? "!bg-[var(--accent-blue)]" : ""}`}
            aria-label="Add to cart"
            style={added ? { background: "linear-gradient(180deg,#2B28FF 0%,#0E0BD1 100%)", boxShadow: "0 8px 24px rgba(14,11,209,0.45)" } : undefined}
          >
            {added ? <Check className="w-4 h-4" /> : <ShoppingCart className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============ PLUGIN RECIPES ============ */

type Recipe = {
  a: string; // product slug
  b: string;
  outcome: string;
  description: string;
  useFor: string;
};

const RECIPES: Recipe[] = [
  {
    a: "antares-autotune-11-p9f2g",
    b: "nectar-4-advanced-1t25w",
    outcome: "Vocals that actually sit.",
    description:
      "Autotune locks the pitch, Nectar handles everything else — EQ, comp, de-ess, reverb in one chain. Get a clean, radio-ready vocal without stacking ten plugins.",
    useFor: "Vocals, rap, pop, vocal chains, mixing prep.",
  },
  {
    a: "soothe2-a385o",
    b: "fabfilter-complete-bundle-v3n62",
    outcome: "Clean fkn mix.",
    description:
      "Soothe2 kills harsh resonance dynamically, FabFilter gives you surgical EQ and control over everything else. Tighter, cleaner, more balanced mixes without overthinking it.",
    useFor: "Vocals, beats, full mixes, mastering prep.",
  },
  {
    a: "rc-20-9jd5j",
    b: "valhalla-bundle-aadb7",
    outcome: "Vintage warmth, instant vibe.",
    description:
      "RC-20 adds grit, noise, and analog character. Valhalla drenches it in lush reverb and space. Turn sterile, stock-sounding tracks into something with soul.",
    useFor: "Lo-fi, ambient, textures, adding character, R&B.",
  },
];

function PluginRecipes() {
  const { data: allProducts = [] } = usePublishedProducts();
  const bySlug = new Map(allProducts.map((p) => [p.slug, p]));
  const available = RECIPES.filter((r) => bySlug.get(r.a) && bySlug.get(r.b));
  const recipes = available.length > 0 ? available : RECIPES;
  const [index, setIndex] = useState(0);
  const len = recipes.length;

  const slotFor = (i: number) => {
    let d = i - index;
    if (d > len / 2) d -= len;
    if (d < -len / 2) d += len;
    return d; // -1, 0, 1
  };

  const go = (dir: 1 | -1) => setIndex((i) => (i + dir + len) % len);

  return (
    <section className="px-4 md:px-12 py-16 md:py-24">
      <AuroraTitle className="!mb-2">PLUGIN RECIPES</AuroraTitle>
      <p className="text-center text-white/70 mb-12 text-base md:text-lg max-w-2xl mx-auto">
        Stack the right tools and get straight to the sound.
      </p>
      <FadeIn>
        <div className="recipe-carousel">
          <button
            className="carousel-ctrl recipe-arrow-prev"
            onClick={() => go(-1)}
            aria-label="Previous recipe"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            className="carousel-ctrl recipe-arrow-next"
            onClick={() => go(1)}
            aria-label="Next recipe"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          <div className="recipe-stage">
            {recipes.map((r, i) => {
              const slot = slotFor(i);
              const onSideClick = slot === 0 ? undefined : () => setIndex(i);
              return (
                <div
                  key={r.a + r.b}
                  className="recipe-slide"
                  data-slot={slot}
                  aria-hidden={slot !== 0}
                  onClick={onSideClick}
                >
                  <RecipeSlideCard recipe={r} active={slot === 0} />
                </div>
              );
            })}
          </div>
          <div className="recipe-dots">
            {recipes.map((r, i) => (
              <button
                key={r.a + r.b}
                className="recipe-dot"
                data-active={i === index}
                onClick={() => setIndex(i)}
                aria-label={`Go to recipe ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </FadeIn>
    </section>
  );
}

function RecipeSlideCard({ recipe, active }: { recipe: Recipe; active: boolean }) {
  const { data: allProducts = [] } = usePublishedProducts();
  const bySlug = new Map(allProducts.map((p) => [p.slug, p]));
  const a = bySlug.get(recipe.a) ?? placeholder(0, { slug: recipe.a, name: recipe.a.toUpperCase().replace(/-/g, " ") });
  const b = bySlug.get(recipe.b) ?? placeholder(1, { slug: recipe.b, name: recipe.b.toUpperCase().replace(/-/g, " ") });
  const saleA = useSalePricing(a);
  const saleB = useSalePricing(b);
  const priceA = saleA.finalPrice;
  const priceB = saleB.finalPrice;
  const [added, setAdded] = useState(false);

  const total = priceA + priceB;
  const compareTotal = (a.compareAtPrice ?? a.price) + (b.compareAtPrice ?? b.price);

  const addBoth = (e: React.MouseEvent) => {
    e.stopPropagation();
    actions.addToCart(a);
    actions.addToCart(b);
    setAdded(true);
    setTimeout(() => setAdded(false), 1600);
  };

  return (
    <article className="recipe-slide-card">
      <div className="recipe-tiles-row mb-4">
        <RecipeTile product={a} />
        <div className="recipe-symbol"><Plus className="w-6 h-6" /></div>
        <RecipeTile product={b} />
      </div>
      <div className="recipe-symbol font-display text-2xl mb-3">=</div>
      <div className="recipe-outcome">
        <h3 className="font-display text-2xl leading-tight mb-2">{recipe.outcome}</h3>
        <p className="text-white/75 text-sm leading-relaxed mb-3">{recipe.description}</p>
        <div className="label-mini mb-3">
          Use for:{" "}
          <span className="text-white/65 normal-case tracking-normal font-normal">
            {recipe.useFor}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={addBoth}
            disabled={!active}
            className={`btn-primary !text-sm relative ${added ? "!bg-[var(--accent-blue)]" : ""}`}
            style={
              added
                ? {
                    background: "linear-gradient(180deg,#2B28FF 0%,#0E0BD1 100%)",
                    boxShadow: "0 8px 24px rgba(14,11,209,0.45)",
                  }
                : undefined
            }
          >
            {added ? (
              <>
                <Check className="w-4 h-4" /> ADDED
              </>
            ) : (
              <>
                ADD BOTH
                <span className="ml-2 inline-flex items-center justify-center min-w-[22px] h-[22px] rounded-full bg-black/30 border border-white/25 font-mono text-[11px]">
                  2
                </span>
              </>
            )}
          </button>
          <div className="font-mono text-sm">
            <span className="font-bold text-white">${total}</span>
            {compareTotal > total && (
              <span className="ml-2 text-white/40 line-through">${compareTotal}</span>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}


function RecipeTile({ product, className = "" }: { product: Product; className?: string }) {
  const navigate = useNavigate();
  const { finalPrice } = useSalePricing(product);
  return (
    <div
      className={`recipe-tile ${className}`}
      onClick={() => navigate({ to: "/shop/p/$slug", params: { slug: product.slug } })}
      role="link"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter") navigate({ to: "/shop/p/$slug", params: { slug: product.slug } });
      }}
    >
      <div
        className="aspect-square rounded-lg overflow-hidden relative"
        style={{ background: product.coverGradient }}
      >
        {product.coverUrl ? (
          <img src={product.coverUrl} alt={product.name} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-center p-2">
            <div className="font-display text-base leading-tight">{product.name}</div>
          </div>

        )}
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[10px] text-white/65 inline-flex items-center gap-1">
          VIEW PRODUCT <ArrowUpRight className="w-3 h-3" />
        </span>
        <span className="font-mono text-xs font-bold">{product.isFree ? "FREE" : `$${finalPrice.toFixed(2)}`}</span>
      </div>
    </div>
  );
}

/* ============ BROWSE THE VAULT — SOUND CONSOLE TABS ============ */


type VaultTab = {
  slug: "instruments" | "effects" | "libraries" | "daws" | "software" | "freebies";
  label: string;
  title: string;
  description: string;
  chips: string[];
  ctaLabel: string;
  bg: string;
  Icon: LucideIcon;
};

const VAULT_TABS: VaultTab[] = [
  {
    slug: "instruments",
    label: "Instruments",
    title: "Instruments",
    description: "Synths, samplers, drum machines, and playable virtual instruments.",
    chips: ["Synths", "Samplers", "Keys", "Bass", "Drum Machines"],
    ctaLabel: "Browse Instruments",
    bg: "radial-gradient(ellipse at 25% 30%, #FF003C 0%, #1F0540 45%, #0a0018 100%)",
    Icon: Piano,
  },
  {
    slug: "effects",
    label: "Effects",
    title: "Effects",
    description: "Mixing, mastering, modulation, EQ, compression, and creative FX.",
    chips: ["EQ", "Compression", "Reverb", "Delay", "Mastering"],
    ctaLabel: "Browse Effects",
    bg: "radial-gradient(ellipse at 70% 50%, #0E0BD1 0%, #1F0540 45%, #0a0018 100%)",
    Icon: Sliders,
  },
  {
    slug: "libraries",
    label: "Libraries",
    title: "Libraries",
    description: "Loops, one-shots, presets, sample packs, and construction kits.",
    chips: ["Kontakt", "Sample Packs", "Loops", "Presets", "Cinematic"],
    ctaLabel: "Browse Libraries",
    bg: "linear-gradient(120deg, #13002C 0%, #FF1F5C 55%, #13002C 100%)",
    Icon: Library,
  },
  {
    slug: "daws",
    label: "DAWs",
    title: "DAWs",
    description: "Powerful digital audio workstations built for creators and producers.",
    chips: ["Production", "Recording", "Mixing", "Mastering", "Live", "All Platforms"],
    ctaLabel: "Browse DAWs",
    bg: "radial-gradient(ellipse at 50% 30%, #2B28FF 0%, #0E0BD1 35%, #0a0018 100%)",
    Icon: AudioWaveform,
  },
  {
    slug: "software",
    label: "Software",
    title: "Software",
    description: "Creative software, video editors, audio repair, and pro utilities.",
    chips: ["Video", "Motion", "Photo", "Audio Repair", "Utilities"],
    ctaLabel: "Browse Software",
    bg: "linear-gradient(120deg, #FF003C 0%, #FF1F5C 30%, #1F0540 70%, #0a0018 100%)",
    Icon: AppWindow,
  },
  {
    slug: "freebies",
    label: "Freebies",
    title: "Freebies",
    description: "Starter tools, free sounds, and zero-cost downloads.",
    chips: ["Free Synths", "Free EQ", "Starter Packs"],
    ctaLabel: "Browse Freebies",
    bg: "linear-gradient(60deg, #0E0BD1 0%, #2B28FF 35%, #FF003C 100%)",
    Icon: Gift,
  },
];

function BrowseTheVault() {
  // Default active: DAWs
  const [activeSlug, setActiveSlug] = useState<VaultTab["slug"]>("daws");
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const reduce = useReducedMotion();
  const active = VAULT_TABS.find((t) => t.slug === activeSlug) ?? VAULT_TABS[3];
  const { data: allProducts = [] } = usePublishedProducts();
  const previews = (active.slug === "freebies"
    ? allProducts.filter((p) => p.isFree || p.price === 0)
    : allProducts.filter((p) => p.category === active.slug)
  ).slice(0, 3);


  const onTabKey = (e: React.KeyboardEvent, i: number) => {
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      const dir = e.key === "ArrowRight" ? 1 : -1;
      const next = (i + dir + VAULT_TABS.length) % VAULT_TABS.length;
      setActiveSlug(VAULT_TABS[next].slug);
      tabRefs.current[next]?.focus();
    }
  };

  return (
    <section className="px-4 md:px-12 py-16 md:py-24">
      <AuroraTitle className="!mb-2">BROWSE THE VAULT</AuroraTitle>
      <p className="text-center text-white/70 mb-8 text-base md:text-lg max-w-2xl mx-auto">
        Find the tools by sound, workflow, or format.
      </p>
      <FadeIn>
        <div className="max-w-6xl mx-auto">
          <div
            className="console-tabs"
            role="tablist"
            aria-label="Browse the Vault categories"
          >
            {VAULT_TABS.map((t, i) => {
              const isActive = t.slug === activeSlug;
              const Icon = t.Icon;
              return (
                <button
                  key={t.slug}
                  ref={(el) => { tabRefs.current[i] = el; }}
                  role="tab"
                  aria-selected={isActive}
                  aria-controls={`vault-panel-${t.slug}`}
                  tabIndex={isActive ? 0 : -1}
                  data-active={isActive}
                  onClick={() => setActiveSlug(t.slug)}
                  onKeyDown={(e) => onTabKey(e, i)}
                  className="console-tab"
                >
                  <Icon className="console-tab-icon" strokeWidth={2} />
                  {t.label}
                </button>
              );
            })}
          </div>

          <AnimatePresence mode="sync" initial={false}>
          <motion.div
            key={active.slug}
            id={`vault-panel-${active.slug}`}
            role="tabpanel"
            className="console-panel console-fade-in"
            initial={reduce ? false : { opacity: 0, x: 18 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduce ? undefined : { opacity: 0, x: -18 }}
            transition={{ duration: reduce ? 0 : 0.24, ease: [0.19, 1, 0.22, 1] }}
          >
            <div className="console-panel-bg" style={{ background: active.bg }} />
            <div className="console-panel-scrim" />
            <div className="console-panel-grid">
              {/* Left */}
              <div className="flex flex-col console-left">
                <h3 className="console-title chrome-text">
                  {active.title}
                </h3>
                <p className="text-white/75 text-sm md:text-base leading-relaxed mb-5 max-w-md">
                  {active.description}
                </p>
                <div className="flex flex-wrap gap-1.5 mb-6 max-w-md">
                  {active.chips.map((c) => (
                    <span key={c} className="console-chip"><span className="console-chip-dot" />{c}</span>
                  ))}
                </div>
                <div className="flex items-center gap-4 mt-auto">
                  <Link
                    to="/shop/$category"
                    params={{ category: active.slug }}
                    className="btn-primary !text-sm !py-3 !px-5 console-cta"
                  >
                    {active.ctaLabel}
                    <span className="console-cta-arrow">→</span>
                  </Link>
                </div>
              </div>

              {/* Right */}
              <div className="console-right">
                <CategoryVisual slug={active.slug} />
                <div className="console-preview-grid">
                  {previews.map((p) => (
                    <ConsolePreviewCard key={p.slug} product={p} />
                  ))}
                </div>
              </div>
            </div>
            <Link
              to="/shop/$category"
              params={{ category: active.slug }}
              className="console-footer-link"
            >
              View All {active.label} <span className="console-cta-arrow">→</span>
            </Link>
          </motion.div>
          </AnimatePresence>
        </div>
      </FadeIn>
    </section>
  );
}

function DawVisual() {
  // Stable pseudo-random track blocks
  const tracks = [
    [{ s: 4, w: 22, c: "m" }, { s: 30, w: 28, c: "b" }, { s: 62, w: 18, c: "m" }, { s: 84, w: 12, c: "b" }],
    [{ s: 2, w: 16, c: "b" }, { s: 22, w: 34, c: "m" }, { s: 60, w: 22, c: "b" }, { s: 86, w: 10, c: "m" }],
    [{ s: 8, w: 28, c: "m" }, { s: 40, w: 16, c: "b" }, { s: 60, w: 14, c: "m" }, { s: 78, w: 18, c: "b" }],
    [{ s: 0, w: 20, c: "b" }, { s: 24, w: 24, c: "m" }, { s: 52, w: 30, c: "b" }, { s: 86, w: 12, c: "m" }],
    [{ s: 6, w: 14, c: "m" }, { s: 24, w: 20, c: "b" }, { s: 48, w: 32, c: "m" }, { s: 84, w: 14, c: "b" }],
    [{ s: 2, w: 30, c: "b" }, { s: 36, w: 18, c: "m" }, { s: 58, w: 22, c: "b" }, { s: 84, w: 14, c: "m" }],
  ];
  return (
    <div className="daw-visual" aria-hidden="true">
      <div className="daw-top">
        <div className="daw-dots">
          <span className="daw-dot" style={{ background: "#FF1F5C" }} />
          <span className="daw-dot" style={{ background: "#FFB400" }} />
          <span className="daw-dot" style={{ background: "#2BD27A" }} />
        </div>
        <div className="daw-timecode">00:01:32:14</div>
        <div className="daw-top-right">
          <span className="daw-pill">REC</span>
          <span className="daw-pill">MIX</span>
        </div>
      </div>
      <div className="daw-body">
        <div className="daw-tracks">
          {tracks.map((row, ri) => (
            <div key={ri} className="daw-track">
              <div className="daw-track-head">
                <span className="daw-track-num">{String(ri + 1).padStart(2, "0")}</span>
              </div>
              <div className="daw-track-lane">
                {row.map((b, bi) => (
                  <div
                    key={bi}
                    className={`daw-block daw-block-${b.c}`}
                    style={{ left: `${b.s}%`, width: `${b.w}%` }}
                  >
                    <svg className="daw-wave" viewBox="0 0 100 24" preserveAspectRatio="none">
                      <path
                        d="M0,12 Q5,4 10,12 T20,12 T30,12 T40,12 T50,12 T60,12 T70,12 T80,12 T90,12 T100,12"
                        fill="none"
                        stroke="rgba(255,255,255,0.85)"
                        strokeWidth="1.2"
                      />
                    </svg>
                  </div>
                ))}
              </div>
            </div>
          ))}
          <div className="daw-playhead" />
          <div className="daw-grid-lines">
            {Array.from({ length: 7 }).map((_, i) => (
              <span key={i} style={{ left: `${(i + 1) * 12.5}%` }} />
            ))}
          </div>
        </div>
        <div className="daw-mixer">
          <div className="daw-mixer-label">MASTER</div>
          <div className="daw-mixer-lufs">-8.7 <span>LUFS</span></div>
          <div className="daw-meters">
            <div className="daw-meter"><span style={{ height: "82%" }} /></div>
            <div className="daw-meter"><span style={{ height: "74%" }} /></div>
          </div>
          <div className="daw-knob"><div className="daw-knob-dot" /></div>
          <div className="daw-mixer-label" style={{ opacity: 0.55 }}>OUTPUT</div>
        </div>
      </div>
    </div>
  );
}

function CategoryVisual({ slug }: { slug: VaultTab["slug"] }) {
  switch (slug) {
    case "instruments": return <InstrumentsVisual />;
    case "effects": return <EffectsVisual />;
    case "libraries": return <LibrariesVisual />;
    case "daws": return <DawVisual />;
    case "software": return <SoftwareVisual />;
    case "freebies": return <FreebiesVisual />;
  }
}

function InstrumentsVisual() {
  const keys = Array.from({ length: 14 });
  const blackAfter = new Set([0, 1, 3, 4, 5, 7, 8, 10, 11, 12]);
  return (
    <div className="cat-visual inst-visual" aria-hidden="true">
      <div className="cat-top">
        <span className="cat-chip">OSC 1</span>
        <span className="cat-chip">FILTER</span>
        <span className="cat-chip">ENV</span>
        <span className="cat-chip cat-chip--accent">POLY</span>
      </div>
      <div className="inst-screen">
        <svg viewBox="0 0 200 60" preserveAspectRatio="none" className="inst-wave">
          <defs>
            <linearGradient id="instGrad" x1="0" x2="1">
              <stop offset="0" stopColor="#FF1F5C" />
              <stop offset="1" stopColor="#2B28FF" />
            </linearGradient>
          </defs>
          <path d="M0,30 C10,5 20,55 30,30 C40,5 50,55 60,30 C70,5 80,55 90,30 C100,5 110,55 120,30 C130,5 140,55 150,30 C160,5 170,55 180,30 C190,15 195,45 200,30"
            fill="none" stroke="url(#instGrad)" strokeWidth="1.6" />
        </svg>
        <div className="inst-grid" />
      </div>
      <div className="inst-knobs">
        {["CUTOFF", "RES", "ATK", "REL", "DRIVE"].map((l, i) => (
          <div key={l} className="inst-knob-wrap">
            <div className="inst-knob"><span style={{ transform: `rotate(${-120 + i * 55}deg)` }} /></div>
            <div className="cat-label">{l}</div>
          </div>
        ))}
      </div>
      <div className="inst-keys">
        {keys.map((_, i) => (
          <div key={i} className="inst-key">
            {blackAfter.has(i) && <span className="inst-key-black" />}
          </div>
        ))}
      </div>
    </div>
  );
}

function EffectsVisual() {
  const meters = [0.85, 0.62, 0.74, 0.5, 0.78, 0.66];
  return (
    <div className="cat-visual fx-visual" aria-hidden="true">
      <div className="cat-top">
        <span className="cat-chip">EQ</span>
        <span className="cat-chip">COMP</span>
        <span className="cat-chip">REVERB</span>
        <span className="cat-chip cat-chip--accent">+9.2 dB</span>
      </div>
      <div className="fx-eq">
        <div className="fx-eq-grid" />
        <svg viewBox="0 0 300 100" preserveAspectRatio="none" className="fx-eq-svg">
          <defs>
            <linearGradient id="fxFill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="rgba(255,31,92,0.45)" />
              <stop offset="1" stopColor="rgba(43,40,255,0.05)" />
            </linearGradient>
            <linearGradient id="fxStroke" x1="0" x2="1">
              <stop offset="0" stopColor="#FF1F5C" />
              <stop offset="0.5" stopColor="#FFB400" />
              <stop offset="1" stopColor="#2B28FF" />
            </linearGradient>
          </defs>
          <path d="M0,70 C40,68 60,60 90,40 C120,20 150,15 180,35 C210,55 240,80 300,72 L300,100 L0,100 Z" fill="url(#fxFill)" />
          <path d="M0,70 C40,68 60,60 90,40 C120,20 150,15 180,35 C210,55 240,80 300,72" fill="none" stroke="url(#fxStroke)" strokeWidth="2" />
          <circle cx="90" cy="40" r="3.5" fill="#fff" stroke="rgba(255,31,92,0.9)" strokeWidth="1.5" />
          <circle cx="180" cy="35" r="3.5" fill="#fff" stroke="rgba(255,31,92,0.9)" strokeWidth="1.5" />
          <circle cx="240" cy="68" r="3.5" fill="#fff" stroke="rgba(43,40,255,0.9)" strokeWidth="1.5" />
        </svg>
      </div>
      <div className="fx-meters">
        {meters.map((v, i) => (
          <div key={i} className="fx-meter"><span style={{ height: `${v * 100}%` }} /></div>
        ))}
        <div className="fx-gain">
          <div className="cat-label">GR</div>
          <div className="fx-gain-val">-3.4 dB</div>
        </div>
      </div>
    </div>
  );
}

function LibrariesVisual() {
  const packs = [
    { name: "LO-FI ESSENTIALS", count: "142", g: "linear-gradient(135deg,#FF1F5C,#2B28FF)" },
    { name: "TRAP HEAT VOL 3", count: "98", g: "linear-gradient(135deg,#FF003C,#FFB400)" },
    { name: "CINEMATIC STRINGS", count: "76", g: "linear-gradient(135deg,#2B28FF,#13002C)" },
    { name: "HOUSE LOOPS", count: "210", g: "linear-gradient(135deg,#0E0BD1,#FF1F5C)" },
  ];
  return (
    <div className="cat-visual lib-visual" aria-hidden="true">
      <div className="cat-top">
        <span className="cat-chip">PACKS</span>
        <span className="cat-chip">LOOPS</span>
        <span className="cat-chip">ONE-SHOTS</span>
        <span className="cat-chip cat-chip--accent">5,420 FILES</span>
      </div>
      <div className="lib-grid">
        {packs.map((p) => (
          <div key={p.name} className="lib-pack">
            <div className="lib-pack-art" style={{ background: p.g }}>
              <svg viewBox="0 0 80 24" preserveAspectRatio="none" className="lib-pack-wave">
                <path d="M0,12 Q5,2 10,12 T20,12 T30,12 T40,12 T50,12 T60,12 T70,12 T80,12" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="1.2" />
              </svg>
            </div>
            <div className="lib-pack-meta">
              <div className="lib-pack-name">{p.name}</div>
              <div className="cat-label">{p.count} FILES</div>
            </div>
          </div>
        ))}
      </div>
      <div className="lib-bar">
        <span className="cat-label">/ SAMPLE BROWSER</span>
        <div className="lib-bar-dots"><span /><span /><span /></div>
      </div>
    </div>
  );
}

function SoftwareVisual() {
  const plugins = [
    { name: "Ozone 12", status: "ACTIVE", c: "m" },
    { name: "RX 11", status: "READY", c: "b" },
    { name: "Premiere Pro", status: "RUNNING", c: "m" },
    { name: "Resolve", status: "IDLE", c: "b" },
  ];
  return (
    <div className="cat-visual sw-visual" aria-hidden="true">
      <div className="cat-top">
        <span className="cat-chip">SYSTEM</span>
        <span className="cat-chip">PLUGINS</span>
        <span className="cat-chip cat-chip--accent">v 2026.4</span>
      </div>
      <div className="sw-stats">
        {[
          { l: "CPU", v: "62%", w: "62%" },
          { l: "RAM", v: "7.6 GB", w: "48%" },
          { l: "DISK", v: "812 GB", w: "81%" },
        ].map((s) => (
          <div key={s.l} className="sw-stat">
            <div className="cat-label">{s.l}</div>
            <div className="sw-stat-bar"><span style={{ width: s.w }} /></div>
            <div className="sw-stat-val">{s.v}</div>
          </div>
        ))}
      </div>
      <div className="sw-list">
        {plugins.map((p) => (
          <div key={p.name} className="sw-row">
            <span className={`sw-dot sw-dot-${p.c}`} />
            <span className="sw-name">{p.name}</span>
            <span className="sw-status">{p.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function FreebiesVisual() {
  const items = [
    { name: "VITAL", tag: "SYNTH", g: "linear-gradient(135deg,#0E0BD1,#FF003C)" },
    { name: "TDR NOVA", tag: "EQ", g: "linear-gradient(135deg,#FF003C,#2B28FF)" },
    { name: "STARTER KIT", tag: "PACK", g: "linear-gradient(135deg,#2B28FF,#FF1F5C)" },
  ];
  return (
    <div className="cat-visual free-visual" aria-hidden="true">
      <div className="cat-top">
        <span className="cat-chip">FREE</span>
        <span className="cat-chip">NO CATCH</span>
        <span className="cat-chip cat-chip--accent">$0.00</span>
      </div>
      <div className="free-hero">
        <div className="free-hero-glow" />
        <div className="free-hero-tag">FEATURED FREEBIE</div>
        <div className="free-hero-title">VITAL</div>
        <div className="free-hero-sub">Spectral wavetable synth · Free forever</div>
      </div>
      <div className="free-grid">
        {items.map((i) => (
          <div key={i.name} className="free-card">
            <div className="free-card-art" style={{ background: i.g }} />
            <div className="free-card-name">{i.name}</div>
            <div className="cat-label">{i.tag}</div>
          </div>
        ))}
      </div>
    </div>
  );
}



function ConsolePreviewCard({ product }: { product: Product }) {
  const navigate = useNavigate();
  const [added, setAdded] = useState(false);
  const open = () => navigate({ to: "/shop/p/$slug", params: { slug: product.slug } });
  return (
    <div
      className="console-preview-card"
      onClick={open}
      role="link"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter") open(); }}
    >
      <div className="console-preview-art relative overflow-hidden" style={{ background: product.coverGradient }}>
        {product.coverUrl ? (
          <img src={product.coverUrl} alt={product.name} loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-center p-2">
            <div className="font-display text-base leading-tight">{product.name}</div>
          </div>
        )}
      </div>

      <div className="font-mono text-[10px] tracking-[0.14em] uppercase text-white/60 truncate">
        {product.subType ?? product.category}
      </div>
      <div className="flex items-center justify-between gap-2">
        <div className="font-mono text-sm font-bold">
          {product.isFree ? "FREE" : `$${product.price}`}
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            actions.addToCart(product);
            setAdded(true);
            setTimeout(() => setAdded(false), 1200);
          }}
          className="btn-primary !py-1.5 !px-2.5"
          aria-label={`Add ${product.name} to cart`}
          style={
            added
              ? {
                  background: "linear-gradient(180deg,#2B28FF 0%,#0E0BD1 100%)",
                  boxShadow: "0 8px 24px rgba(14,11,209,0.45)",
                }
              : undefined
          }
        >
          {added ? <Check className="w-3.5 h-3.5" /> : <ShoppingCart className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  );
}

/* ============ SOUNDS OF THE DECADE ============ */



function SoundsOfTheDecade() {
  const { data: allProducts = [] } = usePublishedProducts();
  const { data: bestsellerIds = [] } = useBestsellerIds(20);
  const isInstrument = (p: Product) => (p.category ?? "").toString().toLowerCase() === "instruments";
  const instruments = allProducts.filter(isInstrument);
  const byId = new Map(instruments.map((p) => [p.id!, p]));
  const bestsellerProds = bestsellerIds.map((id) => byId.get(id)).filter(Boolean) as Product[];
  const featuredList = instruments.filter((p) => p.isFeatured);
  const seen = new Set<string>();
  const pool: Product[] = [];
  for (const p of [...bestsellerProds, ...featuredList, ...instruments]) {
    if (!p.slug || seen.has(p.slug)) continue;
    seen.add(p.slug);
    pool.push(p);
  }
  const featured = pool[0] ?? placeholder(0, { name: "FEATURED SOUND", category: "instruments" });
  const supportingReal = pool.slice(1, 4);
  const supporting = supportingReal.length > 0
    ? supportingReal
    : [placeholder(1, { category: "instruments" }), placeholder(2, { category: "instruments" }), placeholder(3, { category: "instruments" })];


  return (
    <section className="px-4 md:px-12 py-16 md:py-24">
      <AuroraTitle className="!mb-2">SOUNDS OF THE DECADE</AuroraTitle>
      <p className="text-center text-white/70 mb-8 text-base md:text-lg max-w-2xl mx-auto">
        Era-defining tools, presets, and plugins for modern producers.
      </p>
      <FadeIn>
        <div className="grid lg:grid-cols-[1.4fr_1fr] gap-6 max-w-6xl mx-auto mt-10">
          {/* Featured */}
          <FeaturedSoundCard product={featured} />
          {/* Supporting */}
          <div className="grid gap-4">
            {supporting.map((p) => (
              <SoundRowCard key={p.slug} product={p} />
            ))}
          </div>
        </div>
      </FadeIn>
    </section>
  );
}

function FeaturedSoundCard({ product }: { product: Product }) {
  const [added, setAdded] = useState(false);
  const onSale = product.compareAtPrice && product.compareAtPrice > product.price;
  return (
    <Link
      to="/shop/p/$slug"
      params={{ slug: product.slug }}
      className="glass-card glass-card--heavy block relative overflow-hidden min-h-[420px]"
    >
      <div className="chromatic-edge" />
      <div className="absolute inset-0" style={{ background: product.coverGradient }}>
        {product.coverUrl && (
          <img src={product.coverUrl} alt={product.name} loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
        )}
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
      <div
        className="absolute inset-0 glow-breathe pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at 60% 40%, rgba(255,0,60,0.35), transparent 65%)",
        }}
      />
      <div className="relative z-10 flex flex-col h-full p-6 md:p-8">
        <div className="flex items-center gap-2">
          <span className="label-mini !text-[var(--accent-red-glow)]">Featured</span>
        </div>
        <div className="mt-auto">
          <div className="label-mini mb-1">{product.maker}</div>
          <h3 className="font-display text-4xl md:text-6xl leading-[0.95] mb-3">{product.name}</h3>
          <p className="text-white/80 max-w-md mb-5 text-sm md:text-base">{product.tagline}</p>
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div className="font-mono">
              <span className="font-bold text-2xl">${product.price}</span>
              {onSale && (
                <span className="ml-2 text-white/40 line-through text-sm">
                  ${product.compareAtPrice}
                </span>
              )}
            </div>
            <button
              onClick={(e) => {
                e.preventDefault();
                actions.addToCart(product);
                setAdded(true);
                setTimeout(() => setAdded(false), 1400);
              }}
              className="btn-primary !py-3 !px-5"
              style={
                added
                  ? {
                      background: "linear-gradient(180deg,#2B28FF 0%,#0E0BD1 100%)",
                      boxShadow: "0 8px 24px rgba(14,11,209,0.45)",
                    }
                  : undefined
              }
            >
              {added ? <><Check className="w-4 h-4" /> ADDED</> : <>ADD TO CART</>}
            </button>
          </div>
        </div>
      </div>
    </Link>
  );
}

function SoundRowCard({ product }: { product: Product }) {
  const [added, setAdded] = useState(false);
  const onSale = product.compareAtPrice && product.compareAtPrice > product.price;
  return (
    <div className="glass-card group relative overflow-hidden">
      <div className="chromatic-edge" />
      <div className="relative z-10 flex gap-3 p-3 items-center">
        <Link
          to="/shop/p/$slug"
          params={{ slug: product.slug }}
          className="w-24 h-24 shrink-0 rounded-xl overflow-hidden relative"
          style={{ background: product.coverGradient }}
        >
          {product.coverUrl ? (
            <img src={product.coverUrl} alt={product.name} loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-center p-1">
              <div className="font-display text-sm leading-tight">{product.name}</div>
            </div>
          )}
        </Link>
        <div className="flex-1 min-w-0">
          <div className="label-mini mb-1">{product.maker}</div>
          <Link
            to="/shop/p/$slug"
            params={{ slug: product.slug }}
            className="block font-display text-lg leading-tight truncate hover:text-white"
          >
            {product.name}
          </Link>
          <div className="font-mono text-xs mt-1">
            <span className="font-bold">${product.price}</span>
            {onSale && (
              <span className="ml-2 text-white/40 line-through">${product.compareAtPrice}</span>
            )}
          </div>
        </div>
        <button
          onClick={() => {
            actions.addToCart(product);
            setAdded(true);
            setTimeout(() => setAdded(false), 1400);
          }}
          className="btn-primary !py-2 !px-3"
          aria-label="Add to cart"
          style={
            added
              ? {
                  background: "linear-gradient(180deg,#2B28FF 0%,#0E0BD1 100%)",
                  boxShadow: "0 8px 24px rgba(14,11,209,0.45)",
                }
              : undefined
          }
        >
          {added ? <Check className="w-4 h-4" /> : <ShoppingCart className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}

/* ============ PLUGIN OF THE WEEK (wide spotlight) ============ */

function getPluginOfTheWeekIndex(): number {
  // Rotate every Monday at 12:00 America/Chicago (CST/CDT handled by locale conversion).
  const nowChicago = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Chicago" }));
  const day = nowChicago.getDay(); // 0=Sun, 1=Mon
  const hour = nowChicago.getHours();
  let daysSinceMon = (day + 6) % 7; // Mon=0, Tue=1, ... Sun=6
  if (daysSinceMon === 0 && hour < 12) daysSinceMon = 7; // before noon Mon = last week's pick
  const monday = new Date(nowChicago);
  monday.setDate(nowChicago.getDate() - daysSinceMon);
  monday.setHours(12, 0, 0, 0);
  return Math.floor(monday.getTime() / (7 * 24 * 60 * 60 * 1000));
}

function PluginOfTheWeek() {
  const { data: allProducts = [] } = usePublishedProducts();
  const { data: bestsellerIds = [] } = useBestsellerIds(20);
  const byId = new Map(allProducts.map((p) => [p.id!, p]));
  const bestsellers = bestsellerIds.map((id) => byId.get(id)).filter(Boolean) as Product[];
  const featuredPool = allProducts.filter((p) => p.isFeatured);
  // Prefer bestsellers → featured → all published. Dedupe so the pool doesn't repeat.
  const seen = new Set<string>();
  const candidates: Product[] = [];
  for (const p of [...bestsellers, ...featuredPool, ...allProducts]) {
    if (!p.id || seen.has(p.id)) continue;
    seen.add(p.id);
    candidates.push(p);
  }
  const weekIndex = getPluginOfTheWeekIndex();
  const featured = candidates.length > 0
    ? candidates[weekIndex % candidates.length]
    : placeholder(0, { name: "PLUGIN OF THE WEEK" });
  const { finalPrice, pct } = useSalePricing(featured);
  const [added, setAdded] = useState(false);
  const hasCompareAt = !!(featured.compareAtPrice && featured.compareAtPrice > featured.price);
  const strikePrice = hasCompareAt ? featured.compareAtPrice! : (pct > 0 ? featured.price : undefined);
  const displayPrice = pct > 0 ? finalPrice : featured.price;
  const savings = strikePrice ? Math.round((strikePrice - displayPrice) * 100) / 100 : 0;
  const description = featured.description?.trim() || featured.tagline?.trim() ||
    "A producer-ready pick from the vault — refreshed every week.";


  return (
    <section className="px-4 md:px-12 py-16 md:py-24">
      <AuroraTitle>PLUGIN OF THE WEEK</AuroraTitle>
      <FadeIn>
        <div className="max-w-6xl mx-auto relative">
          <div className="spin-glow" />
          <div className="glass-card glass-card--heavy p-5 md:p-8 relative">
            <div className="chromatic-edge" />
            <div className="grid lg:grid-cols-[1.1fr_1fr] gap-6 md:gap-10 items-center">
              {/* Artwork */}
              <Link
                to="/shop/p/$slug"
                params={{ slug: featured.slug }}
                className="relative aspect-square rounded-2xl overflow-hidden block group"
                style={{ background: featured.coverGradient }}
              >
                {featured.coverUrl ? (
                  <img src={featured.coverUrl} alt={featured.name} className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-center">
                    <div>
                      <div className="label-mini mb-2">{featured.maker}</div>
                      <div className="font-display text-5xl md:text-7xl">{featured.name}</div>
                    </div>
                  </div>
                )}
                <div
                  className="absolute inset-0 glow-breathe pointer-events-none"
                  style={{
                    background:
                      "radial-gradient(ellipse at center, rgba(255,0,60,0.45), transparent 65%)",
                  }}
                />
              </Link>

              {/* Right */}
              <div className="text-left">
                <div className="label-mini !text-[var(--accent-red-glow)] mb-2">Plugin of the Week</div>
                <Link
                  to="/shop/p/$slug"
                  params={{ slug: featured.slug }}
                  className="font-display text-5xl md:text-6xl leading-[0.95] inline-block hover:text-white"
                >
                  {featured.name}
                </Link>
                <p className="text-white/80 mt-4 max-w-md leading-relaxed">
                  {description}
                </p>

                <div className="flex items-baseline gap-3 mt-5">
                  <span className="font-mono text-4xl font-bold text-red">
                    {featured.isFree ? "FREE" : `$${displayPrice.toFixed(2)}`}
                  </span>
                  {strikePrice && !featured.isFree && (
                    <>
                      <span className="font-mono text-white/40 line-through text-lg">
                        ${strikePrice}
                      </span>
                      <span className="font-mono text-xs px-2 py-1 rounded-md bg-[var(--accent-red)]/20 border border-[var(--accent-red)]/40 text-[var(--accent-red-glow)]">
                        SAVE ${savings.toFixed(2)}
                      </span>
                    </>
                  )}
                </div>

                <div className="flex flex-wrap gap-3 mt-6">
                  <button
                    onClick={() => {
                      actions.addToCart(featured);
                      setAdded(true);
                      setTimeout(() => setAdded(false), 1500);
                    }}
                    className="btn-primary !text-base !py-4 !px-7"
                    style={
                      added
                        ? {
                            background: "linear-gradient(180deg,#2B28FF 0%,#0E0BD1 100%)",
                            boxShadow: "0 8px 24px rgba(14,11,209,0.45)",
                          }
                        : undefined
                    }
                  >
                    {added ? (
                      <>
                        <Check className="w-4 h-4" /> ADDED TO CART
                      </>
                    ) : (
                      <>
                        ADD TO CART
                        <ShoppingCart className="w-4 h-4" />
                      </>
                    )}
                  </button>
                  <Link
                    to="/shop/p/$slug"
                    params={{ slug: featured.slug }}
                    className="btn-ghost !text-base !py-4 !px-7"
                  >
                    VIEW DETAILS
                  </Link>
                </div>

                <p className="label-mini mt-5 max-w-md">
                  Instant access. Secure checkout. Producer-ready tools at a fraction of retail.
                </p>
              </div>
            </div>
          </div>
        </div>
      </FadeIn>
    </section>
  );
}

/* ============ THE DIFFERENCE (dark glass) ============ */

function Difference() {
  const items = [
    {
      t: "DELIVERED FAST",
      d: "Get your plugins without waiting around.",
      Icon: Zap,
    },
    {
      t: "YOURS FOREVER",
      d: "No subscription games. Keep what you buy.",
      Icon: InfinityIcon,
    },
    {
      t: "WORKS WITH YOUR SETUP",
      d: "VST, AU, WAV, or whatever your DAW speaks.",
      Icon: Plug,
    },
  ];
  return (
    <section className="px-4 md:px-12 py-16 md:py-24">
      <AuroraTitle>THE DIFFERENCE</AuroraTitle>
      <FadeIn>
        <div className="grid md:grid-cols-3 gap-6 md:gap-8 pt-4 max-w-6xl mx-auto">
          {items.map(({ t, d, Icon }) => (
            <div key={t} className="difference-card-dark group">
              <Icon className="diff-icon-dark" strokeWidth={2.2} aria-hidden />
              <h3 className="font-display text-2xl leading-tight mb-3">{t}</h3>
              <p className="text-white/75 leading-relaxed">{d}</p>
            </div>
          ))}
        </div>
      </FadeIn>
    </section>
  );
}

/* ============ NEWSLETTER ============ */

function Newsletter() {
  return (
    <section className="px-4 md:px-12 py-16 md:py-24">
      <div className="max-w-2xl mx-auto">
        <GlassCard variant="heavy" className="p-10 md:p-14 text-center">
          <AuroraTitle as="h2" className="!mb-2">
            GET DROPS BEFORE THEY HIT.
          </AuroraTitle>
          <p className="text-white/75 mb-8">
            Plug in before everyone else. New tools, early deals, and producer-ready drops.
          </p>
          <form
            className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto"
            onSubmit={(e) => e.preventDefault()}
          >
            <input
              type="email"
              placeholder="you@email.com"
              className="input-glass flex-1"
              required
            />
            <button type="submit" className="btn-primary">
              SUBSCRIBE →
            </button>
          </form>
        </GlassCard>
      </div>
    </section>
  );
}
