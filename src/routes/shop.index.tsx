import { createFileRoute } from "@tanstack/react-router";
import { ShopPage } from "@/components/ShopPage";

export const Route = createFileRoute("/shop/")({
  head: () => ({ meta: [{ title: "The Warehouse — All Plugins" }, { name: "description", content: "247 plugins. Fraction of the price. Find yours." }] }),
  component: () => <ShopPage title="THE WAREHOUSE" subtitle="247 plugins. Fraction of the price. Find yours." />,
});
