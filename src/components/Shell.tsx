import { Outlet, useRouterState } from "@tanstack/react-router";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Nav } from "./Nav";
import { Footer } from "./Footer";
import { CartDrawer } from "./CartDrawer";

export function Shell() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const reduce = useReducedMotion();
  const isDashboard = pathname === "/dashboard" || pathname.startsWith("/dashboard/");

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
            initial={reduce ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -4 }}
            transition={{
              duration: reduce ? 0 : 0.42,
              ease: [0.22, 1, 0.36, 1],
              opacity: { duration: reduce ? 0 : 0.42 },
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
