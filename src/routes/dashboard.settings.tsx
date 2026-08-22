import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CreditCard, HardDrive, LogOut, PlugZap, Store, UserRound } from "lucide-react";
import { toast } from "sonner";
import { ChargedPanel, DashCard, DashboardShell } from "@/components/DashboardShell";
import { supabase } from "@/integrations/supabase/client";
import { signOut, useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/dashboard/settings")({
  head: () => ({ meta: [{ title: "Settings — Plugin Warehouse" }] }),
  component: Settings,
});

type Section = "store" | "payments" | "files" | "integrations" | "account";

type IntegrationStatus = {
  r2: {
    bucket: string;
    connected: boolean;
    fileCount: number;
    totalBytes: number;
    avgBytes: number;
    error?: string;
  };
  stripe: { connected: boolean; mode: "live" | "test" | null };
  openai: { connected: boolean };
  mailchimp: { connected: boolean };
};

const SECTIONS = [
  { value: "store", label: "Store", icon: Store },
  { value: "payments", label: "Payments", icon: CreditCard },
  { value: "files", label: "Files & storage", icon: HardDrive },
  { value: "integrations", label: "Integrations", icon: PlugZap },
  { value: "account", label: "Account", icon: UserRound },
] as const;

async function callFunction(path: string, init?: RequestInit) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
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
  const [section, setSection] = useState<Section>("files");
  const [corsBusy, setCorsBusy] = useState(false);
  const [corsResult, setCorsResult] = useState<string | null>(null);
  const [status, setStatus] = useState<IntegrationStatus | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [passwordBusy, setPasswordBusy] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  async function loadStatus() {
    try {
      const response = await callFunction("admin-integrations-status", { method: "POST" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? `HTTP ${response.status}`);
      setStatus(body);
      setStatusError(null);
    } catch (error) {
      setStatusError((error as Error).message);
    }
  }

  useEffect(() => {
    loadStatus();
  }, []);

  async function applyCors() {
    setCorsBusy(true);
    setCorsResult(null);
    try {
      const response = await callFunction("set-r2-cors", { method: "POST" });
      const body = await response.json();
      setCorsResult(JSON.stringify(body, null, 2));
      if (body.ok) {
        toast.success("CORS applied to the storage bucket");
        loadStatus();
      } else if (body.hint) {
        toast.error("Access denied — the token needs Admin permissions");
      } else {
        toast.error(`CORS could not be applied: ${body.error ?? body.step ?? response.status}`);
      }
    } catch (error) {
      const message = (error as Error).message;
      setCorsResult(message);
      toast.error(message);
    } finally {
      setCorsBusy(false);
    }
  }

  async function updatePassword() {
    if (password.length < 8) return toast.error("Use at least 8 characters for the new password.");
    setPasswordBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setPasswordBusy(false);
    if (error) return toast.error(error.message);
    setPassword("");
    toast.success("Admin password updated");
  }

  async function logout() {
    await signOut();
    navigate({ to: "/dashboard/login" as any, replace: true });
  }

  const connectionStates = [
    { label: "Storage", connected: !!status?.r2.connected },
    { label: "Payments", connected: !!status?.stripe.connected },
    { label: "OpenAI", connected: !!status?.openai.connected },
    { label: "Mailchimp", connected: !!status?.mailchimp.connected },
  ];
  const connectedCount = connectionStates.filter((item) => item.connected).length;

  return (
    <DashboardShell title="Settings">
      <ChargedPanel
        domain="volume"
        material="grain"
        form="arc"
        silhouette="full"
        title="System"
        className="dash-settings-horizon"
      >
        <div className="dash-system-map">
          <div className="dash-hero-value">{connectedCount}<small>/4</small></div>
          <div className="dash-system-nodes" role="img" aria-label={`${connectedCount} of four services connected`}>
            {connectionStates.map((item) => (
              <span key={item.label} data-connected={item.connected}>
                <i />
                <b>{item.label}</b>
              </span>
            ))}
          </div>
        </div>
      </ChargedPanel>
      <div className="dash-settings-layout">
        <aside className="dash-settings-nav" aria-label="Settings sections">
          {SECTIONS.map((item) => {
            const Icon = item.icon;
            return (
              <button
                type="button"
                key={item.value}
                onClick={() => setSection(item.value)}
                aria-current={section === item.value ? "page" : undefined}
                className={section === item.value ? "is-active" : ""}
              >
                <Icon size={18} strokeWidth={1.6} />
                <span>{item.label}</span>
                {item.value === "files" && (
                  <ConnectionDot
                    connected={!!status?.r2.connected}
                    label={status?.r2.connected ? "Connected" : "Not connected"}
                    compact
                  />
                )}
              </button>
            );
          })}
        </aside>

        <div className="dash-settings-content">
          {statusError && (
            <div className="dash-inline-error" role="alert">
              <span>Status check failed: {statusError}</span>
              <button type="button" onClick={loadStatus}>
                Retry
              </button>
            </div>
          )}

          {section === "store" && (
            <DashCard title="Store identity">
              <Field
                label="Store name"
                helper="Shown in customer-facing receipts and admin exports."
              >
                <input defaultValue="Plugin Warehouse" />
              </Field>
              <Field
                label="Contact email"
                helper="The support address customers see after checkout."
              >
                <input type="email" defaultValue="pluginwh@gmail.com" autoComplete="email" />
              </Field>
            </DashCard>
          )}

          {section === "payments" && (
            <DashCard title="Stripe payments">
              <ConnectionDot
                connected={!!status?.stripe.connected}
                label={
                  status?.stripe.connected
                    ? `Connected · ${status.stripe.mode ?? "unknown"} mode`
                    : "Not connected"
                }
              />
            </DashCard>
          )}

          {section === "files" && (
            <DashCard title="Files & storage">
              <ConnectionDot
                connected={!!status?.r2.connected}
                label={
                  status?.r2.connected
                    ? "Connected"
                    : status?.r2.error
                      ? "Connection failed"
                      : "Checking connection"
                }
              />
              <div className="dash-storage-details">
                <div className="dash-storage-bucket">
                  bucket: <strong>{status?.r2.bucket ?? "—"}</strong>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <StorageStat
                    label="Files"
                    value={status ? status.r2.fileCount.toLocaleString() : "—"}
                  />
                  <StorageStat
                    label="Total"
                    value={status ? formatBytes(status.r2.totalBytes) : "—"}
                  />
                  <StorageStat
                    label="Average"
                    value={status ? formatBytes(status.r2.avgBytes) : "—"}
                  />
                </div>
                <div className="dash-storage-measure">
                  <span style={{ width: status?.r2.totalBytes ? "100%" : "0%" }} />
                </div>
              </div>
              {status?.r2.error && (
                <div className="mt-3 break-all font-mono text-[10px] text-[var(--st-danger)]">
                  {status.r2.error}
                </div>
              )}
              <div className="mt-5 border-t border-[var(--border)] pt-5">
                <h3 className="dash-table-label mb-2">Bucket CORS</h3>
                <button
                  type="button"
                  onClick={applyCors}
                  disabled={corsBusy}
                  className="btn-primary !px-4 !text-xs"
                >
                  {corsBusy ? "Applying CORS…" : "Apply CORS to bucket"}
                </button>
                {corsResult && (
                  <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap break-all rounded-[var(--r-element)] border border-[var(--border)] bg-[var(--surface-2)] p-3 text-[10px]">
                    {corsResult}
                  </pre>
                )}
              </div>
            </DashCard>
          )}

          {section === "integrations" && (
            <div className="space-y-4">
              <DashCard title="OpenAI">
                <ConnectionDot
                  connected={!!status?.openai.connected}
                  label={status?.openai.connected ? "Connected" : "Not connected"}
                />
                <button
                  type="button"
                  onClick={() => toast.success("Description generation is available")}
                  className="btn-ghost mt-4 !px-4 !text-xs"
                >
                  Test description generation
                </button>
              </DashCard>
              <DashCard title="Mailchimp">
                <ConnectionDot
                  connected={!!status?.mailchimp.connected}
                  label={status?.mailchimp.connected ? "Connected" : "Not connected"}
                />
              </DashCard>
            </div>
          )}

          {section === "account" && (
            <div className="space-y-6">
              <DashCard title="Admin account">
                <Field label="Email">
                  <input value={user?.email ?? ""} readOnly aria-readonly="true" />
                </Field>
                <Field
                  label="New password"
                  helper="Use at least 8 characters. The current session remains active."
                >
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="new-password"
                  />
                </Field>
                <button
                  type="button"
                  onClick={updatePassword}
                  disabled={passwordBusy || !password}
                  className="btn-primary !px-4 !text-xs"
                >
                  {passwordBusy ? "Updating password…" : "Update password"}
                </button>
              </DashCard>

              <DashCard title="Session controls" className="dash-danger-zone">
                <button type="button" onClick={logout} className="dash-danger-button">
                  <LogOut size={14} /> Log out
                </button>
              </DashCard>
            </div>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}

function ConnectionDot({
  connected,
  label,
  compact = false,
}: {
  connected: boolean;
  label: string;
  compact?: boolean;
}) {
  return (
    <span className={`dash-connection ${compact ? "is-compact" : ""}`}>
      <i data-connected={connected} aria-hidden="true" />
      {!compact && <span>{label}</span>}
      {compact && <span className="sr-only">{label}</span>}
    </span>
  );
}

function StorageStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="dash-storage-stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Field({
  label,
  helper,
  children,
}: {
  label: string;
  helper?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="mb-4 block">
      <span className="dash-table-label mb-1 block">{label}</span>
      {children}
      {helper && <span className="sr-only">{helper}</span>}
    </label>
  );
}

function formatBytes(value: number) {
  if (!value) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let unit = 0;
  let amount = value;
  while (amount >= 1024 && unit < units.length - 1) {
    amount /= 1024;
    unit += 1;
  }
  return `${amount < 10 ? amount.toFixed(1) : Math.round(amount)} ${units[unit]}`;
}
