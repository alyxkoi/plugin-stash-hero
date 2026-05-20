import { createFileRoute, Link } from "@tanstack/react-router";
import { AuthLayout, Field } from "@/components/AuthLayout";

export const Route = createFileRoute("/signup")({
  head: () => ({ meta: [{ title: "Create Account — Plugin Warehouse" }] }),
  component: () => (
    <AuthLayout eyebrow="JOIN THE WAREHOUSE" headline="JOIN THE WAREHOUSE." sub="Lifetime access. No license keys. Fraction of the price." footer={<>Already got an account? <Link to="/login" className="text-[var(--accent-red-glow)] font-bold">SIGN IN →</Link></>}>
      <form onSubmit={(e) => e.preventDefault()}>
        <Field label="EMAIL" type="email" required />
        <Field label="PASSWORD" type="password" required />
        <label className="flex items-center gap-2 text-sm text-white/70 mb-5"><input type="checkbox" defaultChecked className="accent-[var(--accent-red)]" /> Email me new drops, sales, and producer-only deals.</label>
        <button className="btn-primary w-full !text-base !py-4">CREATE ACCOUNT →</button>
        <div className="flex items-center gap-3 my-6"><div className="flex-1 h-px bg-white/15" /><span className="font-mono text-xs text-white/40">OR</span><div className="flex-1 h-px bg-white/15" /></div>
        <button type="button" className="btn-ghost w-full">CONTINUE WITH GOOGLE</button>
      </form>
    </AuthLayout>
  ),
});
