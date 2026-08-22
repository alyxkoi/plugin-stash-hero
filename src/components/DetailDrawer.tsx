import { ReactNode, useEffect, useId, useRef } from "react";
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
 * A true viewport-level right-side panel on every breakpoint.
 */
export function DetailDrawer({
  open,
  onClose,
  title,
  eyebrow,
  onBack,
  children,
  widthClass,
}: DetailDrawerProps) {
  const sheetRef = useRef<HTMLElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    previousFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusableSelector =
      "a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab" || !sheetRef.current) return;
      const focusable = Array.from(
        sheetRef.current.querySelectorAll<HTMLElement>(focusableSelector),
      );
      if (!focusable.length) {
        e.preventDefault();
        sheetRef.current.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const frame = window.requestAnimationFrame(() => {
      const first = sheetRef.current?.querySelector<HTMLElement>(focusableSelector);
      (first ?? sheetRef.current)?.focus();
    });
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      previousFocusRef.current?.focus({ preventScroll: true });
    };
  }, [open, onClose]);

  if (typeof document === "undefined") return null;
  if (!open) return null;

  return createPortal(
    <div className="dashboard-scope dash-detail-layer">
      <div
        className="dash-detail-scrim"
        onClick={onClose}
      />
      <aside
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
        className={`dash-detail-sheet ${widthClass ?? ""}`}
      >
        <div className="chromatic-edge pointer-events-none" />

        <div className="relative z-10 flex items-start gap-3 px-5 pb-4 pt-5 border-b border-white/10 shrink-0">
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
              <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-[#B8ACCC] mb-1">
                {eyebrow}
              </div>
            )}
            {title && (
              <h2 id={titleId} className="font-display text-lg md:text-xl text-white truncate">
                {title}
              </h2>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-[#B8ACCC] hover:text-white rounded-lg hover:bg-white/10 shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            <X size={18} />
          </button>
        </div>

        <div className="relative z-10 flex-1 min-h-0 overflow-y-auto p-5">
          {children}
        </div>

        <style>{`
          @keyframes detail-slide { from { transform: translateX(100%); } to { transform: translateX(0); } }
          @keyframes detail-fade { from { opacity: 0; } to { opacity: 1; } }
        `}</style>
      </aside>
    </div>,
    document.body,
  );
}
