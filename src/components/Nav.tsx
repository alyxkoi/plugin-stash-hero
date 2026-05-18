import { Link } from "@tanstack/react-router";
import { Search, ShoppingCart, User, Heart, ChevronDown, Menu, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useStore, actions } from "@/lib/store";
import { categories } from "@/lib/mock-data";
import logo from "@/assets/logo.png";

export function Nav() {
  const cart = useStore((s) => s.cart);
  const [scrolled, setScrolled] = useState(false);
  const [catOpen, setCatOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 60);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  useEffect(() => {
    if (!searchOpen) return;
    searchRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setSearchOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [searchOpen]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setMobileOpen(false); };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [mobileOpen]);

  const count = cart.reduce((n, i) => n + i.qty, 0);

  return (
    <>
      <div className="fixed top-3 left-3 right-3 md:top-5 md:left-6 md:right-6 z-50 fade-in">
        <div
          className="glass-card"
          style={{
            backdropFilter: scrolled ? "blur(40px) saturate(180%)" : "blur(28px) saturate(150%)",
            padding: "0.6rem 1rem",
          }}
        >
          <div className="chromatic-edge" />
          <div className="relative z-10 flex items-center gap-3 md:gap-6">
            {/* Logo */}
            <Link to="/" className="flex items-center shrink-0">
              <img src={logo} alt="Plugin Warehouse" className="h-10 md:h-11 w-auto object-contain" style={{ filter: "drop-shadow(0 2px 8px rgba(255,0,60,0.3))" }} />
            </Link>

            {/* Desktop nav */}
            <nav className="hidden lg:flex items-center gap-1 text-sm">
              <div className="relative" onMouseEnter={() => setCatOpen(true)} onMouseLeave={() => setCatOpen(false)}>
                <button className="flex items-center gap-1 px-3 py-2 rounded-full hover:bg-white/5 transition font-display tracking-wider">
                  PLUGINS <ChevronDown className="w-3 h-3" />
                </button>
                {catOpen && (
                  <div className="absolute left-0 top-full pt-3 w-64">
                    <div className="smoked-menu">
                      {categories.map((c) => (
                        <Link key={c.slug} to="/shop/$category" params={{ category: c.slug }} className="smoked-item">
                          <span>{c.name}</span>
                          <span className="font-mono text-xs text-white/40">{c.count}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <Link to="/sale/$slug" params={{ slug: "summer-steals" }} className="px-3 py-2 rounded-full text-red hover:bg-white/5 transition font-display tracking-wider">DEALS</Link>
              <Link to="/shop" search={{ sort: "fresh" } as any} className="px-3 py-2 rounded-full hover:bg-white/5 transition font-display tracking-wider">NEW</Link>
            </nav>

            <div className="flex-1" />

            {/* Right icons — desktop */}
            <div className="hidden md:flex items-center gap-1 shrink-0">
              <button onClick={() => setSearchOpen(true)} aria-label="Search" className="p-2.5 rounded-full hover:bg-white/5 transition">
                <Search className="w-5 h-5" />
              </button>
              <Link to="/account" aria-label="Account" className="p-2.5 rounded-full hover:bg-white/5 transition">
                <User className="w-5 h-5" />
              </Link>
              <Link to="/account/saved" aria-label="Wishlist" className="p-2.5 rounded-full hover:bg-white/5 transition">
                <Heart className="w-5 h-5" />
              </Link>
              <button onClick={() => actions.openCart()} className="relative p-2.5 rounded-full hover:bg-white/5 transition" aria-label={count ? `Cart (${count})` : "Cart"}>
                <ShoppingCart className="w-5 h-5" />
                {count > 0 && (
                  <span className="absolute top-0.5 right-0.5 min-w-[18px] h-[18px] rounded-full bg-[var(--accent-red)] text-white font-mono text-[10px] font-bold flex items-center justify-center px-1">
                    {count}
                  </span>
                )}
              </button>
            </div>

            {/* Mobile/tablet icons */}
            <div className="flex md:hidden items-center gap-1 shrink-0">
              <button onClick={() => setSearchOpen(true)} aria-label="Search" className="p-2.5 rounded-full hover:bg-white/5 transition">
                <Search className="w-5 h-5" />
              </button>
              <button onClick={() => setMobileOpen(true)} aria-label="Open menu" className="p-2.5 rounded-full hover:bg-white/5 transition relative">
                <Menu className="w-5 h-5" />
                {count > 0 && <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[var(--accent-red)]" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Search overlay */}
      {searchOpen && (
        <div className="fixed inset-0 z-[60] fade-in" onClick={() => setSearchOpen(false)}>
          <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" />
          <div className="relative mx-3 md:mx-6 mt-3 md:mt-5 smoked-menu p-4 md:p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <Search className="w-5 h-5 text-white/55" />
              <input
                ref={searchRef}
                placeholder="What are you hunting?"
                className="flex-1 bg-transparent outline-none text-lg md:text-2xl font-display tracking-wider placeholder:text-white/30"
              />
              <button onClick={() => setSearchOpen(false)} aria-label="Close" className="p-2 rounded-full hover:bg-white/10">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="mt-4 pt-4 border-t border-white/10">
              <div className="label-mini mb-2">Suggestions</div>
              <div className="flex flex-wrap gap-2">
                {["Serum", "Pro-Q 4", "Ableton Live", "Omnisphere", "Free Plugins"].map(s => (
                  <button key={s} onClick={() => setSearchOpen(false)} className="px-3 py-1.5 rounded-full border border-white/15 hover:border-[var(--accent-red)] hover:text-red text-sm transition">{s}</button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile slide-in panel */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[60] md:hidden" onClick={() => setMobileOpen(false)}>
          <div className="absolute inset-0 bg-black/55 backdrop-blur-sm fade-in" />
          <aside className="absolute right-0 top-0 bottom-0 w-[88%] max-w-sm smoked-menu !rounded-none !rounded-l-2xl slide-in-right overflow-y-auto" onClick={(e) => e.stopPropagation()} style={{ padding: "1.25rem" }}>
            <div className="flex items-center justify-between mb-5">
              <img src={logo} alt="Plugin Warehouse" className="h-9 w-auto" />
              <button onClick={() => setMobileOpen(false)} aria-label="Close" className="p-2 rounded-full hover:bg-white/10">
                <X className="w-5 h-5" />
              </button>
            </div>
            <input placeholder="What are you hunting?" className="input-glass !rounded-full mb-5" />
            <div className="label-mini mb-2">Categories</div>
            <nav className="flex flex-col mb-4">
              {categories.map(c => (
                <Link key={c.slug} to="/shop/$category" params={{ category: c.slug }} onClick={() => setMobileOpen(false)} className="smoked-item">
                  <span>{c.name}</span>
                  <span className="font-mono text-xs text-white/40">{c.count}</span>
                </Link>
              ))}
            </nav>
            <div className="label-mini mb-2">Shop</div>
            <nav className="flex flex-col mb-4">
              <Link to="/sale/$slug" params={{ slug: "summer-steals" }} onClick={() => setMobileOpen(false)} className="smoked-item"><span className="text-red">DEALS</span></Link>
              <Link to="/shop" search={{ sort: "fresh" } as any} onClick={() => setMobileOpen(false)} className="smoked-item">NEW</Link>
            </nav>
            <div className="label-mini mb-2">You</div>
            <nav className="flex flex-col">
              <Link to="/account" onClick={() => setMobileOpen(false)} className="smoked-item">Account</Link>
              <Link to="/account/saved" onClick={() => setMobileOpen(false)} className="smoked-item">Wishlist</Link>
              <button onClick={() => { setMobileOpen(false); actions.openCart(); }} className="smoked-item w-full"><span>Cart</span>{count > 0 && <span className="font-mono text-xs text-red">{count}</span>}</button>
            </nav>
          </aside>
        </div>
      )}
    </>
  );
}
