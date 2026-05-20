import { createFileRoute } from "@tanstack/react-router";
import { StaticPage } from "@/components/StaticPage";

export const Route = createFileRoute("/our-story")({
  head: () => ({ meta: [{ title: "Our Story — Plugin Warehouse" }] }),
  component: () => (
    <StaticPage
      eyebrow="THE WAREHOUSE STORY"
      headline="WE FIXED PLUGIN PRICING."
      sub="Pro-tier plugins shouldn't cost a paycheck. So they don't."
      sections={[
        { title: "THE PROBLEM", body: <p>Plugin pricing has been a scam for years. A single mastering suite costs more than most of us spent on our first interface. That math broke a long time ago.</p> },
        { title: "OUR MOVE", body: <p>We bulk-license direct, cut the middleman out, and pass the savings down to producers who actually make music.</p> },
        { title: "THE PROMISE", body: <p>Real plugins. Lifetime licenses. Re-download whenever. No subscriptions, no rented software, no license-key drama.</p> },
      ]}
      footerCta={{ label: "READY TO LOAD UP? BROWSE →", to: "/shop" }}
    />
  ),
});
