import { Outlet, useRouterState } from "@tanstack/react-router";
import { Nav } from "./Nav";
import { Footer } from "./Footer";
import { CartDrawer } from "./CartDrawer";
import { MysteryGiftPopup } from "./MysteryGiftPopup";
import { SectionErrorBoundary } from "./SectionErrorBoundary";
import { useCartSync } from "@/hooks/useCartSync";
import { useUtmCapture, usePwCidUrlPersistence } from "@/hooks/useUtmCapture";
import { SalePricingProvider } from "@/lib/sale-pricing";
import { StorefrontVisitTracker } from "./StorefrontVisitTracker";


function CartSync() {
  useCartSync();
  return null;
}

function UtmSync() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  useUtmCapture();
  usePwCidUrlPersistence(pathname);
  return null;
}



export function Shell() {
  const pathname = useRouterState({
    select: (s) => s.location.pathname,
  });
  const isDashboard = pathname === "/dashboard" || pathname.startsWith("/dashboard/");

  if (isDashboard) {
    // Dashboard manages its own chrome (sidebar + topbar).
    return <SalePricingProvider><Outlet /></SalePricingProvider>;
  }

  return (
    <SalePricingProvider>
      <div className="storefront-shell">
        <Nav />
        <main className="storefront-main">
          <div className="route-transition-stack">
            <div className="route-transition-page">
              <SectionErrorBoundary resetKey={pathname}>
                <Outlet />
              </SectionErrorBoundary>
            </div>
          </div>
        </main>

        <Footer />
        <CartDrawer />
        <CartSync />
        <UtmSync />
        <StorefrontVisitTracker />
        <MysteryGiftPopup />
      </div>
    </SalePricingProvider>
  );
}
