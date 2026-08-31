import { createFileRoute, notFound } from "@tanstack/react-router";
import { ShopPage } from "@/components/ShopPage";
import type { Category } from "@/lib/mock-data";

const META: Record<Category, { title: string; sub: string; seoTitle: string; desc: string }> = {
  instruments: {
    title: "INSTRUMENTS.",
    sub: "Synths, samplers, drum machines, virtual instruments. Fraction of the price.",
    seoTitle: "Cheap Synth & Instrument Plugins | Plugin Warehouse",
    desc: "Pro synths and instruments for less. Serum, Omnisphere, Nexus and more at deep discounts. Build your sound without paying retail.",
  },
  effects: {
    title: "EFFECTS.",
    sub: "Reverbs, compressors, EQs, delays. Pro-tier processing at a fraction of the price.",
    seoTitle: "Cheap Effects Plugins | EQ, Reverb, Compression | Plugin Warehouse",
    desc: "Pro effects plugins at a fraction of retail. EQ, compression, reverb, delay, and mixing tools. FabFilter, Soundtoys, Valhalla and more, heavily discounted.",
  },
  libraries: {
    title: "LIBRARIES.",
    sub: "Sample packs, preset banks, Kontakt libraries. Fraction of the price.",
    seoTitle: "Sample Libraries & Kontakt Libraries Cheap | Plugin Warehouse",
    desc: "Premium sample libraries, Kontakt libraries, drum kits and presets at a fraction of retail. Load up your sound for less.",
  },
  daws: {
    title: "DAWS.",
    sub: "Ableton, FL Studio, Logic, Pro Tools — all at a fraction of the price.",
    seoTitle: "Cheap DAWs & Music Software | Plugin Warehouse",
    desc: "Professional DAWs and music production software at discount prices. The tools to make music, without the full price tag.",
  },
  software: {
    title: "CREATIVE SOFTWARE.",
    sub: "Adobe. Video editors. Audio utilities. Pro-grade tools at a fraction of the price.",
    seoTitle: "Creative Software Deals | Plugin Warehouse",
    desc: "Pro creative software at a fraction of retail. Design, video, and production tools discounted deep. Get the full suite for less.",
  },
  freebies: {
    title: "FREEBIES.",
    sub: "Free downloads. No catch. Add to your stash.",
    seoTitle: "Free Plugins & VST Downloads | Plugin Warehouse",
    desc: "Download free plugins, no catch. Grab pro quality tools for free and start building your sound today. New freebies added regularly.",
  },
};

export const Route = createFileRoute("/shop/$category")({
  beforeLoad: ({ params }) => {
    if (!(params.category in META)) throw notFound();
  },
  head: ({ params }) => {
    const m = META[params.category as Category];
    const url = `https://www.thepluginwarehouse.com/shop/${params.category}`;
    return {
      meta: [
        { title: m.seoTitle },
        { name: "description", content: m.desc },
        { property: "og:title", content: m.seoTitle },
        { property: "og:description", content: m.desc },
        { property: "og:url", content: url },
        { property: "og:type", content: "website" },
        { name: "twitter:title", content: m.seoTitle },
        { name: "twitter:description", content: m.desc },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  component: CategoryPage,
});

function CategoryPage() {
  const { category } = Route.useParams();
  const m = META[category as Category];
  return <ShopPage category={category as Category} title={m.title} subtitle={m.sub} />;
}
