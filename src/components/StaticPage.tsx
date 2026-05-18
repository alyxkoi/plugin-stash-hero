import { Link } from "@tanstack/react-router";
import { GlassCard } from "./GlassCard";

interface StaticPageProps {
  eyebrow: string;
  headline: string;
  sub?: string;
  sections: { title: string; body: React.ReactNode }[];
  footerCta?: { label: string; to: string };
}

export function StaticPage({ eyebrow, headline, sub, sections, footerCta }: StaticPageProps) {
  return (
    <div className="px-4 md:px-12 py-12 max-w-4xl mx-auto">
      <header className="mb-12">
        <div className="font-mono text-xs tracking-[0.2em] text-[var(--accent-red-glow)] mb-3">{eyebrow}</div>
        <h1 className="font-black chrome-text leading-[0.95]" style={{ fontSize: "clamp(2.5rem, 6vw, 5rem)" }}>{headline}</h1>
        {sub && <p className="mt-4 text-lg text-white/65 max-w-2xl">{sub}</p>}
      </header>

      <div className="space-y-6">
        {sections.map((s) => (
          <GlassCard key={s.title} className="p-8">
            <h2 className="font-black uppercase tracking-wider text-2xl mb-4 chrome-text">{s.title}</h2>
            <div className="text-white/75 leading-relaxed space-y-3">{s.body}</div>
          </GlassCard>
        ))}
      </div>

      {footerCta && (
        <div className="text-center mt-16">
          <Link to={footerCta.to as any} className="btn-primary !text-base !py-4 !px-8">{footerCta.label}</Link>
        </div>
      )}
    </div>
  );
}
