import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, Check, Heart, Share2, ShoppingCart } from "lucide-react";

import { useQuery } from "@tanstack/react-query";
import type { Category, Product } from "@/lib/mock-data";
import { SALE } from "@/lib/mock-data";
import { GlassCard } from "@/components/GlassCard";
import { ProductCard } from "@/components/ProductCard";
import { actions, useStore } from "@/lib/store";
import { supabase } from "@/integrations/supabase/client";
import { useSavedIds, useToggleSaved } from "@/hooks/useSaved";
import { useSalePricing } from "@/lib/sale-pricing";

async function fetchProductMeta(slug: string) {
  const { data } = await supabase
    .from("products")
    .select("name,maker,tagline,description,category,cover_url,price,is_free")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  return data as { name: string; maker: string | null; tagline: string | null; description: string | null; category: string; cover_url: string | null; price: number | null; is_free: boolean | null } | null;
}



export const Route = createFileRoute("/shop/p/$slug")({
  loader: async ({ params }) => ({ meta: await fetchProductMeta(params.slug) }),
  head: ({ params, loaderData }) => {
    const m = loaderData?.meta;
    const title = m ? `${m.maker ? `${m.maker} ` : ""}${m.name} — Plugin Warehouse` : `${params.slug} — Plugin Warehouse`;
    const rawDesc = m?.tagline || m?.description || "";
    const clean = rawDesc.replace(/\s+/g, " ").trim();
    const desc = clean
      ? (clean.length > 158 ? `${clean.slice(0, 155)}...` : clean)
      : `${m?.name ?? params.slug} — pro audio ${m?.category ?? "plugin"} at a fraction of retail. Instant download. Lifetime license.`;
    const url = `https://www.thepluginwarehouse.com/shop/p/${params.slug}`;
    const meta: Array<Record<string, string>> = [
      { title },
      { name: "description", content: desc },
      { property: "og:title", content: title },
      { property: "og:description", content: desc },
      { property: "og:type", content: "product" },
      { property: "og:url", content: url },
    ];
    if (m?.cover_url) {
      meta.push({ property: "og:image", content: m.cover_url });
      meta.push({ name: "twitter:image", content: m.cover_url });
    }
    const price = m?.is_free ? 0 : Number(m?.price ?? 0);
    const productLd = m
      ? {
          "@context": "https://schema.org",
          "@type": "Product",
          name: m.name,
          description: clean || desc,
          ...(m.maker ? { brand: { "@type": "Brand", name: m.maker } } : {}),
          ...(m.cover_url ? { image: m.cover_url } : {}),
          category: m.category,
          url,
          offers: {
            "@type": "Offer",
            price: price.toFixed(2),
            priceCurrency: "USD",
            availability: "https://schema.org/InStock",
            url,
            itemCondition: "https://schema.org/NewCondition",
          },
        }
      : null;
    return {
      meta,
      links: [{ rel: "canonical", href: url }],
      ...(productLd
        ? { scripts: [{ type: "application/ld+json", children: JSON.stringify(productLd) }] }
        : {}),
    };
  },
  component: ProductDetail,
});

type Row = {
  id: string;
  slug: string; name: string; maker: string; category: string;
  formats: string[] | null; daws: string[] | null; version: string | null; library_type: string | null;
  price: number; compare_at_price: number | null; description: string | null;
  tagline?: string | null;
  cover_url: string | null; cover_gradient: string | null;
  is_free: boolean | null; updated_at: string;
  file_size: string | null;
};

function toProduct(r: Row): Product {
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    maker: r.maker || "",
    category: r.category as Category,
    daws: r.daws ?? [],
    formats: r.formats ?? [],
    version: r.version ?? "1.0",
    libraryType: r.library_type ?? null,
    fileSize: r.file_size?.trim() || undefined,
    updated: new Date(r.updated_at).toLocaleDateString(undefined, { month: "short", year: "numeric" }),
    price: Number(r.price) || 0,
    compareAtPrice: r.compare_at_price ? Number(r.compare_at_price) : undefined,
    tagline: r.tagline || "",
    description: r.description ?? "",
    coverGradient: r.cover_gradient ?? "linear-gradient(135deg,#3a0a4a,#7b0a5a)",
    coverUrl: r.cover_url,
    isFree: !!r.is_free,
  };
}

