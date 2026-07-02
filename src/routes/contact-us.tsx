import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { GlassCard } from "@/components/GlassCard";
import { Field } from "@/components/AuthLayout";
import { submitContactMessage } from "@/lib/contact.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/contact-us")({
  head: () => ({
    meta: [
      { title: "Contact — Plugin Warehouse" },
      { name: "description", content: "Get in touch with Plugin Warehouse. Most replies within a few hours." },
    ],
  }),
  component: Contact,
});

function Contact() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("general");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const SUBJECT_LABEL: Record<string, string> = {
    install: "Install help",
    refund: "Refund",
    order: "Order issue",
    compat: "Plugin compatibility",
    general: "General",
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await submitContactMessage({
        data: {
          name: name.trim(),
          email: email.trim(),
          subject: SUBJECT_LABEL[subject] ?? subject,
          message: message.trim(),
        },
      });
      if (res.ok) {
        setDone(true);
      } else {
        toast.error(res.error ?? "Something went wrong.");
      }
    } catch (err) {
      toast.error((err as Error).message ?? "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="px-4 md:px-12 py-12 max-w-2xl mx-auto">
      <h1 className="font-black chrome-text leading-[0.95] mb-3" style={{ fontSize: "clamp(2.5rem, 6vw, 4.5rem)" }}>
        GET IN TOUCH.
      </h1>
      <p className="text-lg text-white/65 mb-8">Most replies hit within a few hours during business hours.</p>

      <GlassCard className="p-6 md:p-8">
        {done ? (
          <div className="text-center py-6">
            <CheckCircle2 className="w-12 h-12 text-[var(--accent-red)] mx-auto mb-4" strokeWidth={1.5} />
            <h2 className="font-display text-2xl tracking-wider mb-2">MESSAGE SENT.</h2>
            <p className="text-white/70 mb-6">Thanks — we'll get back to you within a few hours.</p>
            <button
              onClick={() => { setDone(false); setName(""); setEmail(""); setSubject("general"); setMessage(""); }}
              className="btn-ghost !text-xs"
            >
              SEND ANOTHER →
            </button>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <Field label="NAME" required value={name} onChange={(e) => setName(e.target.value)} />
            <Field label="EMAIL" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            <label className="block">
              <div className="font-mono text-xs text-white/60 mb-1.5 tracking-wider">SUBJECT</div>
              <select className="input-glass select-glass" value={subject} onChange={(e) => setSubject(e.target.value)}>
                <option value="install">Install help</option>
                <option value="refund">Refund</option>
                <option value="order">Order issue</option>
                <option value="compat">Plugin compatibility</option>
                <option value="general">General</option>
              </select>
            </label>
            <label className="block">
              <div className="font-mono text-xs text-white/60 mb-1.5 tracking-wider">MESSAGE</div>
              <textarea
                className="input-glass min-h-[140px]"
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={5000}
              />
            </label>
            <button type="submit" disabled={submitting} className="btn-primary w-full !py-4 disabled:opacity-70 flex items-center justify-center gap-2">
              {submitting ? (<><Loader2 className="w-4 h-4 animate-spin" /> SENDING...</>) : "SEND MESSAGE →"}
            </button>
          </form>
        )}
      </GlassCard>

      <div className="mt-8 text-center font-mono text-sm text-white/60">
        OR EMAIL US DIRECTLY → <a className="text-white" href="mailto:pluginwh@gmail.com">pluginwh@gmail.com</a>
      </div>
    </div>
  );
}
