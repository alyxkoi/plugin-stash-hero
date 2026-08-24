import { useRef, type ReactNode } from "react";
import { useInView, useReducedMotion } from "framer-motion";

interface Props {
  children: ReactNode;
  className?: string;
  as?: "h1" | "h2" | "h3";
}

/** Centered Anton section title with on-scroll blur fade-in. */
export function SectionTitle({ children, className = "", as: Tag = "h2" }: Props) {
  const ref = useRef<HTMLHeadingElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.2 });
  const reduce = useReducedMotion();
  return (
    <Tag ref={ref} className={`section-header title-fade ${reduce || inView ? "is-visible" : ""} ${className}`}>
      {children}
    </Tag>
  );
}

export function FadeIn({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.08, margin: "0px 0px -4% 0px" });
  const reduce = useReducedMotion();
  return (
    <div ref={ref} className={`content-fade ${reduce || inView ? "is-visible" : ""} ${className}`}>
      {children}
    </div>
  );
}
