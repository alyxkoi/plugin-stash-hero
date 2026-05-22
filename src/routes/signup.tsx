import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AuthLayout, Field } from "@/components/AuthLayout";
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
  const [marketing, setMarketing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); setInfo(null); setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/account`,
        data: { marketing_opt_in: marketing },
      },
    });
    setBusy(false);
    if (error) { setError(error.message); return; }
    if (data.session) {
      navigate({ to: "/account" });
    } else {
      setInfo("Check your email to confirm your account, then sign in.");
    }
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
        <Field label="PASSWORD" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
        <label className="flex items-center gap-2 text-sm text-white/70 mb-5">
          <input type="checkbox" checked={marketing} onChange={(e) => setMarketing(e.target.checked)} className="accent-[var(--accent-red)]" /> Email me new drops, sales, and producer-only deals.
        </label>
        {error && <div className="text-xs text-[var(--accent-red-glow)] font-mono mb-3">{error}</div>}
        {info && <div className="text-xs text-white/75 font-mono mb-3">{info}</div>}
        <button disabled={busy} className="btn-primary w-full !text-base !py-4 disabled:opacity-60">{busy ? "CREATING…" : "CREATE ACCOUNT →"}</button>
        <div className="flex items-center gap-3 my-6"><div className="flex-1 h-px bg-white/15" /><span className="font-mono text-xs text-white/40">OR</span><div className="flex-1 h-px bg-white/15" /></div>
        <button type="button" onClick={onGoogle} className="btn-ghost w-full">CONTINUE WITH GOOGLE</button>
      </form>
    </AuthLayout>
  );
}
