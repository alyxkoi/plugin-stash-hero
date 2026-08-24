import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
  className?: string;
  as?: "h1" | "h2" | "h3";
}

/** Centered Anton section title with on-scroll blur fade-in. */
export function SectionTitle({ children, className = "", as: Tag = "h2" }: Props) {
  return (
    <Tag className={`section-header title-fade is-visible ${className}`}>
      {children}
    </Tag>
  );
}

export function FadeIn({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`content-fade is-visible ${className}`}>
      {children}
    </div>
  );
}
