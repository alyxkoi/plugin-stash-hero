import { createFileRoute } from "@tanstack/react-router";
import { ShopPage } from "@/components/ShopPage";
import { publishedProductsQueryOptions } from "@/hooks/useProducts";

const TITLE = "Shop All Plugins | Cheap VST Plugins & Bundles | Plugin Warehouse";
const DESC = "Browse every plugin in the vault. Synths, effects, mixing and mastering tools at deep discounts. The pro tools you want without the retail markup.";
const URL = "https://www.thepluginwarehouse.com/shop";

export const Route = createFileRoute("/shop/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(publishedProductsQueryOptions),
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:url", content: URL },
      { property: "og:type", content: "website" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESC },
    ],
    links: [{ rel: "canonical", href: URL }],
  }),
  component: () => <ShopPage title="THE WAREHOUSE" subtitle="Pro tools, fair prices, and a catalogue that updates live." />,
});
