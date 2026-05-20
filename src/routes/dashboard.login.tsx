import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import logo from "@/assets/logo.png";
import { setAdminSession } from "@/lib/dashboard-mock";

export const Route = createFileRoute("/dashboard/login")({
  head: () => ({ meta: [{ title: "Dashboard access — Plugin Warehouse" }] }),
  component: DashboardLogin,
});

function DashboardLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [recover, setRecover] = useState(false);

  const ADMIN_EMAIL = "pluginwh@gmail.com";
  const ADMIN_PASSWORD = "Pluginwh1237!";

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email || !password) { setError("Enter email and password."); return; }
    // TODO: backend — replace with supabase.auth.signInWithPassword + users.is_admin check.
    if (email.trim().toLowerCase() !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
      setError("Invalid admin credentials.");
      return;
    }
    setAdminSession(email.trim().toLowerCase());
    navigate({ to: "/dashboard" as any });
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 relative" style={{ background: "var(--bg-base)" }}>
      <div className="absolute inset-0 pointer-events-none" style={{
        background: "radial-gradient(ellipse 70% 50% at 50% 30%, rgba(255,0,60,0.18), transparent 60%), radial-gradient(ellipse 50% 50% at 70% 90%, rgba(14,11,209,0.18), transparent 60%)",
      }} />
      <div className="glass-card p-8 w-full max-w-[420px] relative z-10">
        <div className="chromatic-edge" />
        <div className="relative z-10">
          <div className="flex flex-col items-center mb-6">
            <img src={logo} alt="Plugin Warehouse" className="h-12 w-auto object-contain mb-3" style={{ filter: "drop-shadow(0 2px 12px rgba(255,0,60,0.35))" }} />
            <div className="label-mini opacity-60 text-[10px]">Dashboard access</div>
          </div>

          <form onSubmit={onSubmit} className="space-y-3">
            <Input label="Email" type="email" value={email} onChange={setEmail} />
            <Input label="Password" type="password" value={password} onChange={setPassword} />
            {error && <div className="text-xs text-[var(--accent-red-glow)] font-mono">{error}</div>}
            <button type="submit" className="btn-primary w-full !text-sm !py-3">Log in</button>
          </form>

          <div className="mt-4 text-center">
            <button type="button" onClick={() => setRecover(!recover)} className="text-[10px] text-white/40 hover:text-white/70 font-mono">
              Trouble logging in?
            </button>
            {recover && (
              <div className="mt-3">
                <Input label="Recovery email" type="email" value="" onChange={() => {}} />
                <button type="button" onClick={() => alert("If that email matches an admin account, a reset link is on its way.")} className="btn-ghost w-full mt-2 !text-xs">Send recovery link</button>
                <p className="text-[10px] text-white/40 mt-2">A reset link will arrive shortly.</p>
              </div>
            )}
          </div>

          <div className="mt-6 text-center text-[11px] text-white/50 space-y-1">
            <div><Link to="/" className="text-[var(--accent-red-glow)] hover:underline">← Return to storefront</Link></div>
            <div><Link to="/contact-us" className="hover:text-white/80 underline">Contact support</Link></div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Input({ label, type, value, onChange }: { label: string; type: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="label-mini text-[10px] opacity-60 mb-1 block">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-[var(--accent-red)] transition"
      />
    </label>
  );
}
