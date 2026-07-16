import { createFileRoute } from "@tanstack/react-router";
import { ShopPage } from "@/components/ShopPage";

const TITLE = "The Warehouse — Every Plugin, Every Category";
const DESC = "Browse the full Plugin Warehouse catalog: synths, effects, sample libraries, DAWs and creative software — pro-tier titles at a fraction of retail.";
const URL = "https://www.thepluginwarehouse.com/shop";

export const Route = createFileRoute("/shop/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:url", content: URL },
    ],
    links: [{ rel: "canonical", href: URL }],
  }),
  component: () => <ShopPage title="THE WAREHOUSE" subtitle="247 plugins. Fraction of the price. Find yours." />,
});
