export type Category = "instruments" | "effects" | "libraries" | "daws" | "software" | "freebies";

export interface Product {
  slug: string;
  name: string;
  maker: string;
  category: Category;
  subType?: string;
  daws: string[];
  formats: string[];
  version: string;
  fileSize: string;
  updated: string;
  price: number;
  compareAtPrice?: number;
  tagline: string;
  description: string;
  coverGradient: string; // CSS gradient string for placeholder
  isNew?: boolean;
  isBestseller?: boolean;
  isFeatured?: boolean;
  isFree?: boolean;
}

const allDaws = ["Ableton", "FL Studio", "Logic", "Pro Tools", "Studio One", "Cubase", "Reaper"];

const grad = (a: string, b: string, c: string) =>
  `radial-gradient(circle at 30% 20%, ${a}, transparent 60%), radial-gradient(circle at 70% 80%, ${b}, transparent 55%), linear-gradient(135deg, ${c}, #0A0018)`;

export const products: Product[] = [
  // Instruments
  { slug: "serum", name: "Serum", maker: "Xfer Records", category: "instruments", subType: "Synth", daws: allDaws, formats: ["VST", "VST3", "AU", "AAX"], version: "1.4", fileSize: "385 MB", updated: "Aug 2026", price: 29, compareAtPrice: 189, tagline: "The wavetable that runs the genre.", description: "Industry-standard wavetable synth. Endless presets. Endless tweaks. Yours forever.", coverGradient: grad("#FF003C","#0E0BD1","#3a0066"), isFeatured: true, isBestseller: true },
  { slug: "diva", name: "Diva", maker: "u-he", category: "instruments", subType: "Synth", daws: allDaws, formats: ["VST", "VST3", "AU"], version: "1.5", fileSize: "120 MB", updated: "Jul 2026", price: 24, compareAtPrice: 179, tagline: "Analog warmth. Digital convenience.", description: "Five classic synth circuits modeled to obsessive detail.", coverGradient: grad("#FF1F5C","#2B28FF","#1a0040") },
  { slug: "massive-x", name: "Massive X", maker: "Native Instruments", category: "instruments", subType: "Synth", daws: allDaws, formats: ["VST3", "AU", "AAX"], version: "1.4", fileSize: "1.2 GB", updated: "Sep 2026", price: 39, compareAtPrice: 199, tagline: "The sequel hits harder.", description: "Next-gen wavetable monster from NI.", coverGradient: grad("#0E0BD1","#FF003C","#0A0030"), isNew: true },
  { slug: "omnisphere", name: "Omnisphere", maker: "Spectrasonics", category: "instruments", subType: "Synth", daws: allDaws, formats: ["VST", "AU", "AAX"], version: "2.8", fileSize: "64 GB", updated: "Jun 2026", price: 99, compareAtPrice: 499, tagline: "The synth that does everything.", description: "14,000+ presets. STEAM engine. The dream rig.", coverGradient: grad("#2B28FF","#FF1F5C","#200050"), isFeatured: true, isBestseller: true },
  { slug: "battery-4", name: "Battery 4", maker: "Native Instruments", category: "instruments", subType: "Drum Machine", daws: allDaws, formats: ["VST", "AU"], version: "4.3", fileSize: "8 GB", updated: "May 2026", price: 19, compareAtPrice: 99, tagline: "Drum sampler that hits.", description: "Cell-based drum sampling for modern producers.", coverGradient: grad("#FF003C","#FF1F5C","#330014") },
  { slug: "kontakt-7", name: "Kontakt 7", maker: "Native Instruments", category: "instruments", subType: "Sampler", daws: allDaws, formats: ["VST3", "AU", "AAX"], version: "7.5", fileSize: "55 GB", updated: "Aug 2026", price: 49, compareAtPrice: 299, tagline: "The sampler everyone builds for.", description: "Open up the universe of Kontakt libraries.", coverGradient: grad("#0E0BD1","#2B28FF","#100040"), isBestseller: true },

  // Effects
  { slug: "pro-q-4", name: "Pro-Q 4", maker: "FabFilter", category: "effects", subType: "EQ", daws: allDaws, formats: ["VST", "VST3", "AU", "AAX"], version: "4.0", fileSize: "32 MB", updated: "Sep 2026", price: 24, compareAtPrice: 179, tagline: "The EQ on every mix.", description: "Precise, transparent, indispensable.", coverGradient: grad("#FF003C","#0E0BD1","#2a0050"), isNew: true, isFeatured: true, isBestseller: true },
  { slug: "pro-c-2", name: "Pro-C 2", maker: "FabFilter", category: "effects", subType: "Compressor", daws: allDaws, formats: ["VST", "VST3", "AU", "AAX"], version: "2.1", fileSize: "30 MB", updated: "Jul 2026", price: 22, compareAtPrice: 169, tagline: "Compression you can see.", description: "Eight modeled compression styles in one box.", coverGradient: grad("#FF1F5C","#2B28FF","#1a0040") },
  { slug: "ozone-12", name: "Ozone 12", maker: "iZotope", category: "effects", subType: "Mastering", daws: allDaws, formats: ["VST3", "AU"], version: "12.0", fileSize: "2.4 GB", updated: "Sep 2026", price: 24, compareAtPrice: 189, tagline: "The mastering suite that lives in every modern release.", description: "AI-assisted mastering with the most accurate reference modeling on the market.", coverGradient: grad("#FF003C","#0E0BD1","#0A0028"), isFeatured: true, isNew: true },
  { slug: "valhalla-vintageverb", name: "Valhalla VintageVerb", maker: "Valhalla DSP", category: "effects", subType: "Reverb", daws: allDaws, formats: ["VST", "VST3", "AU", "AAX"], version: "3.0", fileSize: "12 MB", updated: "Apr 2026", price: 12, compareAtPrice: 50, tagline: "The reverb you keep reaching for.", description: "Lush vintage reverb tones, modern interface.", coverGradient: grad("#2B28FF","#FF003C","#100030") },
  { slug: "soundtoys-5", name: "Soundtoys 5", maker: "Soundtoys", category: "effects", daws: allDaws, formats: ["VST", "VST3", "AU", "AAX"], version: "5.5", fileSize: "200 MB", updated: "Mar 2026", price: 49, compareAtPrice: 499, tagline: "The character bundle.", description: "Decapitator, EchoBoy, Little AlterBoy and the rest of the family.", coverGradient: grad("#FF1F5C","#0E0BD1","#28004a") },
  { slug: "neutron-5", name: "Neutron 5", maker: "iZotope", category: "effects", subType: "Mixing", daws: allDaws, formats: ["VST3", "AU"], version: "5.0", fileSize: "1.8 GB", updated: "Aug 2026", price: 29, compareAtPrice: 199, tagline: "AI mixing assistant.", description: "Smart mixing for modern workflows.", coverGradient: grad("#0E0BD1","#FF1F5C","#0a0030") },

  // Libraries
  { slug: "spitfire-strings", name: "Spitfire Symphonic Strings", maker: "Spitfire Audio", category: "libraries", subType: "Orchestral", daws: allDaws, formats: ["Kontakt"], version: "1.6", fileSize: "62 GB", updated: "Feb 2026", price: 79, compareAtPrice: 599, tagline: "Cinematic strings at scale.", description: "Recorded at AIR Studios. Full symphonic depth.", coverGradient: grad("#FF003C","#2B28FF","#1a0040"), isBestseller: true },
  { slug: "output-arcade", name: "Arcade", maker: "Output", category: "libraries", subType: "Sample Pack", daws: allDaws, formats: ["VST", "AU"], version: "2.4", fileSize: "5 GB", updated: "Jun 2026", price: 19, compareAtPrice: 120, tagline: "Loops that play themselves.", description: "Endless evolving loops and kits.", coverGradient: grad("#FF1F5C","#0E0BD1","#28004a") },
  { slug: "cinematic-studio-strings", name: "Cinematic Studio Strings", maker: "Cinematic Studio", category: "libraries", subType: "Orchestral", daws: allDaws, formats: ["Kontakt"], version: "1.7", fileSize: "30 GB", updated: "May 2026", price: 89, compareAtPrice: 549, tagline: "The film score sound.", description: "Pristine recordings, intuitive playability.", coverGradient: grad("#0E0BD1","#FF003C","#100030") },
  { slug: "splice-essentials", name: "Splice Essentials", maker: "Splice", category: "libraries", subType: "Sample Pack", daws: allDaws, formats: ["Standalone"], version: "2026", fileSize: "12 GB", updated: "Sep 2026", price: 14, compareAtPrice: 99, tagline: "The starter kit modern producers actually use.", description: "Drums, loops, one-shots across genres.", coverGradient: grad("#2B28FF","#FF1F5C","#1a0040"), isNew: true },

  // DAWs
  { slug: "ableton-live-12", name: "Ableton Live 12 Suite", maker: "Ableton", category: "daws", daws: ["Ableton"], formats: ["Standalone"], version: "12.1", fileSize: "12 GB", updated: "Aug 2026", price: 129, compareAtPrice: 749, tagline: "Suite. Full stop.", description: "The complete Suite — every instrument, every effect, every pack.", coverGradient: grad("#FF003C","#FF1F5C","#330014"), isFeatured: true, isBestseller: true },
  { slug: "fl-studio-producer", name: "FL Studio Producer Edition", maker: "Image-Line", category: "daws", daws: ["FL Studio"], formats: ["Standalone"], version: "21.5", fileSize: "8 GB", updated: "Jul 2026", price: 49, compareAtPrice: 199, tagline: "Lifetime free updates baked in.", description: "Producer Edition with full ecosystem.", coverGradient: grad("#FF1F5C","#0E0BD1","#28004a") },
  { slug: "logic-pro", name: "Logic Pro", maker: "Apple", category: "daws", daws: ["Logic"], formats: ["Standalone"], version: "11.0", fileSize: "6 GB", updated: "Sep 2026", price: 39, compareAtPrice: 199, tagline: "Apple's flagship for Mac producers.", description: "Native Mac performance with deep instrument library.", coverGradient: grad("#0E0BD1","#FF003C","#0A0028") },
  { slug: "pro-tools", name: "Pro Tools Studio", maker: "Avid", category: "daws", daws: ["Pro Tools"], formats: ["Standalone"], version: "2026.6", fileSize: "4 GB", updated: "Jun 2026", price: 89, compareAtPrice: 599, tagline: "The studio standard.", description: "Industry workflow for mixing and post.", coverGradient: grad("#2B28FF","#FF1F5C","#100040") },

  // Software
  { slug: "adobe-cc", name: "Adobe Creative Cloud (1 Year)", maker: "Adobe", category: "software", daws: [], formats: ["Standalone"], version: "2026", fileSize: "varies", updated: "Sep 2026", price: 89, compareAtPrice: 599, tagline: "Every Adobe app. One license.", description: "Photoshop, Premiere, After Effects, Illustrator — the whole stack.", coverGradient: grad("#FF003C","#0E0BD1","#1a0040"), isFeatured: true, isBestseller: true, isNew: true },
  { slug: "premiere-pro", name: "Premiere Pro", maker: "Adobe", category: "software", subType: "Video Editor", daws: [], formats: ["Standalone"], version: "2026", fileSize: "2.8 GB", updated: "Sep 2026", price: 39, compareAtPrice: 239, tagline: "Video editing for serious work.", description: "Multicam, color, audio, finishing — one timeline.", coverGradient: grad("#2B28FF","#FF003C","#28004a") },
  { slug: "after-effects", name: "After Effects", maker: "Adobe", category: "software", subType: "Motion", daws: [], formats: ["Standalone"], version: "2026", fileSize: "3.2 GB", updated: "Aug 2026", price: 39, compareAtPrice: 239, tagline: "Motion graphics. Visual effects.", description: "The motion design industry standard.", coverGradient: grad("#FF1F5C","#0E0BD1","#1a0040") },
  { slug: "photoshop", name: "Photoshop", maker: "Adobe", category: "software", daws: [], formats: ["Standalone"], version: "2026", fileSize: "2.4 GB", updated: "Sep 2026", price: 29, compareAtPrice: 239, tagline: "Photo, design, the works.", description: "Every creator's daily driver.", coverGradient: grad("#FF003C","#FF1F5C","#330014") },
  { slug: "davinci-resolve", name: "DaVinci Resolve Studio", maker: "Blackmagic", category: "software", subType: "Video Editor", daws: [], formats: ["Standalone"], version: "19", fileSize: "3.5 GB", updated: "Jul 2026", price: 99, compareAtPrice: 295, tagline: "Edit, color, audio, deliver.", description: "Hollywood color grading meets a full NLE.", coverGradient: grad("#0E0BD1","#FF1F5C","#0a0030") },
  { slug: "final-cut-pro", name: "Final Cut Pro", maker: "Apple", category: "software", subType: "Video Editor", daws: [], formats: ["Standalone"], version: "11", fileSize: "3 GB", updated: "Jun 2026", price: 49, compareAtPrice: 299, tagline: "Mac-native magnetic timeline.", description: "Fast, smooth, made for Apple Silicon.", coverGradient: grad("#FF003C","#2B28FF","#1a0040") },
  { slug: "izotope-rx-11", name: "iZotope RX 11", maker: "iZotope", category: "software", subType: "Audio Repair", daws: [], formats: ["Standalone", "VST3", "AU"], version: "11", fileSize: "1.6 GB", updated: "Aug 2026", price: 49, compareAtPrice: 399, tagline: "The audio repair standard.", description: "Fix dialogue, remove noise, save takes.", coverGradient: grad("#FF1F5C","#0E0BD1","#28004a") },

  // Freebies
  { slug: "vital", name: "Vital", maker: "Vital Audio", category: "freebies", subType: "Synth", daws: allDaws, formats: ["VST3", "AU"], version: "1.5", fileSize: "120 MB", updated: "May 2026", price: 0, isFree: true, tagline: "Free spectral wavetable synth.", description: "A modern wavetable synth that rivals the paid heavy-hitters.", coverGradient: grad("#0E0BD1","#FF003C","#100030") },
  { slug: "tdr-nova", name: "TDR Nova", maker: "Tokyo Dawn Records", category: "freebies", subType: "EQ", daws: allDaws, formats: ["VST", "AU", "AAX"], version: "1.3", fileSize: "8 MB", updated: "Mar 2026", price: 0, isFree: true, tagline: "Free dynamic EQ that punches up.", description: "Surgical and musical dynamic EQ. Free.", coverGradient: grad("#FF003C","#0E0BD1","#0A0030") },
];

