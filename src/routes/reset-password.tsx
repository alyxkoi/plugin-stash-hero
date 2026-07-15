import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AuthLayout, PasswordField } from "@/components/AuthLayout";
import { supabase } from "@/integrations/supabase/client";
import { validatePassword, PASSWORD_RULE_MESSAGE } from "@/lib/password";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Reset Password — Plugin Warehouse" }] }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    // Supabase auto-detects the recovery token from the URL hash.
    // Wait briefly for that, then check for an active session.
    const check = async () => {
      const { data } = await supabase.auth.getSession();
      setHasSession(!!data.session);
      setReady(true);
    };
    // Give supabase-js a tick to parse the URL.
    const t = setTimeout(check, 200);
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setHasSession(!!session);
        setReady(true);
      }
    });
    return () => { clearTimeout(t); sub.subscription.unsubscribe(); };
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const v = validatePassword(password);
    if (v) { setError(v); return; }
    if (password !== confirm) { setError("Passwords don't match."); return; }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) { setError(error.message); return; }
    setDone(true);
    setTimeout(() => navigate({ to: "/account" }), 1500);
  };

  return (
    <AuthLayout eyebrow="SET A NEW ONE" headline={done ? "YOU'RE SET." : "NEW PASSWORD."} sub={done ? "Password updated. Taking you to your account…" : "Make it a good one."}>
      {!ready ? (
        <div className="text-white/60 font-mono text-sm">Checking your reset link…</div>
      ) : !hasSession ? (
        <div>
          <div className="text-sm text-white/70 mb-4">This reset link is invalid or has expired.</div>
          <Link to="/forgot-password" className="btn-primary w-full !text-base !py-4 inline-block text-center">REQUEST A NEW LINK →</Link>
        </div>
      ) : done ? null : (
        <form onSubmit={submit}>
          <PasswordField label="NEW PASSWORD" required value={password} onChange={(e) => setPassword(e.target.value)} />
          <PasswordField label="CONFIRM PASSWORD" required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          <div className="text-[11px] font-mono text-white/50 -mt-2 mb-3">{PASSWORD_RULE_MESSAGE}</div>
          {error && <div className="text-xs text-[var(--accent-red-glow)] font-mono mb-3">{error}</div>}
          <button disabled={busy} className="btn-primary w-full !text-base !py-4 disabled:opacity-60">{busy ? "UPDATING…" : "RESET PASSWORD →"}</button>
        </form>
      )}
      <div className="mt-6 text-center text-sm"><Link to="/login" className="text-white/60 hover:text-white">← Back to sign in</Link></div>
    </AuthLayout>
  );
}
