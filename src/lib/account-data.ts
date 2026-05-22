// Mock customer data has been removed. Real data comes from Supabase
// (profiles, orders, order_items, saved_items, library_downloads) once the user signs in.

import type { Product } from "./mock-data";

export interface MockUser {
  email: string;
  displayName: string;
  memberSince: string;
  avatarUrl?: string;
  location?: string;
  oauth?: "google" | null;
  prefs: {
    marketing: boolean;
    sales: boolean;
    updates: boolean;
    wishlist: boolean;
    receipts: boolean;
  };
  passwordLastChanged: string;
}

export const mockUser: MockUser = {
  email: "",
  displayName: "",
  memberSince: "",
  oauth: null,
  prefs: { marketing: true, sales: true, updates: true, wishlist: true, receipts: true },
  passwordLastChanged: "",
};

export interface LibraryItem {
  slug: string;
  installedVersion: string;
  latestVersion: string;
  lastDownloaded: string | null;
  downloadCount: number;
  updateAvailable: boolean;
  whatsNew?: string;
}
export const library: LibraryItem[] = [];

export interface OrderItem { slug: string; pricePaid: number; }
export interface Order {
  id: string;
  date: string;
  items: OrderItem[];
  subtotal: number;
  discount?: { code: string; amount: number };
  total: number;
  status: "PAID" | "REFUNDED" | "PENDING";
}
export const orders: Order[] = [];
export const totalSpent = 0;

export interface SavedItem {
  slug: string;
  savedAt: string;
  priceAtSave: number;
  priceDropped?: boolean;
  onSale?: boolean;
}
export const savedItems: SavedItem[] = [];

export const getLibProduct = (_slug: string): Product | undefined => undefined;

export function getGreeting(now = new Date()) {
  const h = now.getHours();
  if (h >= 5 && h < 11) return "MORNING. WHAT'S THE PLAY?";
  if (h >= 11 && h < 17) return "WHAT WE COOKING UP TODAY?";
  if (h >= 17 && h < 23) return "STUDIO TIME. LET'S GO.";
  return "BURNING THE MIDNIGHT WAVES?";
}

export function formatDate(iso: string, opts: { year?: boolean; month?: "short" | "long" } = {}) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { month: opts.month ?? "short", day: "numeric", ...(opts.year !== false ? { year: "numeric" } : {}) });
}
