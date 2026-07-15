import { Link, useNavigate } from "@tanstack/react-router";
import { Search, ShoppingCart, User, Heart, ChevronDown, Menu, X, Piano, Waves, BookOpen, AudioLines, AppWindow, Gift } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useStore, actions } from "@/lib/store";
import { categories } from "@/lib/mock-data";
import { usePublishedProducts } from "@/hooks/useProducts";
import logo from "@/assets/logo.png";

const catIcons: Record<string, typeof Piano> = {
  instruments: Piano,
  effects: Waves,
  libraries: BookOpen,
  daws: AudioLines,
  software: AppWindow,
  freebies: Gift,
};

export function Nav() {
  const cart = useStore((s) => s.cart);
  const [scrolled, setScrolled] = useState(false);
  const [catOpen, setCatOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerClosing, setDrawerClosing] = useState(false);
  const reduce = useReducedMotion();
  const closeDrawer = () => {
    setDrawerClosing(true);
    window.setTimeout(() => { setDrawerOpen(false); setDrawerClosing(false); }, 360);
  };
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { data: allProducts = [] } = usePublishedProducts();

  const suggestions = useMemo(() => {
    const q = searchQ.trim().toLowerCase();
    if (!q) return [];
    const starts: typeof allProducts = [];
    const contains: typeof allProducts = [];
    for (const p of allProducts) {
      const n = p.name.toLowerCase();
      if (n.startsWith(q)) starts.push(p);
      else if (n.includes(q) || p.maker.toLowerCase().includes(q)) contains.push(p);
    }
    return [...starts, ...contains].slice(0, 8);
  }, [searchQ, allProducts]);

  const closeSearch = () => { setSearchOpen(false); setSearchQ(""); };
  const goToProduct = (slug: string) => { closeSearch(); navigate({ to: "/shop/p/$slug", params: { slug } }); };
  const submitSearch = () => {
    const q = searchQ.trim();
    if (!q) return;
    if (suggestions[0]) { goToProduct(suggestions[0].slug); return; }
    closeSearch();
    navigate({ to: "/search", search: { q } });
  };

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
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") closeDrawer(); };
    window.addEventListener("keydown", onKey);
    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverflowX = document.documentElement.style.overflowX;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflowX = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflowX = prevHtmlOverflowX;
    };
  }, [drawerOpen]);

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

            {/* Desktop nav — full desktop only */}
            <nav className="hidden xl:flex items-center gap-1 text-sm">
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
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <Link to="/shop" className="px-3 py-2 rounded-full hover:bg-white/5 transition font-display tracking-wider">SHOP ALL</Link>
              <Link to="/sale/$slug" params={{ slug: "summer-steals" }} className="px-3 py-2 rounded-full text-red hover:bg-white/5 transition font-display tracking-wider">DEALS</Link>
            </nav>

            <div className="flex-1" />

            {/* Right icons — full desktop only */}
            <div className="hidden xl:flex items-center gap-1 shrink-0">
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

            {/* Mobile + tablet icons */}
            <div className="flex xl:hidden items-center gap-1 shrink-0">
              <button onClick={() => setSearchOpen(true)} aria-label="Search" className="p-2.5 rounded-full hover:bg-white/5 transition">
                <Search className="w-5 h-5" />
              </button>
              <button onClick={() => setDrawerOpen(true)} aria-label="Open menu" className="p-2.5 rounded-full hover:bg-white/5 transition relative">
                <Menu className="w-5 h-5" />
                {count > 0 && <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[var(--accent-red)]" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Search overlay */}
      <AnimatePresence>
      {searchOpen && (
        <motion.div
          className="fixed inset-0 z-[60]"
          onClick={closeSearch}
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduce ? 0 : 0.28, ease: [0.19, 1, 0.22, 1] }}
        >
          <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" />
          <motion.div
            className="relative mx-3 md:mx-6 mt-3 md:mt-5 smoked-menu p-4 md:p-6"
            onClick={(e) => e.stopPropagation()}
            initial={reduce ? false : { opacity: 0, scale: 0.98, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: -8 }}
            transition={{ duration: reduce ? 0 : 0.22, ease: [0.19, 1, 0.22, 1] }}
          >
            <form
              onSubmit={(e) => { e.preventDefault(); submitSearch(); }}
              className="flex items-center gap-3"
            >
              <Search className="w-5 h-5 text-white/55" />
              <input
                ref={searchRef}
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                placeholder="What are you hunting?"
                className="flex-1 bg-transparent outline-none text-lg md:text-2xl font-display tracking-wider placeholder:text-white/30"
              />
              <button type="button" onClick={closeSearch} aria-label="Close" className="p-2 rounded-full hover:bg-white/10">
                <X className="w-5 h-5" />
              </button>
            </form>

            {searchQ.trim() ? (
              <div className="mt-4 pt-4 border-t border-white/10">
                {suggestions.length === 0 ? (
                  <div className="font-mono text-sm text-white/50 py-2">
                    No plugins match "{searchQ}". Press Enter to search anyway.
                  </div>
                ) : (
                  <ul className="flex flex-col -mx-2 max-h-[60vh] overflow-y-auto">
                    {suggestions.map((p) => (
                      <li key={p.id ?? p.slug}>
                        <button
                          type="button"
                          onClick={() => goToProduct(p.slug)}
                          className="w-full flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-white/8 transition text-left"
                        >
                          <div
                            className="w-11 h-11 rounded-lg overflow-hidden shrink-0 border border-white/10"
                            style={{ background: p.coverGradient }}
                          >
                            {p.coverUrl && (
                              <img src={p.coverUrl} alt="" loading="lazy" className="w-full h-full object-cover" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-display text-base truncate">{p.name}</div>
                            <div className="font-mono text-[10px] tracking-[0.15em] text-white/50 uppercase truncate">
                              {p.maker} · {p.category}
                            </div>
                          </div>
                          <div className="font-mono text-xs text-white/60 shrink-0">
                            {p.isFree ? "FREE" : `$${Number(p.price).toFixed(2)}`}
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : (
              <div className="mt-4 pt-4 border-t border-white/10">
                <div className="label-mini mb-2">Try</div>
                <div className="flex flex-wrap gap-2">
                  {["Serum", "Pro-Q 4", "Ableton Live", "Omnisphere", "Free Plugins"].map(s => (
                    <button
                      key={s}
                      onClick={() => setSearchQ(s)}
                      className="px-3 py-1.5 rounded-full border border-white/15 hover:border-[var(--accent-red)] hover:text-red text-sm transition"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* Mobile + tablet slide-in drawer */}
      {drawerOpen && (
        <div className={`fixed inset-0 z-[60] xl:hidden overflow-hidden ${drawerClosing ? "drawer-closing" : ""}`} onClick={closeDrawer}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm drawer-scrim" />
          <aside
            className="drawer-panel fixed right-0 top-0 bottom-0 w-[88%] max-w-md flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="drawer-top-glare" />

            {/* Sticky header row — logo + close */}
            <div className="drawer-header drawer-stagger drawer-stagger-1 flex items-center justify-between relative z-20">
              <img src={logo} alt="Plugin Warehouse" className="h-10 w-auto" />
              <button
                onClick={closeDrawer}
                aria-label="Close"
                className="drawer-close-pill"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="drawer-body relative z-10 flex-1 overflow-y-auto">
              {/* CATEGORIES */}
              <div className="drawer-stagger drawer-stagger-3">
                <div className="drawer-section-label">Categories</div>
                <nav className="flex flex-col">
                  {categories.map((c) => {
                    const Icon = catIcons[c.slug] ?? Piano;
                    return (
                      <Link
                        key={c.slug}
                        to="/shop/$category"
                        params={{ category: c.slug }}
                        onClick={closeDrawer}
                        className="drawer-item"
                      >
                        <Icon className="drawer-item-icon" strokeWidth={1.4} />
                        <span className="drawer-item-label">{c.name}</span>
                        
                      </Link>
                    );
                  })}
                </nav>
              </div>

              <div className="drawer-divider" />

              {/* SHOP */}
              <div className="drawer-stagger drawer-stagger-4">
                <div className="drawer-section-label">Shop</div>
                <nav className="flex flex-col">
                  <Link
                    to="/sale/$slug"
                    params={{ slug: "summer-steals" }}
                    onClick={closeDrawer}
                    className="drawer-item"
                  >
                    <span className="drawer-item-label text-red">DEALS</span>
                  </Link>
                  <Link
                    to="/shop"
                    onClick={closeDrawer}
                    className="drawer-item"
                  >
                    <span className="drawer-item-label">SHOP ALL</span>
                  </Link>
                </nav>
              </div>

              <div className="drawer-divider" />

              {/* YOU */}
              <div className="drawer-stagger drawer-stagger-5 pb-6">
                <div className="drawer-section-label">You</div>
                <nav className="flex flex-col">
                  <Link to="/account" onClick={closeDrawer} className="drawer-item">
                    <User className="drawer-item-icon" strokeWidth={1.4} />
                    <span className="drawer-item-label">Account</span>
                  </Link>
                  <Link to="/account/saved" onClick={closeDrawer} className="drawer-item">
                    <Heart className="drawer-item-icon" strokeWidth={1.4} />
                    <span className="drawer-item-label">Wishlist</span>
                  </Link>
                  <button
                    onClick={() => { closeDrawer(); actions.openCart(); }}
                    className="drawer-item w-full text-left"
                  >
                    <ShoppingCart className="drawer-item-icon" strokeWidth={1.4} />
                    <span className="drawer-item-label">Cart</span>
                    {count > 0 && <span className="drawer-item-count text-red">{count}</span>}
                  </button>
                </nav>
              </div>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
