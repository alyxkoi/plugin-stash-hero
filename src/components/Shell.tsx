import { Outlet, useRouterState } from "@tanstack/react-router";
import { motion, useReducedMotion } from "framer-motion";
import { useLayoutEffect } from "react";
import { Nav } from "./Nav";
import { Footer } from "./Footer";
import { CartDrawer } from "./CartDrawer";

export function Shell() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const reduce = useReducedMotion();
  const isDashboard = pathname === "/dashboard" || pathname.startsWith("/dashboard/");

  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
  }, [pathname]);

  if (isDashboard) {
    // Dashboard manages its own chrome (sidebar + topbar).
    return <Outlet />;
  }

  return (
    <>
      <Nav />
      <main className="pt-24 md:pt-28">
        <motion.div
          key={pathname}
          initial={reduce ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: reduce ? 0 : 0.28,
            ease: [0.22, 1, 0.36, 1],
          }}
          style={{ willChange: "opacity, transform" }}
        >
          <Outlet />
        </motion.div>
      </main>
      <Footer />
      <CartDrawer />
    </>
  );
}
