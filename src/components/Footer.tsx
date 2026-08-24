import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import logo from "@/assets/logo-dashboard.webp";
import { Sparkles } from "lucide-react";

export function Footer() {
  return (
    <footer className="storefront-footer">
      <div className="storefront-footer__inner">
          <div className="flex flex-col md:flex-row md:items-start md:gap-12 gap-8">
            <div className="md:max-w-xs">
              <img src={logo} alt="Plugin Warehouse" className="h-10 w-auto object-contain mb-3" />
              <p className="text-xs text-white/60 max-w-xs mb-4">Pro-tier creative software at a fraction of the price. Yours forever.</p>
              <FooterSubscribe />
            </div>

            <div className="grid grid-cols-3 gap-6 md:gap-10 flex-1 md:justify-items-end md:text-right">
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
                { to: "/blog", label: "Blog" },
                { to: "/privacy-policy", label: "Privacy" },
                { to: "/terms-of-service", label: "Terms" },
              ]} />
            </div>
          </div>

          <div className="mt-8 pt-5 border-t border-white/10 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="font-display text-xs md:text-sm uppercase tracking-[0.12em]">
              <span className="text-white">The same plugins.</span> <span className="text-red">Fraction of the price.</span>
            </div>
            <div className="font-mono text-[10px] md:text-xs text-white/40 flex items-center gap-3">
              <span>© 2026 <span className="text-red">Plugin Warehouse</span></span>
              <Link to={"/dashboard/login" as any} aria-label="✦" className="text-white/25 hover:text-white/60 transition" title="">
                <Sparkles className="w-3 h-3" aria-hidden="true" />
              </Link>
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

function FooterSubscribe() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status === "loading") return;
    const trimmed = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      toast.error("Enter a valid email.");
      return;
    }
    setStatus("loading");
    try {
      const { subscribeNewsletter } = await import("@/lib/newsletter.functions");
      const res = await subscribeNewsletter({ data: { email: trimmed, source: "footer" } });
      if (res.ok) {
        setStatus("done");
        setEmail("");
        toast.success("You're on the list.");
      } else {
        setStatus("idle");
        toast.error(res.error);
      }
    } catch {
      setStatus("idle");
      toast.error("Couldn't subscribe. Try again.");
    }
  };

  if (status === "done") {
    return <p className="font-mono text-[10px] text-white/70">✓ SUBSCRIBED. WATCH YOUR INBOX.</p>;
  }
  return (
    <form onSubmit={onSubmit} className="flex gap-2">
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@email.com"
        maxLength={255}
        aria-label="Email address"
        className="flex-1 min-w-0 bg-white/5 border border-white/15 rounded-md px-3 py-2 text-xs text-white placeholder:text-white/40 outline-none focus:border-[var(--accent-red)]"
        disabled={status === "loading"}
      />
      <button
        type="submit"
        disabled={status === "loading"}
        className="btn-primary !text-[10px] !py-2 !px-3 whitespace-nowrap disabled:opacity-60"
      >
        {status === "loading" ? "..." : "SUBSCRIBE"}
      </button>
    </form>
  );
}
