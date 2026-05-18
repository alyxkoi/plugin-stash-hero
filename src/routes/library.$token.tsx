import { createFileRoute, Link } from "@tanstack/react-router";
import { UserPlus } from "lucide-react";
import { LibraryView } from "@/components/LibraryView";

export const Route = createFileRoute("/library/$token")({
  head: () => ({ meta: [{ title: "Your Library — Plugin Warehouse" }] }),
  component: GuestLibrary,
});

function GuestLibrary() {
  return (
    <div className="max-w-[1280px] mx-auto px-4 md:px-8 py-8 space-y-8">
      <div className="glass-card p-4 md:p-5">
        <div className="chromatic-edge" /><div className="glass-noise" />
        <div className="relative z-10 flex items-center gap-4 flex-wrap">
          <UserPlus className="w-5 h-5 text-white/75 shrink-0" strokeWidth={1.5} />
          <span className="flex-1 text-sm text-white/80">Create an account to access this library from anywhere.</span>
          <Link to="/signup" className="btn-ghost !text-xs !py-2 !px-4">CREATE ACCOUNT →</Link>
        </div>
      </div>
      <LibraryView />
    </div>
  );
}
