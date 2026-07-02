import { Outlet, useRouterState } from "@tanstack/react-router";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect } from "react";
import { Nav } from "./Nav";
import { Footer } from "./Footer";
import { CartDrawer } from "./CartDrawer";
import { SaleBanner } from "./SaleBanner";
import { useCartSync } from "@/hooks/useCartSync";

function CartSync() {
  useCartSync();
  return null;
}

export function Shell() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const reduce = useReducedMotion();
  const isDashboard = pathname === "/dashboard" || pathname.startsWith("/dashboard/");

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname]);

  if (isDashboard) {
    // Dashboard manages its own chrome (sidebar + topbar).
    return <Outlet />;
  }

  return (
    <>
      <Nav />
      <main className="pt-24 md:pt-28">
        <div className="route-transition-stack">
        <AnimatePresence mode="sync" initial={false}>
          <motion.div
            key={pathname}
            className="route-transition-page"
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduce ? undefined : { opacity: 0 }}
            transition={{
              duration: reduce ? 0 : 0.28,
              ease: "easeOut",
            }}
            style={{ willChange: "opacity" }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
        </div>
      </main>
      <Footer />
      <CartDrawer />
      <CartSync />
    </>
  );
}
