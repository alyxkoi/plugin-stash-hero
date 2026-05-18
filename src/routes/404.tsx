import { createFileRoute, Link } from "@tanstack/react-router";
import { GlassCard } from "@/components/GlassCard";

export const Route = createFileRoute("/404")({
  head: () => ({ meta: [{ title: "404 — Wrong Warehouse" }] }),
  component: NotFound,
});

function NotFound() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-12 relative">
      <div className="absolute inset-0 pointer-events-none glow-breathe" style={{ background: "radial-gradient(ellipse at center, rgba(255,0,60,0.25), transparent 60%)" }} />
      <div className="relative w-full max-w-lg text-center">
        <GlassCard variant="heavy" className="p-10">
          <div className="font-black chrome-text leading-none" style={{ fontSize: "clamp(7rem, 16vw, 12rem)" }}>404</div>
          <h2 className="font-black text-3xl mt-2 mb-3">WRONG WAREHOUSE.</h2>
          <p className="text-white/65 mb-6">That plugin doesn't exist here. Either it never did, or we moved it.</p>
          <div className="flex gap-3 justify-center flex-wrap">
            <Link to="/" className="btn-primary">BACK TO HOMEPAGE →</Link>
            <Link to="/shop" className="btn-ghost">BROWSE THE WAREHOUSE →</Link>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