async function fetchBySlug(slug: string): Promise<{ product: Product | null; related: Product[] }> {
  const cols = "id,slug,name,maker,category,formats,daws,version,library_type,price,compare_at_price,description,tagline,cover_url,cover_gradient,is_free,updated_at,file_size";

  const { data, error } = await supabase
    .from("products")
    .select(cols)
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return { product: null, related: [] };
  const product = toProduct(data as Row);
  const { data: rel } = await supabase
    .from("products")
    .select(cols)
    .eq("status", "published")
    .eq("category", product.category)
    .neq("slug", product.slug)
    .limit(4);
  return { product, related: (rel as Row[] ?? []).map(toProduct) };
}

function ProductDetail() {
  const { slug } = Route.useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["storefront-product", slug],
    queryFn: () => fetchBySlug(slug),
  });
  const { data: savedIds } = useSavedIds();
  const toggleSaved = useToggleSaved();

  // Hooks must run in a stable order every render — call useSalePricing
  // BEFORE any early return, using a safe fallback until the product loads.
  // (Calling it after the isLoading/not-found returns changes the hook count
  // between renders and throws "Rendered more hooks than during the previous
  // render", which is why the first click errored and only the cached retry worked.)
  const pricingInput = data?.product ?? { price: 0, isFree: false, category: null, id: undefined };
  const { finalPrice, pct } = useSalePricing(pricingInput);

  if (isLoading) return <div className="px-6 py-24 text-center font-mono text-white/50">Loading…</div>;
  if (!data?.product) return <div className="px-6 py-24 text-center"><h1 className="font-black text-3xl mb-2">NOT FOUND</h1><Link to="/shop" className="text-[var(--accent-red-glow)]">Back to the warehouse →</Link></div>;

  const p = data.product;
  const related = data.related;
  const activeSale = pct > 0;
  const hasCompareAt = !!(p.compareAtPrice && p.compareAtPrice > p.price);
  // Strike is always the retail compare-at when set (biggest visible saving);
  // fall back to my price only if there's no compare-at and a sale is on.
  const strike = hasCompareAt ? p.compareAtPrice : (activeSale ? p.price : undefined);
  const shown = activeSale ? finalPrice : p.price;
  const onSale = activeSale || hasCompareAt;

  const showDawLine = !["software", "daws"].includes(p.category);

  return (
    <div className="px-4 md:px-12 pb-16">
      <nav className="font-mono text-xs text-white/50 my-6">
        <Link to="/shop" className="hover:text-white">Warehouse</Link> / <Link to="/shop/$category" params={{ category: p.category }} className="hover:text-white capitalize">{p.category}</Link> / <span className="text-white">{p.name}</span>
      </nav>

      <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-10 items-start">
        <div className="relative">
          <div className="absolute inset-0 glow-breathe pointer-events-none" style={{ background: "radial-gradient(ellipse at center, rgba(255,0,60,0.45), transparent 65%)", filter: "blur(40px)" }} />
          <div className="relative">
            <GlassCard variant="heavy" className="p-4">
              <div className="aspect-square rounded-2xl overflow-hidden relative" style={{ background: p.coverGradient }}>
                {p.coverUrl ? (
                  <img src={p.coverUrl} alt={p.name} className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                  <div className="h-full w-full flex flex-col items-center justify-center">
                    <div className="font-mono text-xs text-white/60 mb-3 tracking-[0.25em]">{p.maker.toUpperCase()}</div>
                    <div className="font-black chrome-text text-center px-6" style={{ fontSize: "clamp(2.5rem,6vw,4.5rem)", lineHeight: 1 }}>{p.name}</div>
                    <div className="font-mono text-xs text-white/50 mt-4 tracking-[0.2em]">{p.category === "libraries" && p.libraryType ? `FOR ${p.libraryType.toUpperCase()}` : `VERSION ${p.version}`}</div>
                  </div>
                )}
              </div>
            </GlassCard>
          </div>
        </div>

        <div>
          <div className="font-mono text-xs tracking-[0.2em] text-[var(--accent-red-glow)] mb-2">{p.maker.toUpperCase()}</div>
          <h1 className="font-black chrome-text leading-[0.95] mb-3" style={{ fontSize: "clamp(2.5rem, 5vw, 4rem)" }}>{p.name}</h1>
          {p.tagline && <p className="text-white/70 italic text-lg mb-6">{p.tagline}</p>}

          <div className="flex flex-wrap gap-2 mb-6">
            {p.daws.slice(0, 4).map((d) => <Pill key={d}>{d}</Pill>)}
            {p.category !== "libraries" && p.formats.map((f) => <Pill key={f}>{f}</Pill>)}
          </div>

          <div className="mb-6">
            {onSale && strike && <div className="font-mono text-lg text-white/40 line-through">${strike}</div>}
            <div className="font-mono font-black" style={{ fontSize: "clamp(3rem, 5vw, 4.5rem)", lineHeight: 1 }}>{p.isFree ? "FREE" : `$${shown.toFixed(2)}`}</div>
          </div>

          <AddToCartButton product={p} />
          <div className="grid grid-cols-2 gap-3 mb-6">
            <button onClick={() => toggleSaved.mutate(p)} className="btn-ghost">
              <Heart className={`w-4 h-4 ${p.id && savedIds?.has(p.id) ? "fill-[var(--accent-red)] text-[var(--accent-red)]" : ""}`} />
              {p.id && savedIds?.has(p.id) ? "SAVED" : "SAVE"}
            </button>
            <button className="btn-ghost"><Share2 className="w-4 h-4" /> SHARE</button>
          </div>

          {(() => {
            const isLib = p.category === "libraries";
            const cells = 1 + (p.fileSize ? 1 : 0) + (isLib ? 0 : 1) + 1;
            const colClass = cells >= 4 ? "md:grid-cols-4" : cells === 3 ? "md:grid-cols-3" : "md:grid-cols-2";
            return (
              <div className={`grid grid-cols-2 ${colClass} gap-3 mb-6`}>
                {isLib && p.libraryType
                  ? <Meta label="LIBRARY TYPE" value={p.libraryType} />
                  : <Meta label="VERSION" value={p.version} />}
                {p.fileSize && <Meta label="FILE SIZE" value={p.fileSize} />}
                {!isLib && <Meta label="FORMATS" value={p.formats.slice(0, 2).join(" / ") || "—"} />}
                <Meta label="UPDATED" value={p.updated} />
              </div>
            );
          })()}

          {p.category === "libraries" && p.libraryType?.toLowerCase() === "kontakt" && (
            <div className="mb-6 rounded-2xl border border-[var(--accent-red-glow)]/30 bg-[var(--accent-red)]/10 backdrop-blur-md p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-[var(--accent-red-glow)] shrink-0 mt-0.5" />
                <div>
                  <div className="font-mono text-xs tracking-wider text-[var(--accent-red-glow)] mb-1">COMPATIBILITY NOTICE</div>
                  <p className="text-sm text-white/80 leading-relaxed">
                    This library only works with the Kontakt version included in your download from Plugin Warehouse. Please use the version we provide — it will not work with other Kontakt installations. Make sure to install our included version to use this library.
                  </p>
                </div>
              </div>
            </div>
          )}

          {showDawLine && <div className="font-mono text-xs text-white/50">Your DAW's been waiting for this.</div>}
        </div>
      </div>

      {p.description && (
        <section className="mt-20">
          <GlassCard className="p-8">
            <h2 className="font-black uppercase tracking-wider text-2xl mb-4 chrome-text">WHAT IT IS</h2>
            <p className="text-white/70 leading-relaxed whitespace-pre-wrap">{p.description}</p>
          </GlassCard>
        </section>
      )}

      {related.length > 0 && (
        <section className="mt-16">
          <div className="font-mono text-xs tracking-[0.2em] text-[var(--accent-red-glow)] mb-3">IF YOU LIKE THIS</div>
          <h2 className="section-header chrome-text">MORE HEAT</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
            {related.map((r) => <ProductCard key={r.slug} product={r} />)}
          </div>
        </section>
      )}
    </div>
  );
}

function AddToCartButton({ product }: { product: Product }) {
  const inCart = useStore((s) => s.cart.some((i) => i.product.slug === product.slug));
  return (
    <button
      onClick={() => actions.addToCart(product)}
      className="btn-primary w-full !py-4 !text-base mb-3 inline-flex items-center justify-center gap-2"
      aria-label={inCart ? "Already in cart" : "Add to cart"}
    >
      {inCart ? <><Check className="w-5 h-5" /> In cart</> : <><ShoppingCart className="w-5 h-5" /> Add to cart</>}
    </button>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return <span className="font-mono text-[10px] tracking-wider px-3 py-1 rounded-full border border-white/15 text-white/65">{children}</span>;
}


function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass-card !rounded-2xl p-3">
      <div className="chromatic-edge" /><div className="glass-noise" />
      <div className="relative z-10">
        <div className="font-mono text-[10px] text-white/40 tracking-wider">{label}</div>
        <div className="font-mono font-bold mt-1 text-sm">{value}</div>
      </div>
    </div>
  );
}

void SALE;
