import { Link } from "@tanstack/react-router";
import logo from "@/assets/logo.png";

export function Footer() {
  return (
    <footer className="mt-32 px-4 md:px-6 pb-6">
      <div className="glass-card p-8 md:p-12">
        <div className="chromatic-edge" /><div className="glass-noise" />
        <div className="relative z-10">
          <div className="grid gap-10 md:grid-cols-4">
            <div>
              <img src={logo} alt="Plugin Warehouse" className="h-12 w-auto object-contain mb-4" style={{ filter: "drop-shadow(0 2px 12px rgba(255,0,60,0.35))" }} />
              <p className="text-sm text-white/60 max-w-xs">Pro-tier creative software at a fraction of the price. Yours forever.</p>
            </div>

            <FooterCol title="SHOP" links={[
              { to: "/shop", label: "All Plugins" },
              { to: "/shop/instruments", label: "Instruments" },
              { to: "/shop/effects", label: "Effects" },
              { to: "/shop/libraries", label: "Libraries" },
              { to: "/shop/daws", label: "DAWs" },
              { to: "/shop/software", label: "Software" },
              { to: "/shop/freebies", label: "Freebies" },
            ]} />
            <FooterCol title="SUPPORT" links={[
              { to: "/faq", label: "FAQ" },
              { to: "/contact-us", label: "Contact" },
            ]} />
            <FooterCol title="BRAND" links={[
              { to: "/our-story", label: "Our Story" },
              { to: "/privacy-policy", label: "Privacy" },
              { to: "/terms-of-service", label: "Terms" },
            ]} />
          </div>

          <div className="mt-10 pt-6 border-t border-white/10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="font-display text-sm uppercase tracking-[0.12em]">
              <span className="text-white">The same plugins.</span> <span className="text-red">Fraction of the price.</span>
            </div>
            <div className="font-mono text-xs text-white/40">© 2026 <span className="text-red">Plugin Warehouse</span></div>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: { to: string; label: string }[] }) {
  return (
    <div>
      <div className="label-mini mb-3">{title}</div>
      <ul className="space-y-2">
        {links.map((l) => (
          <li key={l.to}>
            <Link to={l.to as any} className="text-sm text-white/70 hover:text-white transition">{l.label}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
