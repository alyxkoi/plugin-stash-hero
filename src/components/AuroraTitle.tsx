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

/** Aurora Title — bold slanted frosted text with aurora gradient inside the letters. */
export function AuroraTitle({ children, className = "", as: Tag = "h2", decoration }: Props) {
  const { ref, visible } = useFadeIn<HTMLDivElement>();
  return (
    <div ref={ref} className={`aurora-title-wrap title-fade ${visible ? "is-visible" : ""} ${className}`}>
      <Tag className="aurora-title-text" data-text={typeof children === "string" ? children : undefined}>
        <span className="aurora-title-inner">{children}</span>
      </Tag>
      {decoration}
    </div>
  );
}
