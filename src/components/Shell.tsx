import { Outlet } from "@tanstack/react-router";
import { Nav } from "./Nav";
import { Footer } from "./Footer";
import { CartDrawer } from "./CartDrawer";

export function Shell() {
  return (
    <>
      <Nav />
      <main className="pt-24 md:pt-28">
        <Outlet />
      </main>
      <Footer />
      <CartDrawer />
    </>
  );
}
