import { products } from "./mock-data";

export interface MockUser {
  email: string;
  displayName: string;
  memberSince: string; // "Mar 2026"
  avatarUrl?: string;
  location?: string;
  oauth?: "google" | null;
  prefs: {
    marketing: boolean;
    sales: boolean;
    updates: boolean;
    wishlist: boolean;
    receipts: boolean; // locked
  };
  passwordLastChanged: string;
}

export const mockUser: MockUser = {
  email: "alex@pluginwarehouse.com",
  displayName: "Alex",
  memberSince: "Mar 2026",
  location: "Brooklyn, NY",
  oauth: null,
  prefs: {
    marketing: true,
    sales: true,
    updates: true,
    wishlist: true,
    receipts: true,
  },
  passwordLastChanged: "Mar 14, 2026",
};

export interface LibraryItem {
  slug: string;
  installedVersion: string;
  latestVersion: string;
  lastDownloaded: string | null; // ISO date or null
  downloadCount: number;
  updateAvailable: boolean;
  whatsNew?: string;
}

// Pick 12 plugins from store
const libSlugs = [
  "serum", "pro-q-4", "ozone-12", "valhalla-vintageverb", "ableton-live-12",
  "diva", "soundtoys-5", "vital", "tdr-nova", "massive-x",
  "battery-4", "output-arcade",
];

export const library: LibraryItem[] = libSlugs.map((slug, i) => {
  const updateAvailable = i < 2; // first 2 have updates
  const neverDownloaded = i === 2 || i === 7;
  return {
    slug,
    installedVersion: updateAvailable ? "3.2.0" : "3.2.1",
    latestVersion: updateAvailable ? "3.2.1" : "3.2.1",
    lastDownloaded: neverDownloaded ? null : new Date(2026, 6 + (i % 2), 22 - i).toISOString(),
    downloadCount: neverDownloaded ? 0 : (3 + (i % 5)),
    updateAvailable,
    whatsNew: updateAvailable ? "Fixed a CPU spike on M-series chips. Added 40 new factory presets. Improved oversampling." : undefined,
  };
}).filter(item => products.find(p => p.slug === item.slug));

export interface OrderItem {
  slug: string;
  pricePaid: number;
}
export interface Order {
  id: string; // PWH-XXXX
  date: string; // ISO
  items: OrderItem[];
  subtotal: number;
  discount?: { code: string; amount: number };
  total: number;
  status: "PAID" | "REFUNDED" | "PENDING";
}

export const orders: Order[] = [
  { id: "PWH-2847", date: "2026-07-28", items: [{ slug: "pro-q-4", pricePaid: 24 }, { slug: "valhalla-vintageverb", pricePaid: 12 }, { slug: "ozone-12", pricePaid: 24 }], subtotal: 60, discount: { code: "SUMMER10", amount: 12 }, total: 48, status: "PAID" },
  { id: "PWH-2710", date: "2026-06-15", items: [{ slug: "ableton-live-12", pricePaid: 129 }], subtotal: 129, total: 129, status: "PAID" },
  { id: "PWH-2611", date: "2026-05-08", items: [{ slug: "serum", pricePaid: 29 }, { slug: "diva", pricePaid: 24 }], subtotal: 53, total: 53, status: "PAID" },
  { id: "PWH-2498", date: "2026-04-22", items: [{ slug: "soundtoys-5", pricePaid: 49 }], subtotal: 49, total: 49, status: "REFUNDED" },
  { id: "PWH-2401", date: "2026-03-14", items: [{ slug: "massive-x", pricePaid: 39 }, { slug: "battery-4", pricePaid: 19 }], subtotal: 58, discount: { code: "WELCOME", amount: 8 }, total: 50, status: "PAID" },
  { id: "PWH-2244", date: "2025-12-19", items: [{ slug: "output-arcade", pricePaid: 19 }], subtotal: 19, total: 19, status: "PAID" },
  { id: "PWH-2188", date: "2025-11-02", items: [{ slug: "vital", pricePaid: 0 }, { slug: "tdr-nova", pricePaid: 0 }], subtotal: 0, total: 0, status: "PAID" },
  { id: "PWH-2099", date: "2025-09-08", items: [{ slug: "ozone-12", pricePaid: 24 }], subtotal: 24, total: 24, status: "PAID" },
];

export const totalSpent = orders.filter(o => o.status === "PAID").reduce((s, o) => s + o.total, 0);

export interface SavedItem {
  slug: string;
  savedAt: string; // ISO
  priceAtSave: number;
  priceDropped?: boolean;
  onSale?: boolean;
}

export const savedItems: SavedItem[] = [
  { slug: "omnisphere", savedAt: "2026-08-04", priceAtSave: 99, onSale: true },
  { slug: "kontakt-7", savedAt: "2026-07-22", priceAtSave: 49, onSale: true },
  { slug: "spitfire-strings", savedAt: "2026-07-10", priceAtSave: 99, priceDropped: true },
  { slug: "cinematic-studio-strings", savedAt: "2026-06-30", priceAtSave: 89 },
  { slug: "neutron-5", savedAt: "2026-06-18", priceAtSave: 29, onSale: true },
  { slug: "pro-c-2", savedAt: "2026-06-02", priceAtSave: 22 },
  { slug: "adobe-cc", savedAt: "2026-05-20", priceAtSave: 99, priceDropped: true },
  { slug: "premiere-pro", savedAt: "2026-05-11", priceAtSave: 39 },
  { slug: "davinci-resolve", savedAt: "2026-04-28", priceAtSave: 99 },
  { slug: "final-cut-pro", savedAt: "2026-04-12", priceAtSave: 49 },
  { slug: "photoshop", savedAt: "2026-03-30", priceAtSave: 29 },
  { slug: "after-effects", savedAt: "2026-03-15", priceAtSave: 39 },
];

export const getLibProduct = (slug: string) => products.find(p => p.slug === slug);

export function getGreeting(now = new Date()) {
  const h = now.getHours();
  if (h >= 5 && h < 11) return "MORNING. WHAT'S THE PLAY?";
  if (h >= 11 && h < 17) return "WHAT WE COOKING UP TODAY?";
  if (h >= 17 && h < 23) return "STUDIO TIME. LET'S GO.";
  return "BURNING THE MIDNIGHT WAVES?";
}

export function formatDate(iso: string, opts: { year?: boolean; month?: "short" | "long" } = {}) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: opts.month ?? "short", day: "numeric", ...(opts.year !== false ? { year: "numeric" } : {}) });
}
