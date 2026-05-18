import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Heart, Share2 } from "lucide-react";
import { getProductBySlug, products, SALE } from "@/lib/mock-data";
import { GlassCard } from "@/components/GlassCard";
import { ProductCard } from "@/components/ProductCard";
import { actions } from "@/lib/store";

export const Route = createFileRoute("/shop/p/$slug")({
  beforeLoad: ({ params }) => {
    if (!getProductBySlug(params.slug)) throw notFound();
  },
  head: ({ params }) => {
    const p = getProductBySlug(params.slug);
    return { meta: [{ title: `${p?.name} — Plugin Warehouse` }, { name: "description", content: p?.tagline }] };
  },
  component: ProductDetail,
});

function ProductDetail() {
  const { slug } = Route.useParams();
  const p = getProductBySlug(slug)!;
  const onSale = p.compareAtPrice && p.compareAtPrice > p.price;
  const showDawLine = !["software", "daws"].includes(p.category);
  const related = products.filter((x) => x.category === p.category && x.slug !== p.slug).slice(0, 4);

  return (
    <div className="px-4 md:px-12 pb-16">
      <nav className="font-mono text-xs text-white/50 my-6">
        <Link to="/shop" className="hover:text-white">Warehouse</Link> / <Link to="/shop/$category" params={{ category: p.category }} className="hover:text-white capitalize">{p.category}</Link> / <span className="text-white">{p.name}</span>
      </nav>

      <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-10 items-start">
        {/* Cover */}
        <div className="relative">
          <div className="absolute inset-0 glow-breathe pointer-events-none" style={{ background: "radial-gradient(ellipse at center, rgba(255,0,60,0.45), transparent 65%)", filter: "blur(40px)" }} />
          <div className="absolute inset-0 glow-breathe-2 pointer-events-none" style={{ background: "radial-gradient(ellipse at 60% 40%, rgba(255,0,60,0.35), transparent 70%)", filter: "blur(60px)" }} />
          <div className="relative">
            <GlassCard variant="heavy" className="p-4">
              <div className="aspect-square rounded-2xl overflow-hidden" style={{ background: p.coverGradient }}>
                <div className="h-full w-full flex flex-col items-center justify-center">
                  <div className="font-mono text-xs text-white/60 mb-3 tracking-[0.25em]">// {p.maker.toUpperCase()}</div>
                  <div className="font-black chrome-text text-center px-6" style={{ fontSize: "clamp(2.5rem,6vw,4.5rem)", lineHeight: 1 }}>{p.name}</div>
                  <div className="font-mono text-xs text-white/50 mt-4 tracking-[0.2em]">VERSION {p.version}</div>
                </div>
              </div>
            </GlassCard>
          </div>
        </div>

        {/* Decision col */}
        <div>
          <div className="font-mono text-xs tracking-[0.2em] text-[var(--accent-red-glow)] mb-2">// {p.maker.toUpperCase()}</div>
          <h1 className="font-black chrome-text leading-[0.95] mb-3" style={{ fontSize: "clamp(2.5rem, 5vw, 4rem)" }}>{p.name}</h1>
          <p className="text-white/70 italic text-lg mb-6">{p.tagline}</p>

          <div className="flex flex-wrap gap-2 mb-6">
            {p.daws.slice(0, 4).map((d) => <Pill key={d}>{d}</Pill>)}
            {p.formats.map((f) => <Pill key={f}>{f}</Pill>)}
          </div>

          <div className="mb-6">
            {onSale && <div className="font-mono text-lg text-white/40 line-through">${p.compareAtPrice}</div>}
            <div className="font-mono font-black" style={{ fontSize: "clamp(3rem, 5vw, 4.5rem)", lineHeight: 1 }}>{p.isFree ? "FREE" : `$${p.price}`}</div>
            {SALE.active && onSale && (
              <div className="mt-3 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[var(--accent-red)]/15 border border-[var(--accent-red)]/40 font-mono text-xs">
                🌴 35% OFF AT CHECKOUT — ENDS {SALE.endsLabel.toUpperCase()}
              </div>
            )}
          </div>

          <button onClick={() => actions.addToCart(p)} className="btn-primary w-full !py-4 !text-base mb-3">LOAD UP →</button>
          <div className="grid grid-cols-2 gap-3 mb-6">
            <button onClick={() => actions.toggleWishlist(p.slug)} className="btn-ghost"><Heart className="w-4 h-4" /> SAVE</button>
            <button className="btn-ghost"><Share2 className="w-4 h-4" /> SHARE</button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <Meta label="VERSION" value={p.version} />
            <Meta label="FILE SIZE" value={p.fileSize} />
            <Meta label="FORMATS" value={p.formats.slice(0, 2).join(" / ")} />
            <Meta label="UPDATED" value={p.updated} />
          </div>

          {showDawLine && <div className="font-mono text-xs text-white/50">// Your DAW's been waiting for this.</div>}
        </div>
      </div>

      {/* Below */}
      <section className="mt-20 grid md:grid-cols-2 gap-6">
        <GlassCard className="p-8">
          <h2 className="font-black uppercase tracking-wider text-2xl mb-4 chrome-text">WHAT IT IS</h2>
          <p className="text-white/70 leading-relaxed">{p.description}</p>
        </GlassCard>
        <GlassCard className="p-8">
          <h2 className="font-black uppercase tracking-wider text-2xl mb-4 chrome-text">WHAT YOU NEED</h2>
          <div className="grid grid-cols-2 gap-6 text-sm">
            <div>
              <div className="font-mono text-xs text-white/40 mb-2">MAC</div>
              <p className="text-white/70">macOS 11+ · Intel or Apple Silicon · 4 GB RAM</p>
            </div>
            <div>
              <div className="font-mono text-xs text-white/40 mb-2">PC</div>
              <p className="text-white/70">Windows 10+ · 4 GB RAM · 64-bit DAW</p>
            </div>
          </div>
        </GlassCard>
      </section>

      <section className="mt-12">
        <GlassCard className="p-8">
          <h2 className="font-black uppercase tracking-wider text-2xl mb-2 chrome-text">HOW TO INSTALL</h2>
          <p className="text-white/60 mb-6 font-mono text-sm">60 seconds. Promise.</p>
          <ol className="space-y-4">
            {["Download the installer from your library.", "Run the installer — defaults are fine.", "Authorize with your Plugin Warehouse account.", "Open your DAW. Load the plugin. Make heat."].map((step, i) => (
              <li key={i} className="flex gap-4">
                <span className="font-black text-2xl chrome-text shrink-0 w-10">{String(i + 1).padStart(2, "0")}</span>
                <span className="text-white/75 pt-1">{step}</span>
              </li>
            ))}
          </ol>
        </GlassCard>
      </section>

      <section className="mt-16">
        <div className="font-mono text-xs tracking-[0.2em] text-[var(--accent-red-glow)] mb-3">// IF YOU LIKE THIS</div>
        <h2 className="section-header chrome-text">MORE HEAT</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {related.map((r) => <ProductCard key={r.slug} product={r} />)}
        </div>
      </section>
    </div>
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
