import { forwardRef, useRef, useEffect, type HTMLAttributes, type ReactNode } from "react";

interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "blue" | "heavy" | "subtle";
  tilt?: boolean;
  children: ReactNode;
}

export const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  ({ variant = "default", tilt = false, className = "", children, ...rest }, ref) => {
    const localRef = useRef<HTMLDivElement>(null);
    const cardRef = (ref as React.RefObject<HTMLDivElement>) || localRef;

    useEffect(() => {
      if (!tilt) return;
      const card = cardRef.current;
      if (!card) return;
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduce) return;
      const move = (e: MouseEvent) => {
        const rect = card.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const y = (e.clientY - rect.top) / rect.height;
        const tiltX = (y - 0.5) * 6;
        const tiltY = (x - 0.5) * -6;
        card.style.transform = `perspective(1200px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) translateY(-4px)`;
        card.style.setProperty("--glare-peak", `${x * 100}%`);
      };
      const leave = () => {
        card.style.transform = "";
        card.style.removeProperty("--glare-peak");
      };
      card.addEventListener("mousemove", move);
      card.addEventListener("mouseleave", leave);
      return () => {
        card.removeEventListener("mousemove", move);
        card.removeEventListener("mouseleave", leave);
      };
    }, [tilt, cardRef]);

    const variantClass =
      variant === "blue" ? "glass-card--blue" : variant === "heavy" ? "glass-card--heavy" : variant === "subtle" ? "glass-card--subtle" : "";

    return (
      <div ref={cardRef} className={`glass-card ${variantClass} ${className}`} {...rest}>
        <div className="chromatic-edge" />
        <div className="glass-noise" />
        <div className="relative z-10">{children}</div>
      </div>
    );
  }
);
GlassCard.displayName = "GlassCard";
