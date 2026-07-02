import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Eye, EyeOff, HelpCircle, Mail, Ticket, ExternalLink } from "lucide-react";
import { mockUser, library } from "@/lib/account-data";

export const Route = createFileRoute("/account/settings")({
  head: () => ({ meta: [{ title: "Settings — Plugin Warehouse" }] }),
  component: SettingsPage,
});

const SECTIONS = [
  { id: "profile", label: "PROFILE" },
  { id: "password", label: "PASSWORD" },
  { id: "payment", label: "PAYMENT METHODS" },
  { id: "data", label: "DATA & PRIVACY" },
  { id: "help", label: "GET HELP" },
];

function SettingsPage() {
  const [active, setActive] = useState("profile");
  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-[clamp(2.25rem,5vw,4rem)] leading-[0.95] tracking-tight">SETTINGS</h1>
        <p className="text-white/70 mt-3">Set it how you want.</p>
      </header>

      <div className="-mx-2 px-2 py-2 overflow-x-auto no-scrollbar">
        <div className="flex gap-2 min-w-max">
          {SECTIONS.map(s => (
            <a key={s.id} href={`#${s.id}`} onClick={() => setActive(s.id)} className={`px-4 h-10 rounded-full border whitespace-nowrap flex items-center font-display text-[12px] tracking-wider ${
              active === s.id ? "bg-gradient-to-r from-[var(--accent-red)] to-[var(--accent-red-glow)] text-white border-white/20" : "bg-white/[0.03] border-white/10 text-white/70 hover:text-white"
            }`}>{s.label}</a>
          ))}
        </div>
      </div>


      <ProfileSection />
      <PasswordSection />
      <PaymentSection />
      <DataSection />
      <HelpSection />
    </div>
  );
}

function Panel({ id, title, sub, children }: { id: string; title: string; sub?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="glass-card p-6 md:p-8 scroll-mt-32">
      <div className="chromatic-edge" /><div className="glass-noise" />
      <div className="relative z-10">
        <div className="mb-6">
          <h2 className="font-black text-2xl tracking-tight">{title}</h2>
          {sub && <p className="text-white/65 mt-1.5 text-sm">{sub}</p>}
        </div>
        {children}
      </div>
    </section>
  );
}

function Field({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <div className="font-mono text-[10px] tracking-[0.18em] text-white/55 mb-2">{label}</div>
      <input {...props} className="input-glass" />
    </label>
  );
}

function ProfileSection() {
  const initial = mockUser.displayName[0]?.toUpperCase() || "A";
  return (
    <Panel id="profile" title="PROFILE">
      <div className="grid md:grid-cols-[200px_1fr] gap-8">
        <div className="text-center md:text-left">
          <div className="w-28 h-28 mx-auto md:mx-0 rounded-full flex items-center justify-center font-black text-5xl chrome-text bg-white/[0.04] border border-white/20 mb-4">{initial}</div>
          <button className="btn-ghost !text-xs !py-2 !px-4">CHANGE AVATAR</button>
        </div>
        <div className="space-y-4">
          <Field label="DISPLAY NAME" defaultValue={mockUser.displayName} />
          <Field label="EMAIL ADDRESS" type="email" defaultValue={mockUser.email} />
          <Field label="LOCATION" defaultValue={mockUser.location} />
          <div className="flex justify-end gap-3 pt-2">
            <button className="btn-ghost !text-xs">CANCEL</button>
            <button className="btn-primary !text-xs">SAVE CHANGES</button>
          </div>
        </div>
      </div>
    </Panel>
  );
}

function PasswordSection() {
  const [editing, setEditing] = useState(false);
  const [show, setShow] = useState(false);
  const [pw, setPw] = useState("");
  const strength = pw.length < 6 ? 0 : pw.length < 10 ? 1 : 2;
  const strLabel = ["Weak", "Decent", "Strong"][strength];
  const strColor = ["bg-[var(--accent-red-glow)]", "bg-amber-400", "bg-emerald-400"][strength];

  if (mockUser.oauth === "google") {
    return (
      <Panel id="password" title="PASSWORD">
        <div className="flex items-center gap-3 text-white/75">
          <div className="w-10 h-10 rounded-full bg-white/[0.06] border border-white/15 flex items-center justify-center font-black">G</div>
          <div>Signed in with Google. Manage your password through Google.</div>
        </div>
      </Panel>
    );
  }
  return (
    <Panel id="password" title="PASSWORD">
      {!editing ? (
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <button onClick={() => setEditing(true)} className="btn-ghost !text-xs">CHANGE PASSWORD →</button>
          <div className="label-mini">Last changed {mockUser.passwordLastChanged}</div>
        </div>
      ) : (
        <div className="space-y-4 max-w-md">
          <Field label="CURRENT PASSWORD" type="password" />
          <label className="block">
            <div className="font-mono text-[10px] tracking-[0.18em] text-white/55 mb-2">NEW PASSWORD</div>
            <div className="relative">
              <input type={show ? "text" : "password"} value={pw} onChange={(e) => setPw(e.target.value)} className="input-glass pr-12" />
              <button onClick={() => setShow(s => !s)} aria-label={show ? "Hide password" : "Show password"} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/55 hover:text-white">
                {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {pw && (
              <div className="mt-2 flex items-center gap-2">
                <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden"><div className={`h-full transition-all ${strColor}`} style={{ width: `${(strength + 1) * 33}%` }} /></div>
                <span className="font-mono text-[10px] text-white/65 w-14">{strLabel}</span>
              </div>
            )}
          </label>
          <Field label="CONFIRM NEW PASSWORD" type="password" />
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setEditing(false)} className="btn-ghost !text-xs">CANCEL</button>
            <button className="btn-primary !text-xs">UPDATE PASSWORD</button>
          </div>
        </div>
      )}
    </Panel>
  );
}

