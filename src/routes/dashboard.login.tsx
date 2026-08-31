import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import logo from "@/assets/logo-dashboard.webp";
import { supabase } from "@/integrations/supabase/client";
import { sendPasswordResetEmail } from "@/lib/auth-email.functions";

export const Route = createFileRoute("/dashboard/login")({
  head: () => ({ meta: [{ title: "Dashboard access — Plugin Warehouse" }] }),
  component: DashboardLogin,
});

function DashboardLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [recover, setRecover] = useState(false);
  const [recoverEmail, setRecoverEmail] = useState("");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setError(null);
    if (!email.trim() || !password) { setError("Enter email and password."); return; }
    setBusy(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error || !data.user || !data.session) {
        const msg = error && /invalid login credentials/i.test(error.message)
          ? "Incorrect email or password."
          : error?.message ?? "Sign-in didn't complete. Try again.";
        setError(msg);
        return;
      }
      const { data: roleRow, error: roleErr } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (roleErr) {
        setError("Couldn't verify admin access. Try again.");
        return;
      }
      if (!roleRow) {
        await supabase.auth.signOut();
        setError("This account is not an admin. Contact support if you think that's wrong.");
        return;
      }
      navigate({ to: "/dashboard" as any });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  };


  const sendReset = useServerFn(sendPasswordResetEmail);
  const onRecover = async () => {
    setError(null);
    if (!recoverEmail) { setError("Enter a recovery email."); return; }
    try {
      await sendReset({ data: { email: recoverEmail.trim(), redirectTo: `${window.location.origin}/reset-password` } });
      alert("If that email matches an admin account, a reset link is on its way.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send reset email.");
    }
  };


  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 relative">
      <div className="glass-card p-8 w-full max-w-[420px] relative z-10">
        <div className="chromatic-edge" />
        <div className="relative z-10">
          <div className="flex flex-col items-center mb-6">
            <img src={logo} alt="Plugin Warehouse" width={420} height={120} className="h-12 w-auto object-contain mb-3" style={{ filter: "drop-shadow(0 2px 12px rgba(255,0,60,0.35))" }} />
            <div className="label-mini opacity-60 text-[10px]">Dashboard access</div>
          </div>

          <form onSubmit={onSubmit} className="space-y-3">
            <Input label="Email" type="email" value={email} onChange={setEmail} />
            <Input label="Password" type="password" value={password} onChange={setPassword} />
            {error && <div className="text-xs text-[var(--accent-red-glow)] font-mono">{error}</div>}
            <button type="submit" disabled={busy} className="btn-primary w-full !text-sm !py-3 disabled:opacity-60">{busy ? "Signing in…" : "Log in"}</button>
          </form>

          <div className="mt-4 text-center">
            <button type="button" onClick={() => setRecover(!recover)} className="text-[10px] text-white/40 hover:text-white/70 font-mono">
              Trouble logging in?
            </button>
            {recover && (
              <div className="mt-3">
                <Input label="Recovery email" type="email" value={recoverEmail} onChange={setRecoverEmail} />
                <button type="button" onClick={onRecover} className="btn-ghost w-full mt-2 !text-xs">Send recovery link</button>
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
