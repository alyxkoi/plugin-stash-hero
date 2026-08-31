import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useActiveSale } from "@/hooks/useActiveSale";

const DISMISS_KEY = "pw_sale_banner_dismissed_v1";

export function SaleBanner() {
  const { sale } = useActiveSale();
  const [dismissedFor, setDismissedFor] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try { setDismissedFor(localStorage.getItem(DISMISS_KEY)); } catch { /* noop */ }
  }, []);

  if (!sale) return null;
  if (dismissedFor === sale.id) return null;

  const color = sale.theme_color || "#ff003c";
  const headline = sale.headline || `${sale.discount_pct}% OFF — ${sale.name.toUpperCase()}`;
  const sub = sale.subheadline || "Limited time. Shop the sale.";

  function dismiss() {
    try { localStorage.setItem(DISMISS_KEY, sale!.id); } catch { /* noop */ }
    setDismissedFor(sale!.id);
  }

  return (
    <div
      className="relative w-full text-white text-xs md:text-sm font-mono tracking-wide"
      style={{
        background: `linear-gradient(90deg, ${color}dd, ${color}88 60%, transparent)`,
        borderBottom: `1px solid ${color}66`,
      }}
      role="region"
      aria-label="Active sale announcement"
    >
      <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-2 flex items-center gap-4">
        <span className="hidden md:inline uppercase font-bold" style={{ textShadow: `0 0 12px ${color}` }}>
          {headline}
        </span>
        <span className="md:hidden uppercase font-bold">{sale.discount_pct}% OFF</span>
        <span className="hidden lg:inline opacity-80">— {sub}</span>
        <div className="flex-1" />
        <Link
          to="/deals"
          className="uppercase font-bold underline underline-offset-4 hover:opacity-80 whitespace-nowrap"
        >
          Shop the sale →
        </Link>
        <button
          onClick={dismiss}
          aria-label="Dismiss sale banner"
          className="p-1 rounded hover:bg-white/15 transition"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
