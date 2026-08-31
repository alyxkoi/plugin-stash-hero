import { ReactNode, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useDragControls, useReducedMotion } from "framer-motion";
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
 * DetailDrawer — one reusable detail surface used across Overview / Orders / Customers.
 * It is a right-side drawer on desktop and a scrollable bottom sheet on mobile.
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
  const onCloseRef = useRef(onClose);
  const titleId = useId();
  const reduceMotion = useReducedMotion();
  const dragControls = useDragControls();
  const [isMobile, setIsMobile] = useState(() =>
    typeof window === "undefined" ? false : window.matchMedia("(max-width: 767px)").matches,
  );

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!open) return;
    previousFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusableSelector =
      "a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCloseRef.current();
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
  }, [open]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div key="detail-layer" className="dashboard-scope dash-detail-layer">
          <motion.div
            className="dash-detail-scrim"
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.14, ease: "easeOut" }}
            onClick={onClose}
          />
          <motion.aside
            ref={sheetRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            tabIndex={-1}
            className={`dash-detail-sheet ${widthClass ?? ""}`}
            initial={
              reduceMotion ? false : isMobile ? { y: "100%" } : { x: "100%" }
            }
            animate={{ x: 0, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : isMobile ? { y: "100%" } : { x: "100%" }}
            transition={{
              duration: reduceMotion ? 0 : 0.24,
              ease: [0.22, 1, 0.36, 1],
            }}
            drag={isMobile && !reduceMotion ? "y" : false}
            dragListener={false}
            dragControls={dragControls}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.28 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 110 || info.velocity.y > 700) onClose();
            }}
          >
            <div
              className="dash-detail-grabber"
              aria-hidden="true"
              onPointerDown={(event) => dragControls.start(event)}
            >
              <span />
            </div>
            <div className="chromatic-edge pointer-events-none" />

            <div className="dash-detail-header relative z-10 flex items-start gap-3 px-5 pb-4 pt-5 border-b border-white/10 shrink-0">
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

            <div className="dash-detail-scroll relative z-10 flex-1 min-h-0 overflow-y-auto p-5">
              {children}
            </div>

          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
