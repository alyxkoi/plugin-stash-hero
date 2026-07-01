// Mock data has been removed. These exports remain as TYPE shells + empty stubs so the
// site renders cleanly with empty states until real data is added via the dashboard.
// Real catalog data lives in the Supabase `products` table.

export type Category = "instruments" | "effects" | "libraries" | "daws" | "software" | "freebies";

export interface Product {
  id?: string;
  slug: string;
  name: string;
  maker: string;
  category: Category;
  subType?: string;
  daws: string[];
  formats: string[];
  version: string;
  fileSize?: string;
  updated: string;
  price: number;
  compareAtPrice?: number;
  tagline: string;
  description: string;
  coverGradient: string;
  coverUrl?: string | null;
  isNew?: boolean;
  isBestseller?: boolean;
  isFeatured?: boolean;
  isFree?: boolean;
}

export const products: Product[] = [];

export const categories: { slug: Category; name: string; description: string; count: number }[] = [
  { slug: "instruments", name: "Instruments", description: "Synths, samplers, drum machines", count: 0 },
  { slug: "effects", name: "Effects", description: "Reverbs, EQs, compressors, delays", count: 0 },
  { slug: "libraries", name: "Libraries", description: "Sample packs, Kontakt libraries", count: 0 },
  { slug: "daws", name: "DAWs", description: "Ableton, FL, Logic, Pro Tools", count: 0 },
  { slug: "software", name: "Software", description: "Adobe, video, audio utilities", count: 0 },
  { slug: "freebies", name: "Freebies", description: "Free downloads, no catch", count: 0 },
];

export const getProductBySlug = (_slug: string): Product | undefined => undefined;
export const getProductsByCategory = (_cat: Category): Product[] => [];
export const featuredProducts: Product[] = [];
export const recentProducts: Product[] = [];
export const newProducts: Product[] = [];
export const bestsellerProducts: Product[] = [];

// No active sale until the user creates one via the dashboard.
export const SALE = {
  active: false,
  slug: "",
  name: "",
  shortName: "",
  discount: 0,
  endsLabel: "",
  endsAt: 0,
};
