import { ReactNode, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, ChevronLeft } from "lucide-react";

interface DetailDrawerProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  eyebrow?: ReactNode;
  onBack?: () => void;
  children: ReactNode;
  widthClass?: string;
}

/**
 * DetailDrawer — one reusable slide-in surface used across Overview / Orders / Customers.
 * Mobile: full-width bottom→top sheet with rounded top. Desktop: right-side panel.
 * Glass #190737 on #0B0018, lipstick-red accents live inside the content.
 */
export function DetailDrawer({ open, onClose, title, eyebrow, onBack, children, widthClass }: DetailDrawerProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (typeof document === "undefined") return null;
  if (!open) return null;

  return createPortal(
    <div className="dashboard-scope fixed inset-0 z-[120]" role="dialog" aria-modal="true">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-[detail-fade_.2s_ease-out]"
        onClick={onClose}
      />
      <aside
        className={`absolute right-0 bottom-0 sm:top-0 h-[92dvh] sm:h-[100dvh] w-full ${widthClass ?? "sm:w-[480px] md:w-[520px]"} max-w-full flex flex-col border-t sm:border-t-0 sm:border-l border-white/10 rounded-t-2xl sm:rounded-none shadow-[0_-20px_60px_rgba(0,0,0,0.6)] sm:shadow-[0_0_60px_rgba(0,0,0,0.6)] animate-[detail-slide-mobile_.28s_cubic-bezier(.2,.8,.2,1)] sm:animate-[detail-slide_.28s_cubic-bezier(.2,.8,.2,1)]`}
        style={{ background: "#190737" }}
      >
        <div className="chromatic-edge pointer-events-none" />
        <div className="sm:hidden absolute top-2 left-1/2 -translate-x-1/2 h-1 w-10 rounded-full bg-white/20" />

        <div className="relative z-10 flex items-start gap-3 p-5 pt-6 sm:pt-5 border-b border-white/10 shrink-0">
          {onBack && (
            <button
              onClick={onBack}
              aria-label="Back"
              className="text-[#B8ACCC] hover:text-white p-2 -ml-2 rounded-lg hover:bg-white/10 shrink-0"
            >
              <ChevronLeft size={18} />
            </button>
          )}
          <div className="flex-1 min-w-0">
            {eyebrow && (
              <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-[#B8ACCC] mb-1">{eyebrow}</div>
            )}
            {title && <h2 className="font-display text-lg md:text-xl text-white truncate">{title}</h2>}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-[#B8ACCC] hover:text-white p-2 rounded-lg hover:bg-white/10 shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        <div className="relative z-10 flex-1 min-h-0 overflow-y-auto p-5">
          {children}
        </div>

        <style>{`
          @keyframes detail-slide { from { transform: translateX(100%); } to { transform: translateX(0); } }
          @keyframes detail-slide-mobile { from { transform: translateY(100%); } to { transform: translateY(0); } }
          @keyframes detail-fade { from { opacity: 0; } to { opacity: 1; } }
        `}</style>
      </aside>
    </div>,
    document.body,
  );
}
