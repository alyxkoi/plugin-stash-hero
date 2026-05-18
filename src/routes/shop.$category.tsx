import { createFileRoute, notFound } from "@tanstack/react-router";
import { ShopPage } from "@/components/ShopPage";
import type { Category } from "@/lib/mock-data";

const META: Record<Category, { title: string; sub: string }> = {
  instruments: { title: "INSTRUMENTS.", sub: "Synths, samplers, drum machines, virtual instruments. Fraction of the price." },
  effects: { title: "EFFECTS.", sub: "Reverbs, compressors, EQs, delays. Pro-tier processing at a fraction of the price." },
  libraries: { title: "LIBRARIES.", sub: "Sample packs, preset banks, Kontakt libraries. Fraction of the price." },
  daws: { title: "DAWS.", sub: "Ableton, FL Studio, Logic, Pro Tools — all at a fraction of the price." },
  software: { title: "CREATIVE SOFTWARE.", sub: "Adobe. Video editors. Audio utilities. Pro-grade tools at a fraction of the price." },
  freebies: { title: "FREEBIES.", sub: "Free downloads. No catch. Add to your stash." },
};

export const Route = createFileRoute("/shop/$category")({
  beforeLoad: ({ params }) => {
    if (!(params.category in META)) throw notFound();
  },
  head: ({ params }) => {
    const m = META[params.category as Category];
    return { meta: [{ title: `${m?.title || "Shop"} — Plugin Warehouse` }, { name: "description", content: m?.sub }] };
  },
  component: () => {
    const { category } = Route.useParams();
    const m = META[category as Category];
    return <ShopPage category={category as Category} title={m.title} subtitle={m.sub} />;
  },
});
