import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
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
} from "lucide-react";
import {
  bestsellerProducts,
  recentProducts,
  categories,
  SALE,
  products,
  getProductBySlug,
  type Product,
} from "@/lib/mock-data";
import { actions, useStore } from "@/lib/store";

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
  const cover1 = useRef<HTMLDivElement>(null);
  const cover2 = useRef<HTMLDivElement>(null);
  const cover3 = useRef<HTMLDivElement>(null);

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
          <div className="label-mini mb-6">
            <span className="text-red">Summer Tropical Steals</span> — active
          </div>
          <h1
            className="font-display leading-[0.92] tracking-tight mb-6"
            style={{ fontSize: "clamp(3rem, 8vw, 6.5rem)" }}
          >
            <span className="block text-red">35% OFF.</span>
            <span className="block">EVERYTHING.</span>
            <span className="block">
              UNTIL <span className="text-red">SEPT 22.</span>
            </span>
          </h1>
          <p className="text-lg md:text-xl text-white/80 max-w-xl mb-4 leading-relaxed">
            Pre-order plugins at a <span className="text-red">fraction of retail</span>. Build your
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
              LEVEL UP →
            </Link>
            <Link to="/shop" className="btn-ghost !text-base !py-4 !px-8">
              WATCH NOW
            </Link>
          </div>
        </div>

        <div className="relative h-[420px] md:h-[520px] hidden lg:block">
          {[
            { p: products.find((p) => p.slug === "serum")!, pos: "top-0 left-8", rot: "-6deg", ref: cover1, z: 1 },
            {
              p: products.find((p) => p.slug === "ozone-12")!,
              pos: "top-20 left-1/3",
              rot: "4deg",
              ref: cover2,
              z: 3,
            },
            {
              p: products.find((p) => p.slug === "omnisphere")!,
              pos: "top-8 right-0",
              rot: "-2deg",
              ref: cover3,
              z: 2,
            },
          ].map((c, i) => (
            <div
              key={i}
              ref={c.ref}
              className={`absolute ${c.pos} w-64`}
              style={{ zIndex: c.z, transform: `rotate(${c.rot})` }}
            >
              <div className="glass-card glass-card--heavy p-3 relative">
                <div className="chromatic-edge" />
                <div
                  className="absolute inset-0 glow-breathe pointer-events-none rounded-3xl"
                  style={{
                    background:
                      "radial-gradient(ellipse at center, rgba(255,0,60,0.6), transparent 70%)",
                    filter: "blur(20px)",
                    zIndex: -1,
                  }}
                />
                <div
                  className="relative z-10 aspect-square rounded-2xl overflow-hidden"
                  style={{ background: c.p.coverGradient }}
                >
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="label-mini mb-2">{c.p.maker}</div>
                      <div className="font-display text-3xl">{c.p.name}</div>
                    </div>
                  </div>
                  <div className="absolute top-2 right-2 px-2 py-1 rounded-md font-mono text-[10px] font-bold bg-[var(--accent-red)] text-white">
                    35% OFF
                  </div>
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
    <div className="relative overflow-hidden border-y border-white/10 marquee-pause">
      <div
        className="h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent, #FF1F5C, #2B28FF, #FF1F5C, transparent)",
        }}
      />
      <div className="py-4 overflow-hidden">
        <div className="marquee-track flex gap-16 whitespace-nowrap text-base md:text-lg uppercase">
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
  const list = (bestsellerProducts.length >= 5 ? bestsellerProducts : recentProducts).slice(0, 8);
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
  const onSale = product.compareAtPrice && product.compareAtPrice > product.price;
  const savings = onSale ? Math.round(((product.compareAtPrice! - product.price) / product.compareAtPrice!) * 100) : 0;
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
        <div className="absolute inset-0 flex items-center justify-center p-4 text-center">
          <div>
            <div className="label-mini mb-1">{product.maker}</div>
            <div className="font-display text-3xl leading-tight">{product.name}</div>
          </div>
        </div>
        <div
          className="absolute inset-0 glow-breathe pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(255,0,60,0.28), transparent 65%)",
          }}
        />
        {onSale && (
          <div className="absolute top-3 right-3 px-2 py-1 rounded-md font-mono text-[10px] font-bold bg-[var(--accent-red)] text-white shadow-lg">
            {savings}% OFF
          </div>
        )}
      </div>

      {/* Default minimal state: name + price + cart (top-bottom subtle) */}
      <div className="absolute top-3 left-3 z-10 px-2 py-1 rounded-md bg-black/40 backdrop-blur-sm font-mono text-[10px] tracking-wider text-white/90 pointer-events-none">
        {product.isFree ? "FREE" : `$${product.price}`}
      </div>

      {/* Hover overlay reveals brand/tags/savings + favorite + view details */}
      <div className="rotation-overlay z-10" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="min-w-0">
            <div className="font-mono text-[9px] tracking-[0.15em] text-[var(--accent-red-glow)] mb-1 truncate">
              // {product.maker.toUpperCase()}
            </div>
            <h3 className="font-display text-lg leading-tight truncate">{product.name}</h3>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              actions.toggleWishlist(product.slug);
            }}
            className="p-1.5 rounded-full hover:bg-white/10 transition shrink-0"
            aria-label={wished ? "Remove from saved" : "Save"}
          >
            <Heart
              className={`w-4 h-4 ${wished ? "fill-[var(--accent-red)] text-[var(--accent-red)]" : "text-white/85"}`}
            />
          </button>
        </div>

        <div className="flex flex-wrap gap-1 mb-2">
          {product.formats.slice(0, 3).map((f) => (
            <span
              key={f}
              className="font-mono text-[9px] tracking-wider px-1.5 py-0.5 rounded-full border border-white/15 text-white/70"
            >
              {f}
            </span>
          ))}
        </div>

        <div className="flex items-end justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-baseline gap-2">
              <span className="font-mono font-bold text-base">
                {product.isFree ? "FREE" : `$${product.price}`}
              </span>
              {onSale && (
                <span className="font-mono text-xs text-white/40 line-through">
                  ${product.compareAtPrice}
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
    a: "soundtoys-5",
    b: "pro-q-4",
    outcome: "Clean fkn mix.",
    description:
      "Cleaner EQ moves, tighter control, better balance, and a polished mix chain without overthinking it.",
    useFor: "Vocals, beats, full mixes, mastering prep.",
  },
  {
    a: "serum",
    b: "omnisphere",
    outcome: "Melodies that don't sound stock.",
    description:
      "Serum gives you sharp modern synths. Omnisphere adds texture, depth, pads, keys, and cinematic layers.",
    useFor: "Melodies, hooks, ambient layers, trap, R&B, EDM, film-style production.",
  },
  {
    a: "kontakt-7",
    b: "splice-essentials",
    outcome: "Full tracks without empty gaps.",
    description:
      "Kontakt gives you playable instruments. Splice Essentials fills in drums, loops, one-shots, textures, and quick ideas.",
    useFor: "Starting ideas, filling arrangements, adding layers, speeding up workflow.",
  },
];

