import { Outlet, useRouterState } from "@tanstack/react-router";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useLayoutEffect } from "react";
import { Nav } from "./Nav";
import { Footer } from "./Footer";
import { CartDrawer } from "./CartDrawer";

export function Shell() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const reduce = useReducedMotion();
  const isDashboard = pathname === "/dashboard" || pathname.startsWith("/dashboard/");

  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
  }, [pathname]);

  useScrollReveal(pathname, isDashboard);

  if (isDashboard) {
    // Dashboard manages its own chrome (sidebar + topbar).
    return <Outlet />;
  }

  return (
    <>
      <Nav />
      <main className="pt-24 md:pt-28">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={pathname}
            initial={reduce ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0, y: -14 }}
            transition={{
              duration: reduce ? 0 : 0.34,
              ease: [0.19, 1, 0.22, 1],
            }}
            style={{ willChange: "opacity, transform" }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
      <Footer />
      <CartDrawer />
    </>
  );
}

function useScrollReveal(pathname: string, disabled = false) {
  useEffect(() => {
    if (disabled) return;
    let observer: IntersectionObserver | undefined;
    // Defer past hydration so we don't mutate DOM React is still committing.
    const id = window.setTimeout(() => {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const candidates = Array.from(
        document.querySelectorAll<HTMLElement>("main section, main .glass-card, main .product-card"),
      ).filter((el) => !el.closest("[data-no-reveal]") && !el.classList.contains("motion-observed"));

      if (reduce || !("IntersectionObserver" in window)) {
        candidates.forEach((el) => el.classList.add("motion-observed", "motion-visible"));
        return;
      }

      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            const el = entry.target as HTMLElement;
            el.classList.add("motion-visible");
            observer?.unobserve(el);
          });
        },
        { threshold: 0.08, rootMargin: "0px 0px -8% 0px" },
      );

      candidates.forEach((el, index) => {
        el.classList.add("motion-observed");
        el.style.setProperty("--reveal-delay", `${Math.min(index * 28, 180)}ms`);
        observer!.observe(el);
      });
    }, 80);

    return () => {
      window.clearTimeout(id);
      observer?.disconnect();
    };
  }, [pathname, disabled]);
}
