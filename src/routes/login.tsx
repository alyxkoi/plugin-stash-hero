import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AuthLayout, Field, PasswordField } from "@/components/AuthLayout";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { claimMyOrders } from "@/lib/order-claim.functions";

export const Route = createFileRoute("/login")({
  validateSearch: (s: Record<string, unknown>): { next?: string } => ({
    next:
      typeof s.next === "string" && s.next.startsWith("/") && !s.next.startsWith("//")
        ? s.next
        : undefined,
  }),
  head: () => ({ meta: [{ title: "Sign In — Plugin Warehouse" }] }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { next } = Route.useSearch();
  const dest = next ?? "/account";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setError(null);
    if (!email.trim() || !password) { setError("Enter your email and password."); return; }
    setBusy(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) {
        const msg = /invalid login credentials/i.test(error.message)
          ? "Incorrect email or password."
          : error.message || "Sign-in failed. Try again.";
        setError(msg);
        return;
      }
      if (!data.session) { setError("Sign-in didn't complete. Try again."); return; }
      // Reconcile any guest purchases made with this (verified) email address.
      try { await claimMyOrders(); } catch { /* non-blocking */ }
      navigate({ to: dest });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  };


  const onGoogle = async () => {
    setError(null);
    const res = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + dest });
    if (res.error) setError(res.error.message);
  };

  return (
    <AuthLayout
      eyebrow="PULL UP"
      headline="WELCOME BACK."
      sub="Sign in to your stash."
      footer={<>New here? <Link to="/signup" className="text-[var(--accent-red-glow)] font-bold">CREATE ACCOUNT →</Link></>}
    >
      <form onSubmit={onSubmit}>
        <Field label="EMAIL" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <PasswordField label="PASSWORD" required value={password} onChange={(e) => setPassword(e.target.value)} />
        <div className="text-right -mt-3 mb-4"><Link to="/forgot-password" className="text-xs text-white/60 hover:text-white">Forgot it?</Link></div>
        {error && <div className="text-xs text-[var(--accent-red-glow)] font-mono mb-3">{error}</div>}
        <button disabled={busy} className="btn-primary w-full !text-base !py-4 disabled:opacity-60">{busy ? "SIGNING IN…" : "SIGN IN →"}</button>
        <div className="flex items-center gap-3 my-6"><div className="flex-1 h-px bg-white/15" /><span className="font-mono text-xs text-white/40">OR</span><div className="flex-1 h-px bg-white/15" /></div>
        <button type="button" onClick={onGoogle} className="btn-ghost w-full">CONTINUE WITH GOOGLE</button>
      </form>
    </AuthLayout>
  );
}
