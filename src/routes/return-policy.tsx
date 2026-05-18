import { createFileRoute } from "@tanstack/react-router";
import { StaticPage } from "@/components/StaticPage";

export const Route = createFileRoute("/return-policy")({
  head: () => ({ meta: [{ title: "Return Policy — Plugin Warehouse" }] }),
  component: () => (
    <StaticPage
      eyebrow="// STRAIGHT TALK ON RETURNS"
      headline="RETURN POLICY."
      sub="Got a plugin that won't load? We fix it before refunding."
      sections={[
        { title: "ELIGIBILITY WINDOW", body: <p>14 days from purchase. After that, we're locked in.</p> },
        { title: "WHAT'S ELIGIBLE", body: <p>Plugins that don't install, won't authorize, or are fundamentally broken on a supported system.</p> },
        { title: "WHAT'S NOT", body: <p>Buyer's remorse. "I didn't read the specs." Plugins you've already used in finished tracks.</p> },
        { title: "HOW TO REQUEST", body: <ol className="list-decimal pl-5 space-y-1"><li>Email support with your order ID.</li><li>Describe the issue.</li><li>We troubleshoot first.</li><li>If unfixable, refund within 5 business days.</li></ol> },
        { title: "PROCESSING TIME", body: <p>Refunds hit your original payment method within 5–10 business days.</p> },
      ]}
      footerCta={{ label: "STILL GOT QUESTIONS? HIT US UP →", to: "/contact-us" }}
    />
  ),
});
