import { Outlet, useRouterState } from "@tanstack/react-router";
import { Nav } from "./Nav";
import { Footer } from "./Footer";
import { CartDrawer } from "./CartDrawer";

export function Shell() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <>
      <Nav />
      <main className="pt-24 md:pt-28">
        <div key={pathname} className="route-transition">
          <Outlet />
        </div>
      </main>
      <Footer />
      <CartDrawer />
    </>
  );
}
