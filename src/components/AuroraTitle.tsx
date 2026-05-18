import { useEffect, useRef, useState, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  className?: string;
  as?: "h1" | "h2" | "h3";
  /** Optional decoration rendered absolutely positioned within the title wrapper (e.g. underline svg). */
  decoration?: ReactNode;
}

function useFadeIn<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) return;
    setVisible(false);
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); io.disconnect(); } },
      { threshold: 0, rootMargin: "0px 0px -5% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return { ref, visible };
}

/** Aurora Title — drifting color glow + slanted frosted strip + glowing text. */
export function AuroraTitle({ children, className = "", as: Tag = "h2", decoration }: Props) {
  const { ref, visible } = useFadeIn<HTMLDivElement>();
  return (
    <div ref={ref} className={`aurora-title-wrap title-fade ${visible ? "is-visible" : ""} ${className}`}>
      <div className="aurora-blobs" aria-hidden>
        <span className="aurora-blob aurora-blob--red" />
        <span className="aurora-blob aurora-blob--blue" />
      </div>
      <div className="aurora-strip" aria-hidden>
        <div className="aurora-strip-edge" />
      </div>
      <Tag className="aurora-title-text">{children}</Tag>
      {decoration}
    </div>
  );
}