export const categories: { slug: Category; name: string; description: string; count: number }[] = [
  { slug: "instruments", name: "Instruments", description: "Synths, samplers, drum machines", count: products.filter(p => p.category === "instruments").length },
  { slug: "effects", name: "Effects", description: "Reverbs, EQs, compressors, delays", count: products.filter(p => p.category === "effects").length },
  { slug: "libraries", name: "Libraries", description: "Sample packs, Kontakt libraries", count: products.filter(p => p.category === "libraries").length },
  { slug: "daws", name: "DAWs", description: "Ableton, FL, Logic, Pro Tools", count: products.filter(p => p.category === "daws").length },
  { slug: "software", name: "Software", description: "Adobe, video, audio utilities", count: products.filter(p => p.category === "software").length },
  { slug: "freebies", name: "Freebies", description: "Free downloads, no catch", count: products.filter(p => p.category === "freebies").length },
];

export const getProductBySlug = (slug: string) => products.find(p => p.slug === slug);
export const getProductsByCategory = (cat: Category) => products.filter(p => p.category === cat);
export const featuredProducts = products.filter(p => p.isFeatured).slice(0, 4);

const parseUpdated = (s: string) => {
  const t = Date.parse(`1 ${s}`);
  return isNaN(t) ? 0 : t;
};
/** Most-recent first, used for "JUST DROPPED" / default shop sort. */
export const recentProducts = [...products].sort((a, b) => parseUpdated(b.updated) - parseUpdated(a.updated));
export const newProducts = recentProducts.slice(0, 4);
/** Best-sellers first, used for "ON ROTATION". */
export const bestsellerProducts = products.filter(p => p.isBestseller).slice(0, 4);

export const SALE = {
  active: true,
  slug: "summer-steals",
  name: "Summer Tropical Steals",
  shortName: "Summer Steals",
  discount: 35,
  endsLabel: "Sept 22",
  endsAt: new Date("2026-09-22T23:59:59").getTime(),
};
