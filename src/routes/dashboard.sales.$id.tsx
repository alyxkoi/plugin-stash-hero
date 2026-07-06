import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { DashboardShell, DashCard } from "@/components/DashboardShell";
import { SaleForm, type SaleFormValues } from "@/components/dashboard/SaleForm";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/dashboard/sales/$id")({
  head: () => ({ meta: [{ title: "Edit sale — Plugin Warehouse" }] }),
  component: EditSale,
});

function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function EditSale() {
  const { id } = useParams({ from: "/dashboard/sales/$id" });
  const [initial, setInitial] = useState<SaleFormValues | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: row } = await supabase
        .from("sale_events")
        .select("id, name, slug, discount_pct, scope, categories, start_at, end_at, status")
        .eq("id", id)
        .maybeSingle();
      if (!row) { setNotFound(true); return; }
      const { data: junction } = await supabase
        .from("sale_event_products")
        .select("product_id")
        .eq("sale_event_id", id);
      setInitial({
        id: row.id as string,
        name: (row.name as string) ?? "",
        slug: (row.slug as string) ?? "",
        discount_pct: (row.discount_pct as number) ?? 0,
        scope: (row.scope as any) ?? "all",
        categories: ((row as any).categories ?? []) as string[],
        productIds: (junction ?? []).map((j) => j.product_id as string),
        startAt: toLocalInput(row.start_at as string | null),
        endAt: toLocalInput(row.end_at as string | null),
        status: (row.status as any),
      });
    })();
  }, [id]);

  if (notFound) {
    return (
      <DashboardShell title="Not found">
        <DashCard>
          <Link to="/dashboard/sales" className="text-[var(--accent-red-glow)] text-sm">← Back to sales</Link>
        </DashCard>
      </DashboardShell>
    );
  }
  if (!initial) return <DashboardShell title="Loading…"><DashCard><div className="text-sm text-white/50">Loading sale…</div></DashCard></DashboardShell>;

  return (
    <DashboardShell title={`Edit · ${initial.name}`}>
      <SaleForm mode="edit" initial={initial} />
    </DashboardShell>
  );
}