function PaymentSection() {
  return (
    <Panel id="payment" title="PAYMENT METHODS" sub="Cards, billing, and saved payment info are managed through Stripe.">
      <button className="btn-ghost !text-xs">OPEN BILLING PORTAL ↗</button>
      <div className="mt-5 flex items-center gap-2 font-mono text-[11px] tracking-wider text-white/55 border border-white/10 rounded-full px-4 py-2 w-fit">
        🔒 Your card details never touch our servers. Stripe handles all of it.
      </div>
    </Panel>
  );
}

function DataSection() {
  const [exporting, setExporting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [typed, setTyped] = useState("");
  return (
    <Panel id="data" title="DATA & PRIVACY">
      <div className="divide-y divide-white/8">
        <div className="py-5 flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex-1">
            <div className="font-bold">Export your data</div>
            <div className="text-sm text-white/60">Download everything we have on you — orders, profile, library — as a JSON file.</div>
          </div>
          {exporting ? (
            <span className="font-mono text-[11px] text-[var(--accent-red-glow)] tracking-wider">EXPORT IN PROGRESS — WE'LL EMAIL YOU</span>
          ) : (
            <button onClick={() => setExporting(true)} className="btn-ghost !text-xs">EXPORT DATA →</button>
          )}
        </div>
        <div className="py-5 flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex-1">
            <div className="font-display text-red text-lg tracking-wide">DELETE YOUR ACCOUNT</div>
            <div className="text-sm text-white/70">This is permanent. Your library and orders will be anonymized.</div>
          </div>
          <button onClick={() => setConfirmOpen(true)} className="btn-ghost !text-xs border-[var(--accent-red)]/60 !text-[var(--accent-red-glow)]">DELETE ACCOUNT</button>
        </div>
      </div>

      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-md fade-in" onClick={() => setConfirmOpen(false)}>
          <div className="glass-card p-8 max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
            <div className="chromatic-edge" /><div className="glass-noise" />
            <div className="relative z-10">
              <h3 className="font-black text-3xl tracking-tight mb-3">THIS IS PERMANENT.</h3>
              <p className="text-white/70 mb-5">Type <span className="font-mono text-white">DELETE</span> to confirm. You'll lose access to {library.length} plugins in your library. Your orders will be anonymized for our records, but your name and email will be removed.</p>
              <input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="Type DELETE here" className="input-glass mb-5" />
              <div className="flex justify-end gap-3">
                <button onClick={() => setConfirmOpen(false)} className="btn-ghost !text-xs">KEEP MY ACCOUNT</button>
                <button disabled={typed !== "DELETE"} className="btn-ghost !text-xs border-[var(--accent-red)] !text-[var(--accent-red-glow)] disabled:opacity-40">CONFIRM DELETE</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Panel>
  );
}

function HelpSection() {
  return (
    <Panel id="help" title="GET HELP" sub="Stuck? We got you.">
      <div className="grid md:grid-cols-3 gap-5">
        <HelpTile icon={HelpCircle} title="FREQUENTLY ASKED" sub="Install issues, refunds, DAW compatibility." cta="BROWSE FAQS →" to="/faq" ghost />
        <HelpTile icon={Mail} title="HIT US UP" sub="Real human reply, usually within a few hours." cta="CONTACT US →" to="/contact-us" ghost />
        <HelpTile icon={Ticket} title="ABOUT AN ORDER?" sub="Have your order ID ready and we'll sort it." cta="OPEN ORDER HISTORY →" to="/account/orders" ghost />
      </div>
    </Panel>
  );
}

function HelpTile({ icon: Icon, title, sub, cta, to, ghost }: { icon: typeof HelpCircle; title: string; sub: string; cta: string; to: string; ghost?: boolean }) {
  const isExternal = /^https?:\/\/|^mailto:/.test(to);
  const className = `${ghost ? "btn-ghost" : "btn-primary"} !text-xs !py-2.5 inline-flex`;
  return (
    <div className="border border-white/10 rounded-2xl p-5 bg-white/[0.02] flex flex-col">
      <Icon className="w-7 h-7 text-white/75 mb-3" strokeWidth={1.4} />
      <h4 className="font-black text-base tracking-tight mb-1">{title}</h4>
      <p className="text-white/60 text-sm mb-5 flex-1">{sub}</p>
      {isExternal ? (
        <a href={to} className={className}>{cta}</a>
      ) : (
        <Link to={to} className={className}>{cta}</Link>
      )}
    </div>
  );
}
