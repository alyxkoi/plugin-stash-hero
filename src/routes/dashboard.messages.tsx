import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Mail, Loader2 } from "lucide-react";
import { DashboardShell } from "@/components/DashboardShell";
import { supabase } from "@/integrations/supabase/client";

type Message = {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  created_at: string;
};

export const Route = createFileRoute("/dashboard/messages")({
  head: () => ({ meta: [{ title: "Messages — Plugin Warehouse" }] }),
  component: MessagesPage,
});

function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function MessagesPage() {
  const [rows, setRows] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Message | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("contact_messages")
        .select("id,name,email,subject,message,created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) console.error(error);
      setRows((data as Message[] | null) ?? []);
      setLoading(false);
    })();
  }, []);

  return (
    <DashboardShell title="Messages">
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_420px] gap-6">
        <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
          <div className="px-5 py-3 border-b border-white/10 flex items-center justify-between">
            <div className="font-display tracking-wider text-sm text-white/80">CONTACT SUBMISSIONS</div>
            <div className="text-xs text-white/50">{rows.length} total</div>
          </div>
          {loading ? (
            <div className="p-10 flex items-center justify-center text-white/60"><Loader2 className="w-5 h-5 animate-spin" /></div>
          ) : rows.length === 0 ? (
            <div className="p-10 text-center text-white/50">
              <Mail className="w-8 h-8 mx-auto mb-3 opacity-50" strokeWidth={1.5} />
              No messages yet.
            </div>
          ) : (
            <ul className="divide-y divide-white/10">
              {rows.map((m) => (
                <li key={m.id}>
                  <button
                    onClick={() => setSelected(m)}
                    className={`w-full text-left px-5 py-4 hover:bg-white/[0.04] transition ${selected?.id === m.id ? "bg-white/[0.06]" : ""}`}
                  >
                    <div className="flex items-baseline justify-between gap-4 mb-1">
                      <div className="font-medium text-white truncate">{m.name}</div>
                      <div className="text-xs text-white/50 shrink-0 font-mono">{timeAgo(m.created_at)}</div>
                    </div>
                    <div className="text-sm text-white/80 truncate">{m.subject}</div>
                    <div className="text-xs text-white/50 truncate mt-1">{m.email}</div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6 min-h-[300px]">
          {selected ? (
            <div>
              <div className="text-xs text-white/50 font-mono mb-2">{new Date(selected.created_at).toLocaleString()}</div>
              <h2 className="text-2xl font-bold text-white mb-1">{selected.subject}</h2>
              <div className="text-sm text-white/70 mb-1">From <span className="text-white font-medium">{selected.name}</span></div>
              <a href={`mailto:${selected.email}?subject=Re:%20${encodeURIComponent(selected.subject)}`} className="text-sm text-[var(--accent-red)] hover:underline">
                {selected.email}
              </a>
              <div className="mt-5 pt-5 border-t border-white/10 whitespace-pre-wrap text-white/90 text-[15px] leading-relaxed">
                {selected.message}
              </div>
              <a
                href={`mailto:${selected.email}?subject=Re:%20${encodeURIComponent(selected.subject)}`}
                className="btn-primary inline-flex mt-6 !text-xs"
              >
                REPLY VIA EMAIL →
              </a>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-white/50 py-10">
              <Mail className="w-8 h-8 mb-3 opacity-50" strokeWidth={1.5} />
              <div className="text-sm">Select a message to read it.</div>
            </div>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
