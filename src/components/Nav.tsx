import { Link } from "@tanstack/react-router";
import { Search, ShoppingCart, User, Heart, ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";
import { useStore, actions } from "@/lib/store";
import { categories } from "@/lib/mock-data";

export function Nav() {
  const cart = useStore((s) => s.cart);
  const [scrolled, setScrolled] = useState(false);
  const [catOpen, setCatOpen] = useState(false);

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 60);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  const count = cart.reduce((n, i) => n + i.qty, 0);

  return (
    <div className="fixed top-3 left-3 right-3 md:top-5 md:left-6 md:right-6 z-50 fade-in">
      <div
        className="glass-card"
        style={{
          backdropFilter: scrolled ? "blur(40px) saturate(180%)" : "blur(28px) saturate(160%)",
          padding: "0.75rem 1rem",
        }}
      >
        <div className="chromatic-edge" />
        <div className="glass-noise" />
        <div className="relative z-10 flex items-center gap-3 md:gap-6">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 rounded-md flex items-center justify-center" style={{ background: "linear-gradient(135deg,#FF003C,#0E0BD1)" }}>
              <div className="flex gap-[2px] items-end h-4">
                <span className="w-[2px] bg-white h-1" />
                <span className="w-[2px] bg-white h-3" />
                <span className="w-[2px] bg-white h-2" />
                <span className="w-[2px] bg-white h-4" />
                <span className="w-[2px] bg-white h-2" />
              </div>
            </div>
            <div className="leading-none hidden sm:block">
              <div className="font-black text-base tracking-tight">PLUGIN</div>
              <div className="font-mono text-[9px] tracking-[0.25em] text-white/60">WAREHOUSE</div>
            </div>
          </Link>

          {/* Center nav */}
          <nav className="hidden lg:flex items-center gap-1 text-sm font-medium">
            <div className="relative" onMouseEnter={() => setCatOpen(true)} onMouseLeave={() => setCatOpen(false)}>
              <button className="flex items-center gap-1 px-3 py-2 rounded-full hover:bg-white/5 transition">
                PLUGINS <ChevronDown className="w-3 h-3" />
              </button>
              {catOpen && (
                <div className="absolute left-0 top-full pt-3 w-64">
                  <div className="glass-card p-2">
                    <div className="chromatic-edge" /><div className="glass-noise" />
                    <div className="relative z-10">
                      {categories.map((c) => (
                        <Link key={c.slug} to="/shop/$category" params={{ category: c.slug }} className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-white/10 transition">
                          <span className="font-medium">{c.name}</span>
                          <span className="font-mono text-xs text-white/40">{c.count}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
            <Link to="/shop" className="px-3 py-2 rounded-full hover:bg-white/5 transition">BUNDLES</Link>
            <Link to="/sale/$slug" params={{ slug: "summer-steals" }} className="px-3 py-2 rounded-full text-[var(--accent-red-glow)] hover:bg-white/5 transition font-bold">DEALS</Link>
            <Link to="/shop" search={{ sort: "fresh" } as any} className="px-3 py-2 rounded-full hover:bg-white/5 transition">NEW</Link>
          </nav>

          {/* Search */}
          <button onClick={() => actions.openSearch()} className="flex-1 max-w-md flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 hover:border-white/25 transition text-left">
            <Search className="w-4 h-4 text-white/50" />
            <span className="text-sm text-white/40 truncate">What are you hunting?</span>
          </button>

          {/* Right */}
          <div className="flex items-center gap-1 shrink-0">
            <Link to="/login" className="hidden md:flex items-center gap-2 px-3 py-2 rounded-full hover:bg-white/5 transition text-sm">
              <User className="w-4 h-4" /> <span className="hidden lg:inline">ACCOUNT</span>
            </Link>
            <button className="relative p-2 rounded-full hover:bg-white/5 transition">
              <Heart className="w-5 h-5" />
            </button>
            <button onClick={() => actions.openCart()} className="relative p-2 rounded-full hover:bg-white/5 transition" aria-label={count ? `Loaded (${count})` : "Empty. Fix that."}>
              <ShoppingCart className="w-5 h-5" />
              {count > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-[var(--accent-red)] text-white font-mono text-[10px] font-bold flex items-center justify-center px-1">
                  {count}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
