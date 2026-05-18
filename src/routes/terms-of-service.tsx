import { createFileRoute } from "@tanstack/react-router";
import { StaticPage } from "@/components/StaticPage";

export const Route = createFileRoute("/terms-of-service")({
  head: () => ({ meta: [{ title: "Terms of Service — Plugin Warehouse" }] }),
  component: () => (
    <StaticPage
      eyebrow="// LAST UPDATED: SEP 2026"
      headline="TERMS OF SERVICE."
      sections={[
        { title: "THE DEAL", body: <p>Buy a plugin, get a lifetime license tied to your account. Don't resell, don't redistribute.</p> },
        { title: "PERMITTED USE", body: <p>Use across all your DAWs and machines. Commercial production is fine.</p> },
        { title: "PROHIBITED USE", body: <p>Sharing accounts, reselling installers, reverse engineering, repackaging.</p> },
        { title: "DISPUTES", body: <p>Governed by the laws of your applicable jurisdiction. Arbitration before court.</p> },
      ]}
    />
  ),
});
