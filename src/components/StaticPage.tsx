import { Link } from "@tanstack/react-router";

interface StaticPageProps {
  eyebrow: string;
  headline: string;
  sub?: string;
  sections: { title: string; body: React.ReactNode }[];
  footerCta?: { label: string; to: string };
}

export function StaticPage({ headline, sub, sections, footerCta }: StaticPageProps) {
  return (
    <div className="static-page-v2">
      <header className="pwh-horizon static-page-hero">
        <h1 className="pwh-display">{headline}</h1>
        {sub && <p>{sub}</p>}
      </header>

      <div className="static-page-sections">
        {sections.map((s) => (
          <section key={s.title}>
            <h2>{s.title}</h2>
            <div>{s.body}</div>
          </section>
        ))}
      </div>

      {footerCta && (
        <div className="text-center mt-12">
          <Link to={footerCta.to as any} className="btn-primary !text-base !py-4 !px-8">{footerCta.label}</Link>
        </div>
      )}
    </div>
  );
}
