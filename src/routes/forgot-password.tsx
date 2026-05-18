import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AuthLayout, Field } from "@/components/AuthLayout";
import { Check } from "lucide-react";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({ meta: [{ title: "Forgot Password — Plugin Warehouse" }] }),
  component: () => {
    const [sent, setSent] = useState(false);
    const [email, setEmail] = useState("");
    return (
      <AuthLayout eyebrow="// LET'S GET YOU BACK IN" headline={sent ? "CHECK YOUR INBOX." : "FORGOT IT? HAPPENS."} sub={sent ? `Reset link sent to ${email}. Should hit within a minute.` : "Drop your email, we'll send a reset link."}>
        {!sent ? (
          <form onSubmit={(e) => { e.preventDefault(); setSent(true); }}>
            <Field label="EMAIL" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            <button className="btn-primary w-full !text-base !py-4">SEND RESET LINK →</button>
          </form>
        ) : (
          <div className="fade-in">
            <div className="w-14 h-14 rounded-full border-2 border-white/20 flex items-center justify-center mx-auto mb-4"><Check className="w-7 h-7 text-[var(--accent-red-glow)]" /></div>
            <button className="btn-ghost w-full mb-3">RESEND →</button>
            <button onClick={() => setSent(false)} className="text-sm text-white/60 hover:text-white w-full">Wrong email? TRY AGAIN →</button>
          </div>
        )}
        <div className="mt-6 text-center text-sm"><Link to="/login" className="text-white/60 hover:text-white">← Back to sign in</Link></div>
      </AuthLayout>
    );
  },
});
