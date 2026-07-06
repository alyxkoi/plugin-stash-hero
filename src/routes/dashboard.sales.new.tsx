import { createFileRoute } from "@tanstack/react-router";
import { DashboardShell } from "@/components/DashboardShell";
import { SaleForm } from "@/components/dashboard/SaleForm";

export const Route = createFileRoute("/dashboard/sales/new")({
  head: () => ({ meta: [{ title: "New sale — Plugin Warehouse" }] }),
  component: NewSale,
});

function NewSale() {
  return (
    <DashboardShell title="New sale">
      <SaleForm mode="new" draftKey="pw_sale_new_draft_v2" />
    </DashboardShell>
  );
}
