import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AuthLayout, Field } from "@/components/AuthLayout";
import { Check } from "lucide-react";
import { sendPasswordResetEmail } from "@/lib/auth-email.functions";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({ meta: [{ title: "Forgot Password — Plugin Warehouse" }] }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const sendReset = useServerFn(sendPasswordResetEmail);
  const [sent, setSent] = useState(false);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy || !email.trim()) return;
    setError(null);
    setBusy(true);
    try {
      await sendReset({
        data: {
          email: email.trim(),
          redirectTo: `${window.location.origin}/reset-password`,
        },
      });
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    setBusy(true);
    try {
      await sendReset({
        data: {
          email: email.trim(),
          redirectTo: `${window.location.origin}/reset-password`,
        },
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout
      eyebrow="LET'S GET YOU BACK IN"
      headline={sent ? "CHECK YOUR INBOX." : "FORGOT IT? HAPPENS."}
      sub={sent ? `If ${email} matches an account, a reset link is on the way. Should hit within a minute.` : "Drop your email, we'll send a reset link."}
    >
      {!sent ? (
        <form onSubmit={submit}>
          <Field label="EMAIL" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          {error && <div className="text-xs text-[var(--accent-red-glow)] font-mono mb-3">{error}</div>}
          <button disabled={busy} className="btn-primary w-full !text-base !py-4 disabled:opacity-60">{busy ? "SENDING…" : "SEND RESET LINK →"}</button>
        </form>
      ) : (
        <div className="fade-in">
          <div className="w-14 h-14 rounded-full border-2 border-white/20 flex items-center justify-center mx-auto mb-4"><Check className="w-7 h-7 text-[var(--accent-red-glow)]" /></div>
          <button onClick={resend} disabled={busy} className="btn-ghost w-full mb-3 disabled:opacity-60">{busy ? "SENDING…" : "RESEND →"}</button>
          <button onClick={() => setSent(false)} className="text-sm text-white/60 hover:text-white w-full">Wrong email? TRY AGAIN →</button>
        </div>
      )}
      <div className="mt-6 text-center text-sm"><Link to="/login" className="text-white/60 hover:text-white">← Back to sign in</Link></div>
    </AuthLayout>
  );
}
