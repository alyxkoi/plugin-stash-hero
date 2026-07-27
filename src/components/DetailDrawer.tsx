import { ReactNode, useEffect, useRef, useState } from "react";
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
 * Mobile: full-width bottom→top sheet with rounded top, swipe-down-to-dismiss.
 * Desktop: right-side panel. Glass #190737 on #0B0018.
 */
export function DetailDrawer({ open, onClose, title, eyebrow, onBack, children, widthClass }: DetailDrawerProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [dragY, setDragY] = useState(0);
  const startY = useRef<number | null>(null);
  const dragging = useRef(false);

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

  // Reset drag offset when reopened
  useEffect(() => { if (open) setDragY(0); }, [open]);

  const isMobile = () => typeof window !== "undefined" && window.matchMedia("(max-width: 639px)").matches;

  const onTouchStart = (e: React.TouchEvent) => {
    if (!isMobile()) return;
    // Only start swipe when the scroll area is at the top — so users can still
    // scroll content without accidentally dismissing.
    if (scrollRef.current && scrollRef.current.scrollTop > 0) return;
    startY.current = e.touches[0].clientY;
    dragging.current = true;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (!dragging.current || startY.current == null) return;
    const dy = e.touches[0].clientY - startY.current;
    if (dy > 0) setDragY(dy);
  };
  const onTouchEnd = () => {
    if (!dragging.current) return;
    dragging.current = false;
    startY.current = null;
    if (dragY > 120) {
      setDragY(0);
      onClose();
    } else {
      setDragY(0);
    }
  };

  if (typeof document === "undefined") return null;
  if (!open) return null;

  return createPortal(
    <div className="dashboard-scope fixed inset-0 z-[120]" role="dialog" aria-modal="true">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-[detail-fade_.2s_ease-out]"
        onClick={onClose}
      />
      <aside
        ref={sheetRef}
        className={`absolute right-0 bottom-0 sm:top-0 h-[92dvh] sm:h-[100dvh] w-full ${widthClass ?? "sm:w-[480px] md:w-[520px]"} max-w-full flex flex-col border-t sm:border-t-0 sm:border-l border-white/10 rounded-t-2xl sm:rounded-none shadow-[0_-20px_60px_rgba(0,0,0,0.6)] sm:shadow-[0_0_60px_rgba(0,0,0,0.6)] animate-[detail-slide-mobile_.28s_cubic-bezier(.2,.8,.2,1)] sm:animate-[detail-slide_.28s_cubic-bezier(.2,.8,.2,1)]`}
        style={{
          background: "#190737",
          transform: dragY > 0 ? `translateY(${dragY}px)` : undefined,
          transition: dragging.current ? "none" : "transform .2s ease-out",
        }}
      >
        <div className="chromatic-edge pointer-events-none" />

        {/* Swipe-down handle (mobile only). Grabbing the top strip starts the drag. */}
        <div
          className="sm:hidden pt-3 pb-2 flex items-center justify-center shrink-0 touch-none cursor-grab active:cursor-grabbing"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          aria-hidden
        >
          <span className="h-1.5 w-12 rounded-full bg-white/30" />
        </div>

        <div className="relative z-10 flex items-start gap-3 px-5 pb-4 sm:pt-5 border-b border-white/10 shrink-0">
          {onBack && (
            <button
              onClick={onBack}
              aria-label="Back"
              className="text-[#B8ACCC] hover:text-white p-2 -ml-2 rounded-lg hover:bg-white/10 shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center"
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
            className="text-[#B8ACCC] hover:text-white rounded-lg hover:bg-white/10 shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            <X size={18} />
          </button>
        </div>

        <div ref={scrollRef} className="relative z-10 flex-1 min-h-0 overflow-y-auto p-5">
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
