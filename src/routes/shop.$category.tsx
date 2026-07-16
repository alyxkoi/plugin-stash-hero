import { createFileRoute, notFound } from "@tanstack/react-router";
import { ShopPage } from "@/components/ShopPage";
import type { Category } from "@/lib/mock-data";

const META: Record<Category, { title: string; sub: string; desc: string }> = {
  instruments: { title: "INSTRUMENTS.", sub: "Synths, samplers, drum machines, virtual instruments. Fraction of the price.", desc: "Virtual instruments, synths, samplers and drum machines from top makers — pro-tier sound design tools at a fraction of retail." },
  effects: { title: "EFFECTS.", sub: "Reverbs, compressors, EQs, delays. Pro-tier processing at a fraction of the price.", desc: "Reverbs, compressors, EQs, delays and creative effects for mixing and production — pro-tier plugins at a fraction of retail." },
  libraries: { title: "LIBRARIES.", sub: "Sample packs, preset banks, Kontakt libraries. Fraction of the price.", desc: "Sample packs, preset banks and Kontakt libraries curated for producers — instant download at a fraction of retail." },
  daws: { title: "DAWS.", sub: "Ableton, FL Studio, Logic, Pro Tools — all at a fraction of the price.", desc: "Ableton, FL Studio, Logic, Pro Tools and more — full digital audio workstations at a fraction of retail." },
  software: { title: "CREATIVE SOFTWARE.", sub: "Adobe. Video editors. Audio utilities. Pro-grade tools at a fraction of the price.", desc: "Adobe Creative Cloud apps, video editors and audio utilities — pro-grade creative software at a fraction of retail." },
  freebies: { title: "FREEBIES.", sub: "Free downloads. No catch. Add to your stash.", desc: "Free plugins, presets and sample packs for producers — no catch, no signup wall. Grab them for your next session." },
};

export const Route = createFileRoute("/shop/$category")({
  beforeLoad: ({ params }) => {
    if (!(params.category in META)) throw notFound();
  },
  head: ({ params }) => {
    const m = META[params.category as Category];
    const title = `${m?.title || "Shop"} — Plugin Warehouse`;
    const url = `https://www.thepluginwarehouse.com/shop/${params.category}`;
    return {
      meta: [
        { title },
        { name: "description", content: m?.desc || m?.sub },
        { property: "og:title", content: title },
        { property: "og:description", content: m?.desc || m?.sub },
        { property: "og:url", content: url },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  component: () => {
    const { category } = Route.useParams();
    const m = META[category as Category];
    return <ShopPage category={category as Category} title={m.title} subtitle={m.sub} />;
  },
});
