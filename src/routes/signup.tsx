import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AuthLayout, Field, PasswordField } from "@/components/AuthLayout";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";

export const Route = createFileRoute("/signup")({
  head: () => ({ meta: [{ title: "Create Account — Plugin Warehouse" }] }),
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [marketing, setMarketing] = useState(true);
  const [error, setError] = useState<React.ReactNode | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (password !== confirmPassword) { setError("Passwords don't match."); return; }
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/account`,
        data: { marketing_opt_in: marketing },
      },
    });
    setBusy(false);
    if (error) {
      if (/already registered|already been registered|user already/i.test(error.message)) {
        setError(<>An account with this email already exists. <Link to="/login" className="text-[var(--accent-red-glow)] font-bold underline">Try logging in →</Link></>);
      } else {
        setError(error.message);
      }
      return;
    }
    // Supabase returns a user with empty `identities` array when the email already exists (with confirm off).
    if (data.user && (!data.user.identities || data.user.identities.length === 0)) {
      setError(<>An account with this email already exists. <Link to="/login" className="text-[var(--accent-red-glow)] font-bold underline">Try logging in →</Link></>);
      return;
    }
    if (data.session) {
      navigate({ to: "/account" });
      return;
    }
    // No session but user created — sign them in immediately (email confirmation is off).
    const { error: signInErr } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (signInErr) { setError(signInErr.message); return; }
    navigate({ to: "/account" });
  };

  const onGoogle = async () => {
    setError(null);
    const res = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/account" });
    if (res.error) setError(res.error.message);
  };

  return (
    <AuthLayout
      eyebrow="JOIN THE WAREHOUSE"
      headline="JOIN THE WAREHOUSE."
      sub="Lifetime access. No license keys. Fraction of the price."
      footer={<>Already got an account? <Link to="/login" className="text-[var(--accent-red-glow)] font-bold">SIGN IN →</Link></>}
    >
      <form onSubmit={onSubmit}>
        <Field label="EMAIL" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <PasswordField label="PASSWORD" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
        <PasswordField label="CONFIRM PASSWORD" required minLength={6} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
        <label className="flex items-center gap-2 text-sm text-white/70 mb-5">
          <input type="checkbox" checked={marketing} onChange={(e) => setMarketing(e.target.checked)} className="accent-[var(--accent-red)]" /> Email me new drops, sales, and producer-only deals.
        </label>
        {error && <div className="text-xs text-[var(--accent-red-glow)] font-mono mb-3">{error}</div>}
        <button disabled={busy} className="btn-primary w-full !text-base !py-4 disabled:opacity-60">{busy ? "CREATING…" : "CREATE ACCOUNT →"}</button>
        <div className="flex items-center gap-3 my-6"><div className="flex-1 h-px bg-white/15" /><span className="font-mono text-xs text-white/40">OR</span><div className="flex-1 h-px bg-white/15" /></div>
        <button type="button" onClick={onGoogle} className="btn-ghost w-full">CONTINUE WITH GOOGLE</button>
      </form>
    </AuthLayout>
  );
}
