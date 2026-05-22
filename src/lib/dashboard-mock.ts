// Mock dashboard data has been removed. Tables now live in Supabase
// (products, orders, order_items, customers, sale_events, discount_codes,
// abandoned_carts, campaigns). All list/aggregate helpers below return empty
// arrays or zero until real data is added through the dashboard.
//
// Admin session helpers remain as a thin wrapper around Supabase auth so the
// dashboard still has a working sign-in/out flow until the new auth context
// is wired in across every page.

import { supabase } from "@/integrations/supabase/client";

// ---------- Admin session (Supabase-backed) ----------
const ADMIN_KEY = "pw_admin_session_v1";

export interface AdminSession {
  email: string;
  name: string;
  initials: string;
  loggedInAt: string;
}

function deriveSession(email: string): AdminSession {
  const cleaned = email.trim();
  const namePart = cleaned.split("@")[0] || "Admin";
  const name = namePart
    .split(/[._-]/)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
  const initials = name
    .split(" ")
    .map((p) => p.charAt(0))
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return { email: cleaned, name, initials, loggedInAt: new Date().toISOString() };
}

export function getAdminSession(): AdminSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(ADMIN_KEY);
    return raw ? (JSON.parse(raw) as AdminSession) : null;
  } catch {
    return null;
  }
}

export function setAdminSession(email: string) {
  const sess = deriveSession(email);
  if (typeof window !== "undefined") {
    localStorage.setItem(ADMIN_KEY, JSON.stringify(sess));
  }
  return sess;
}

export async function clearAdminSession() {
  if (typeof window !== "undefined") localStorage.removeItem(ADMIN_KEY);
  try { await supabase.auth.signOut(); } catch { /* noop */ }
}

// ---------- Products (admin view) ----------
export type ProductStatus = "published" | "draft" | "archived";

export interface AdminProduct {
  id: string;
  slug: string;
  name: string;
  maker: string;
  category: string;
  tags: string[];
  daws: string[];
  price: number;
  salePrice?: number;
  coverGradient: string;
  status: ProductStatus;
  zipFileName: string;
  zipSizeMB: number;
  version: string;
  uploadedAt: string;
  createdAt: string;
  updatedAt: string;
  unitsSold: number;
  revenue: number;
  refundCount: number;
  lastSaleDate: string;
  description: string;
}

export const products: AdminProduct[] = [];
export const productCategories: string[] = ["instruments", "effects", "libraries", "daws", "software", "freebies"];

// ---------- Customers ----------
export interface Customer {
  id: string;
  name: string;
  email: string;
  initials: string;
  joinedAt: string;
  totalSpent: number;
  ordersCount: number;
  lastPurchaseAt: string;
  status: "active" | "refunded" | "banned";
  primarySource: string;
  notes?: string;
}
export const customers: Customer[] = [];

// ---------- Orders ----------
export type OrderStatus = "completed" | "refunded" | "partial";
export interface OrderItem { productId: string; name: string; price: number; coverGradient: string; }
export interface Order {
  id: string;
  number: string;
  customerId: string;
  items: OrderItem[];
  subtotal: number;
  discountCode?: string;
  discount: number;
  total: number;
  stripeId: string;
  status: OrderStatus;
  utmSource?: string;
  createdAt: string;
  downloadCount: number;
  refundReason?: string;
}
export const orders: Order[] = [];

// ---------- Sale events ----------
export interface SaleEvent {
  id: string;
  name: string;
  slug: string;
  discountPct: number;
  startAt: string;
  endAt: string;
  scope: "all" | "selected";
  productCount: number;
  status: "active" | "scheduled" | "ended" | "draft";
  themeColor: string;
  headline: string;
  subheadline: string;
  revenue?: number;
}
export const saleEvents: SaleEvent[] = [];

// ---------- Discount codes ----------
export interface DiscountCode {
  id: string;
  code: string;
  type: "percent" | "flat";
  value: number;
  usageLimit?: number;
  uses: number;
  expiresAt?: string;
  status: "active" | "expired" | "disabled";
  appliesTo: string;
}
export const discountCodes: DiscountCode[] = [];

// ---------- Abandoned carts ----------
export interface AbandonedCart {
  id: string;
  customerEmail: string;
  isGuest: boolean;
  items: number;
  itemSummary: string;
  cartValue: number;
  abandonedHoursAgo: number;
  reminderSent: boolean;
}
export const abandonedCarts: AbandonedCart[] = [];

// ---------- Campaigns ----------
export interface Campaign {
  id: string;
  name: string;
  sentAt: string;
  recipients: number;
  openRate: number;
  clickRate: number;
  revenue: number;
}
export const campaigns: Campaign[] = [];

// ---------- Aggregate helpers (return zero/empty until real orders exist) ----------
export function totalRevenue() { return 0; }
export function revenueThisMonth() { return 0; }
export function ordersThisMonth() { return 0; }
export function activeCustomers() { return 0; }
export function revenueSeries(_grouping: "daily" | "weekly" | "monthly"): { label: string; value: number }[] { return []; }
export function bestSellersThisMonth(_limit = 5): { product: AdminProduct; units: number; revenue: number }[] { return []; }
export function sourceBreakdown(): { source: string; customers: number; revenue: number }[] { return []; }
export function topCustomers(_limit = 10): Customer[] { return []; }

export function relativeTime(iso: string) {
  if (!iso) return "";
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (isNaN(diff)) return "";
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
  if (diff < 86400*30) return `${Math.floor(diff/86400)}d ago`;
  return new Date(iso).toLocaleDateString("en", { month: "short", day: "numeric" });
}

export function formatMoney(n: number) {
  return `$${(n || 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

// ---------- Analytics range helpers ----------
export type AnalyticsRange = "wtd" | "mtd" | "last-month" | "30d" | "12mo" | "all";

export const RANGE_LABEL: Record<AnalyticsRange, string> = {
  "wtd": "Week to date",
  "mtd": "Month to date",
  "last-month": "Last month",
  "30d": "Last 30 days",
  "12mo": "Last 12 months",
  "all": "All time",
};

export function rangeBounds(_r: AnalyticsRange): { start: Date; end: Date } {
  return { start: new Date(0), end: new Date() };
}
export function revenueInRange(_r: AnalyticsRange) { return 0; }
export function aovInRange(_r: AnalyticsRange) { return 0; }
export function refundRateInRange(_r: AnalyticsRange) { return 0; }
export function revenueSeriesRange(_r: AnalyticsRange): { label: string; value: number }[] { return []; }
export function topProductsInRange(_r: AnalyticsRange, _limit = 5): { product: AdminProduct; units: number; revenue: number }[] { return []; }
export function sourceBreakdownInRange(_r: AnalyticsRange): { source: string; customers: number; revenue: number }[] { return []; }
export function customerSplitInRange(_r: AnalyticsRange): { name: string; value: number }[] {
  return [{ name: "New", value: 0 }, { name: "Returning", value: 0 }];
}
