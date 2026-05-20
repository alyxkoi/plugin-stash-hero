import { Link } from "@tanstack/react-router";
import logo from "@/assets/logo.png";

export function Footer() {
  return (
    <footer className="mt-24 px-4 md:px-6 pb-6">
      <div className="glass-card p-6 md:p-8">
        <div className="chromatic-edge" /><div className="glass-noise" />
        <div className="relative z-10">
          <div className="flex flex-col md:flex-row md:items-start md:gap-12 gap-8">
            <div className="md:max-w-xs">
              <img src={logo} alt="Plugin Warehouse" className="h-10 w-auto object-contain mb-3" style={{ filter: "drop-shadow(0 2px 12px rgba(255,0,60,0.35))" }} />
              <p className="text-xs text-white/60 max-w-xs">Pro-tier creative software at a fraction of the price. Yours forever.</p>
            </div>

            <div className="grid grid-cols-3 gap-6 md:gap-10 flex-1">
              <FooterCol title="SHOP" links={[
                { to: "/shop", label: "All Plugins" },
                { to: "/shop/instruments", label: "Instruments" },
                { to: "/shop/effects", label: "Effects" },
                { to: "/shop/libraries", label: "Libraries" },
                { to: "/shop/daws", label: "DAWs" },
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
          </div>

          <div className="mt-8 pt-5 border-t border-white/10 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="font-display text-xs md:text-sm uppercase tracking-[0.12em]">
              <span className="text-white">The same plugins.</span> <span className="text-red">Fraction of the price.</span>
            </div>
            <div className="font-mono text-[10px] md:text-xs text-white/40">© 2026 <span className="text-red">Plugin Warehouse</span></div>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: { to: string; label: string }[] }) {
  return (
    <div>
      <div className="label-mini mb-2 text-[10px]">{title}</div>
      <ul className="space-y-1.5">
        {links.map((l) => (
          <li key={l.to}>
            <Link to={l.to as any} className="text-xs md:text-sm text-white/70 hover:text-white transition">{l.label}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
