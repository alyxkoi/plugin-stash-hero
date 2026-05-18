import { useEffect, useRef, useState, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  className?: string;
  as?: "h1" | "h2" | "h3";
}

function useFadeIn<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { setVisible(true); return; }

    // If already in viewport on mount, reveal immediately.
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      setVisible(true);
      return;
    }

    const io = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); io.disconnect(); } },
      { threshold: 0, rootMargin: "0px 0px -10% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return { ref, visible };
}

/** Centered Anton section title with on-scroll blur fade-in. */
export function SectionTitle({ children, className = "", as: Tag = "h2" }: Props) {
  const { ref, visible } = useFadeIn<HTMLHeadingElement>();
  return (
    <Tag ref={ref} className={`section-header title-fade ${visible ? "is-visible" : ""} ${className}`}>
      {children}
    </Tag>
  );
}

export function FadeIn({ children, className = "" }: { children: ReactNode; className?: string }) {
  const { ref, visible } = useFadeIn<HTMLDivElement>();
  return (
    <div ref={ref} className={`content-fade ${visible ? "is-visible" : ""} ${className}`}>
      {children}
    </div>
  );
}
