import { createFileRoute, Link } from "@tanstack/react-router";
import { AuthLayout, Field } from "@/components/AuthLayout";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Reset Password — Plugin Warehouse" }] }),
  component: () => (
    <AuthLayout eyebrow="// SET A NEW ONE" headline="NEW PASSWORD." sub="Make it a good one.">
      <form onSubmit={(e) => e.preventDefault()}>
        <Field label="NEW PASSWORD" type="password" required />
        <Field label="CONFIRM PASSWORD" type="password" required />
        <button className="btn-primary w-full !text-base !py-4">RESET PASSWORD →</button>
      </form>
      <div className="mt-6 text-center text-sm"><Link to="/login" className="text-white/60 hover:text-white">← Back to sign in</Link></div>
    </AuthLayout>
  ),
});