function PluginRecipes() {
  const [index, setIndex] = useState(0);
  const len = RECIPES.length;

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
            {RECIPES.map((r, i) => {
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
            {RECIPES.map((r, i) => (
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
  const a = getProductBySlug(recipe.a);
  const b = getProductBySlug(recipe.b);
  const [added, setAdded] = useState(false);
  if (!a || !b) return null;

  const total = a.price + b.price;
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
        <div className="absolute inset-0 flex items-center justify-center text-center p-2">
          <div>
            <div className="label-mini !text-[0.55rem] mb-1">{product.maker}</div>
            <div className="font-display text-base leading-tight">{product.name}</div>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[10px] text-white/65 inline-flex items-center gap-1">
          VIEW PRODUCT <ArrowUpRight className="w-3 h-3" />
        </span>
        <span className="font-mono text-xs font-bold">${product.price}</span>
      </div>
    </div>
  );
}

/* ============ BROWSE THE VAULT — SOUND CONSOLE TABS ============ */

import {
  Piano,
  Sliders,
  Library,
  AudioWaveform,
  AppWindow,
  Gift,
} from "lucide-react";

type VaultTab = {
  slug: "instruments" | "effects" | "libraries" | "daws" | "software" | "freebies";
  label: string;
  title: string;
  description: string;
  chips: string[];
  ctaLabel: string;
  bg: string;
  Icon: typeof Piano;
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
  const active = VAULT_TABS.find((t) => t.slug === activeSlug) ?? VAULT_TABS[3];
  const count = categories.find((c) => c.slug === active.slug)?.count ?? 0;
  const previews = products.filter((p) => p.category === active.slug).slice(0, 4);

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

          <div
            key={active.slug}
            id={`vault-panel-${active.slug}`}
            role="tabpanel"
            className="console-panel console-fade-in"
          >
            <div className="console-panel-bg" style={{ background: active.bg }} />
            <div className="console-panel-scrim" />
            <div className="console-panel-grid">
              {/* Left */}
              <div className="flex flex-col">
                <div className="label-mini !text-[var(--accent-red-glow)] mb-2">
                  Category
                </div>
                <h3 className="font-display text-4xl md:text-5xl leading-[0.95] uppercase mb-3">
                  {active.title}
                </h3>
                <p className="text-white/80 text-sm md:text-base leading-relaxed mb-4 max-w-md">
                  {active.description}
                </p>
                <div className="flex flex-wrap gap-1.5 mb-5">
                  {active.chips.map((c) => (
                    <span key={c} className="console-chip">{c}</span>
                  ))}
                </div>
                <div className="font-mono text-xs tracking-[0.15em] uppercase text-white/60 mb-5">
                  {count} {active.label} Tools
                </div>
                <Link
                  to="/shop/$category"
                  params={{ category: active.slug }}
                  className="btn-primary !text-sm !py-3 !px-5 console-cta self-start"
                >
                  {active.ctaLabel}
                  <span className="console-cta-arrow">→</span>
                </Link>
              </div>

              {/* Right */}
              <div>
                <div className="label-mini mb-3">Featured in {active.label}</div>
                <div className="console-preview-grid">
                  {previews.map((p) => (
                    <ConsolePreviewCard key={p.slug} product={p} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </FadeIn>
    </section>
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
      <div className="console-preview-art" style={{ background: product.coverGradient }}>
        <div className="absolute inset-0 flex items-center justify-center text-center p-2">
          <div>
            <div className="label-mini !text-[0.55rem] mb-1">{product.maker}</div>
            <div className="font-display text-base leading-tight">{product.name}</div>
          </div>
        </div>
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

const SOUND_TAGS = [
  "Modern Trap",
  "Bedroom Pop",
  "2010s EDM",
  "Analog Revival",
  "Vocal Chain",
  "808 Essentials",
];

function SoundsOfTheDecade() {
  // 1 featured + 3 supporting
  const featured = getProductBySlug("omnisphere") || recentProducts[0];
  const supporting = recentProducts.filter((p) => p.slug !== featured.slug).slice(0, 3);

  return (
    <section className="px-4 md:px-12 py-16 md:py-24">
      <AuroraTitle className="!mb-2">SOUNDS OF THE DECADE</AuroraTitle>
      <p className="text-center text-white/70 mb-8 text-base md:text-lg max-w-2xl mx-auto">
        Era-defining tools, presets, and plugins for modern producers.
      </p>
      <FadeIn>
        <div className="flex flex-wrap justify-center gap-2 mb-10">
          {SOUND_TAGS.map((t) => (
            <span
              key={t}
              className="font-mono text-[10px] tracking-[0.15em] uppercase px-3 py-1.5 rounded-full border border-white/15 text-white/75 hover:border-[var(--accent-red-glow)] hover:text-white transition cursor-default"
            >
              {t}
            </span>
          ))}
        </div>

        <div className="grid lg:grid-cols-[1.4fr_1fr] gap-6 max-w-6xl mx-auto">
          {/* Featured */}
          <FeaturedSoundCard product={featured} tag="Analog Revival" />
          {/* Supporting */}
          <div className="grid gap-4">
            {supporting.map((p, i) => (
              <SoundRowCard key={p.slug} product={p} tag={SOUND_TAGS[(i + 1) % SOUND_TAGS.length]} />
            ))}
          </div>
        </div>
      </FadeIn>
    </section>
  );
}

function FeaturedSoundCard({ product, tag }: { product: Product; tag: string }) {
  const [added, setAdded] = useState(false);
  const onSale = product.compareAtPrice && product.compareAtPrice > product.price;
  return (
    <Link
      to="/shop/p/$slug"
      params={{ slug: product.slug }}
      className="glass-card glass-card--heavy block relative overflow-hidden min-h-[420px]"
    >
      <div className="chromatic-edge" />
      <div className="absolute inset-0" style={{ background: product.coverGradient }} />
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
          <span className="font-mono text-[10px] tracking-[0.15em] uppercase px-2 py-0.5 rounded-full border border-white/20 text-white/80">
            {tag}
          </span>
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

function SoundRowCard({ product, tag }: { product: Product; tag: string }) {
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
          <div className="absolute inset-0 flex items-center justify-center text-center p-1">
            <div className="font-display text-sm leading-tight">{product.name}</div>
          </div>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-[9px] tracking-[0.15em] uppercase text-[var(--accent-red-glow)]">
              {tag}
            </span>
          </div>
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

function PluginOfTheWeek() {
  const featured = getProductBySlug("omnisphere") || products[0];
  const [added, setAdded] = useState(false);
  const onSale = featured.compareAtPrice && featured.compareAtPrice > featured.price;
  const savings = onSale ? featured.compareAtPrice! - featured.price : 0;

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
                <div className="absolute inset-0 flex items-center justify-center text-center">
                  <div>
                    <div className="label-mini mb-2">{featured.maker}</div>
                    <div className="font-display text-5xl md:text-7xl">{featured.name}</div>
                  </div>
                </div>
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
                  A deep sound source for pads, keys, textures, leads, and cinematic layers.
                </p>

                <div className="flex items-baseline gap-3 mt-5">
                  <span className="font-mono text-4xl font-bold text-red">${featured.price}</span>
                  {onSale && (
                    <>
                      <span className="font-mono text-white/40 line-through text-lg">
                        ${featured.compareAtPrice}
                      </span>
                      <span className="font-mono text-xs px-2 py-1 rounded-md bg-[var(--accent-red)]/20 border border-[var(--accent-red)]/40 text-[var(--accent-red-glow)]">
                        SAVE ${savings}
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
