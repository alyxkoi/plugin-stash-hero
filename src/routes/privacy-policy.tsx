import { createFileRoute } from "@tanstack/react-router";
import { StaticPage } from "@/components/StaticPage";

export const Route = createFileRoute("/privacy-policy")({
  head: () => ({ meta: [{ title: "Privacy Policy — Plugin Warehouse" }] }),
  component: () => (
    <StaticPage
      eyebrow="// LAST UPDATED: SEP 2026"
      headline="PRIVACY POLICY."
      sections={[
        { title: "WHAT WE COLLECT", body: <p>Account info, order history, download activity. No tracking pixels beyond standard analytics.</p> },
        { title: "HOW WE USE IT", body: <p>To deliver your plugins, send order confirmations, and improve the warehouse.</p> },
        { title: "WHO WE SHARE WITH", body: <p>Payment processor (Stripe), email service, hosting provider. Never sold.</p> },
        { title: "YOUR RIGHTS", body: <p>Export, delete, or correct your data anytime via your account or support.</p> },
      ]}
    />
  ),
});
