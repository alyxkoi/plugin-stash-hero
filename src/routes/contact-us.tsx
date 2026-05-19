import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { GlassCard } from "@/components/GlassCard";
import { Field } from "@/components/AuthLayout";

export const Route = createFileRoute("/contact-us")({
  head: () => ({ meta: [{ title: "Contact — Plugin Warehouse" }] }),
  component: Contact,
});

function Contact() {
  const [subject, setSubject] = useState("general");
  return (
    <div className="px-4 md:px-12 py-12 max-w-2xl mx-auto">
      
      <h1 className="font-black chrome-text leading-[0.95] mb-3" style={{ fontSize: "clamp(2.5rem, 6vw, 4.5rem)" }}>GET IN TOUCH.</h1>
      <p className="text-lg text-white/65 mb-8">Most replies hit within a few hours during business hours.</p>

      <GlassCard className="p-6 md:p-8">
        <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
          <Field label="NAME" required />
          <Field label="EMAIL" type="email" required />
          <label className="block">
            <div className="font-mono text-xs text-white/60 mb-1.5 tracking-wider">SUBJECT</div>
            <select className="input-glass" value={subject} onChange={(e) => setSubject(e.target.value)}>
              <option value="install">Install help</option>
              <option value="refund">Refund</option>
              <option value="order">Order issue</option>
              <option value="compat">Plugin compatibility</option>
              <option value="general">General</option>
            </select>
          </label>
          {(subject === "order" || subject === "refund") && <Field label="ORDER ID" required />}
          <label className="block">
            <div className="font-mono text-xs text-white/60 mb-1.5 tracking-wider">MESSAGE</div>
            <textarea className="input-glass min-h-[140px]" required />
          </label>
          <button className="btn-primary w-full !py-4">SEND MESSAGE →</button>
        </form>
      </GlassCard>

      <div className="mt-8 text-center font-mono text-sm text-white/60">
        OR EMAIL US DIRECTLY → <a className="text-white" href="mailto:support@thepluginwarehouse.com">support@thepluginwarehouse.com</a>
      </div>
    </div>
  );
}
