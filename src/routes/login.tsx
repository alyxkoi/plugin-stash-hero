import { createFileRoute, Link } from "@tanstack/react-router";
import { AuthLayout, Field } from "@/components/AuthLayout";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign In — Plugin Warehouse" }] }),
  component: () => (
    <AuthLayout eyebrow="PULL UP" headline="WELCOME BACK." sub="Sign in to your stash." footer={<>New here? <Link to="/signup" className="text-[var(--accent-red-glow)] font-bold">CREATE ACCOUNT →</Link></>}>
      <form onSubmit={(e) => e.preventDefault()}>
        <Field label="EMAIL" type="email" required />
        <Field label="PASSWORD" type="password" required />
        <div className="text-right -mt-3 mb-4"><Link to="/forgot-password" className="text-xs text-white/60 hover:text-white">Forgot it?</Link></div>
        <button className="btn-primary w-full !text-base !py-4">SIGN IN →</button>
        <div className="flex items-center gap-3 my-6"><div className="flex-1 h-px bg-white/15" /><span className="font-mono text-xs text-white/40">OR</span><div className="flex-1 h-px bg-white/15" /></div>
        <button type="button" className="btn-ghost w-full">CONTINUE WITH GOOGLE</button>
      </form>
    </AuthLayout>
  ),
});
