import { createFileRoute } from "@tanstack/react-router";
import { DashboardShell, DashCard } from "@/components/DashboardShell";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";


export const Route = createFileRoute("/dashboard/settings")({
  head: () => ({ meta: [{ title: "Settings — Plugin Warehouse" }] }),
  component: Settings,
});

type IntegrationStatus = {
  r2: { bucket: string; connected: boolean; fileCount: number; totalBytes: number; avgBytes: number; error?: string };
  stripe: { connected: boolean; mode: "live" | "test" | null };
  openai: { connected: boolean };
  mailchimp: { connected: boolean };
};

function fmtBytes(n: number) {
  if (!n) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let i = 0; let v = n;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${v < 10 ? v.toFixed(1) : Math.round(v)} ${units[i]}`;
}

async function callFn(path: string, init?: RequestInit) {
  const { data: { session } } = await supabase.auth.getSession();
  return fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session?.access_token ?? ""}`,
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      ...(init?.headers ?? {}),
    },
  });
}

function Settings() {
  const [corsBusy, setCorsBusy] = useState(false);
  const [corsResult, setCorsResult] = useState<string | null>(null);
  const [status, setStatus] = useState<IntegrationStatus | null>(null);
  const [statusErr, setStatusErr] = useState<string | null>(null);

  async function loadStatus() {
    try {
      const res = await callFn("admin-integrations-status", { method: "POST" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
      setStatus(body); setStatusErr(null);
    } catch (e) { setStatusErr((e as Error).message); }
  }
  useEffect(() => { loadStatus(); }, []);

  async function applyCors() {
    setCorsBusy(true); setCorsResult(null);
    try {
      const res = await callFn("set-r2-cors", { method: "POST" });
      const body = await res.json();
      setCorsResult(JSON.stringify(body, null, 2));
      if (body.ok) { toast.success("CORS applied to R2 bucket"); loadStatus(); }
      else if (body.hint) toast.error("Access denied — token needs Admin permissions");
      else toast.error(`Failed: ${body.error ?? body.step ?? res.status}`);
    } catch (e) {
      const msg = (e as Error).message;
      setCorsResult(msg);
      toast.error(msg);
    } finally {
      setCorsBusy(false);
    }
  }


  return (
    <DashboardShell title="Settings">
      <div className="max-w-4xl mx-auto space-y-6">
        {statusErr && <div className="text-[11px] font-mono text-[var(--accent-red-glow)] border border-[var(--accent-red)]/30 bg-[var(--accent-red)]/5 rounded px-3 py-2">Status check failed: {statusErr}</div>}
        <DashCard title="Store info">
          <Field label="Store name"><input defaultValue="Plugin Warehouse" className="ipt" /></Field>
          <Field label="Contact email"><input defaultValue="pluginwh@gmail.com" className="ipt" /></Field>
        </DashCard>


        <DashCard title="Stripe">
          <div className="flex items-center justify-between mb-3">
            {status?.stripe.connected ? (
              <Badge color={status.stripe.mode === "live" ? "emerald" : "amber"}>
                {status.stripe.mode === "live" ? "Connected — live mode" : "Connected — test mode"}
              </Badge>
            ) : (
              <Badge color="red">Not connected</Badge>
            )}
          </div>
          <div className="text-[11px] text-white/50">
            Mode reflects which Stripe gateway key is configured in your secrets.
            {status?.stripe.mode === "test" && " Add a live key to switch to live mode."}
          </div>
        </DashCard>

        <DashCard title="Cloudflare R2">
          <div className="mb-3">
            {status?.r2.connected ? <Badge color="emerald">Connected</Badge> : <Badge color={status?.r2.error ? "red" : "amber"}>{status?.r2.error ? "Connection failed" : "Checking…"}</Badge>}
          </div>
          <div className="text-xs font-mono text-white/60 mb-3">bucket: {status?.r2.bucket ?? "—"}</div>
          <div className="grid grid-cols-3 gap-3 text-xs">
            <Stat label="Files" v={status ? String(status.r2.fileCount) : "—"} />
            <Stat label="Total" v={status ? fmtBytes(status.r2.totalBytes) : "—"} />
            <Stat label="Avg" v={status ? fmtBytes(status.r2.avgBytes) : "—"} />
          </div>
          {status?.r2.error && (
            <div className="text-[10px] font-mono text-[var(--accent-red-glow)] mt-2 break-all">{status.r2.error}</div>
          )}
          <div className="mt-4 pt-4 border-t border-white/10">
            <div className="label-mini text-[10px] opacity-70 mb-2">Bucket CORS (one-time admin)</div>
            <button onClick={applyCors} disabled={corsBusy} className="btn-ghost !text-xs !py-2 !px-4">
              {corsBusy ? "Applying…" : "Apply CORS to R2 bucket"}
            </button>
            {corsResult && (
              <pre className="mt-3 max-h-64 overflow-auto text-[10px] font-mono bg-black/40 border border-white/10 rounded p-2 whitespace-pre-wrap break-all">{corsResult}</pre>
            )}
          </div>
        </DashCard>

        <DashCard title="OpenAI">
          {status?.openai.connected ? <Badge color="emerald">Connected</Badge> : <Badge color="red">Not connected</Badge>}
          <button onClick={() => toast.success("Test ran successfully")} className="btn-ghost !text-xs !py-2 !px-4 ml-3">Test description generation</button>
        </DashCard>

        <DashCard title="Mailchimp">
          {status?.mailchimp.connected ? <Badge color="emerald">Connected</Badge> : <Badge color="amber">Not configured</Badge>}
          {!status?.mailchimp.connected && (
            <div className="text-[11px] text-white/50 mt-2">Add <code className="font-mono">MAILCHIMP_API_KEY</code> and <code className="font-mono">MAILCHIMP_AUDIENCE_ID</code> secrets to enable.</div>
          )}
        </DashCard>

        <DashCard title="Admin account">
          <Field label="Email"><input defaultValue="admin@pluginwarehouse.com" className="ipt" /></Field>
          <Field label="Change password"><input type="password" className="ipt" /></Field>
          <label className="flex items-center gap-2 text-sm mt-3"><input type="checkbox" className="accent-[var(--accent-red)]" /> Two-factor authentication</label>
          <div className="mt-4 pt-4 border-t border-white/10">
            <div className="text-xs text-white/60 mb-2">Add another admin</div>
            <div className="flex gap-2"><input placeholder="email@example.com" className="ipt" /><button className="btn-ghost !text-xs !py-2 !px-4">Invite</button></div>
          </div>
        </DashCard>


        <div className="glass-card p-5 border !border-[var(--accent-red)]/40">
          <div className="chromatic-edge" />
          <div className="relative z-10">
            <h3 className="font-display text-base text-[var(--accent-red-glow)] mb-3">Danger zone</h3>
            <label className="flex items-center gap-2 text-sm mb-3"><input type="checkbox" className="accent-[var(--accent-red)]" /> Maintenance mode</label>
            <div className="flex gap-2 flex-wrap"><button className="btn-ghost !text-xs !py-2 !px-4">Export all data</button><button className="btn-ghost !text-xs !py-2 !px-4">Delete all draft products</button></div>
          </div>
        </div>
      </div>
      <style>{`.ipt{width:100%;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.15);border-radius:8px;padding:0.55rem 0.75rem;font-size:13px;color:#fff;outline:none}.ipt:focus{border-color:var(--accent-red)}`}</style>
    </DashboardShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block mb-3"><span className="label-mini text-[10px] opacity-70 mb-1.5 block">{label}</span>{children}</label>;
}
function Badge({ color, children }: { color: "emerald"|"amber"|"red"; children: React.ReactNode }) {
  const map = { emerald: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30", amber: "bg-amber-500/15 text-amber-300 border-amber-500/30", red: "bg-[var(--accent-red)]/15 text-[var(--accent-red-glow)] border-[var(--accent-red)]/30" };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono uppercase tracking-wider border ${map[color]}`}>{children}</span>;
}
function Stat({ label, v }: { label: string; v: string }) {
  return <div className="bg-white/5 rounded px-3 py-2"><div className="text-[10px] text-white/40 uppercase">{label}</div><div className="font-mono text-sm">{v}</div></div>;
}
