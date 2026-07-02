import { Link } from "@tanstack/react-router";
import { forwardRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { GlassCard } from "./GlassCard";

export function AuthLayout({ eyebrow, headline, sub, children, footer }: { eyebrow: string; headline: string; sub: string; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12 relative">
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at center, rgba(255,0,60,0.18), transparent 60%)" }} />
      <div className="relative w-full max-w-md">
        <div className="absolute inset-0 glow-breathe pointer-events-none" style={{ background: "radial-gradient(ellipse at center, rgba(255,0,60,0.45), transparent 65%)", filter: "blur(40px)" }} />
        <GlassCard variant="heavy" className="p-8 md:p-10 relative">
          <div className="font-mono text-xs tracking-[0.2em] text-[var(--accent-red-glow)] mb-3">{eyebrow}</div>
          <h1 className="font-black text-4xl md:text-5xl chrome-text mb-2">{headline}</h1>
          <p className="text-white/65 mb-8">{sub}</p>
          {children}
        </GlassCard>
        {footer && <div className="text-center text-sm text-white/60 mt-6">{footer}</div>}
        <div className="text-center mt-4 font-mono text-xs text-white/40">
          <Link to="/terms-of-service" className="hover:text-white">Terms</Link> · <Link to="/privacy-policy" className="hover:text-white">Privacy</Link> · <Link to="/faq" className="hover:text-white">Help</Link>
        </div>
      </div>
    </div>
  );
}

export const Field = forwardRef<HTMLInputElement, { label: string } & React.InputHTMLAttributes<HTMLInputElement>>(
  ({ label, className, ...rest }, ref) => (
    <label className="block mb-4">
      <div className="font-mono text-xs text-white/60 mb-1.5 tracking-wider">{label}</div>
      <input ref={ref} className={`input-glass ${className ?? ""}`} {...rest} />
    </label>
  ),
);
Field.displayName = "Field";

export function PasswordField({ label, ...rest }: { label: string } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "type">) {
  const [show, setShow] = useState(false);
  return (
    <label className="block mb-4">
      <div className="font-mono text-xs text-white/60 mb-1.5 tracking-wider">{label}</div>
      <div className="relative">
        <input type={show ? "text" : "password"} className="input-glass pr-11" {...rest} />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? "Hide password" : "Show password"}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors"
        >
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </label>
  );
}
