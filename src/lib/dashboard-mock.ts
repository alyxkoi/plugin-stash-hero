// Plugin Warehouse — Dashboard mock data layer.
// TODO: backend — replace this entire file with real Supabase queries +
// edge functions (R2 uploads, Stripe refunds, Mailchimp, OpenAI).

import { products as catalog } from "./mock-data";

// ---------- Admin auth (mock) ----------
// TODO: backend — replace with Supabase auth + users.is_admin = true check.
const ADMIN_KEY = "pw_admin_session_v1";

export interface AdminSession {
  email: string;
  name: string;
  initials: string;
  loggedInAt: string;
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
  const sess: AdminSession = { email: cleaned, name, initials, loggedInAt: new Date().toISOString() };
  localStorage.setItem(ADMIN_KEY, JSON.stringify(sess));
  return sess;
}

export function clearAdminSession() {
  if (typeof window !== "undefined") localStorage.removeItem(ADMIN_KEY);
}

// ---------- Deterministic RNG ----------
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20260101);
const pick = <T,>(arr: T[]) => arr[Math.floor(rand() * arr.length)];
const between = (a: number, b: number) => a + Math.floor(rand() * (b - a + 1));

// ---------- Products (extended catalog of 80) ----------
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

const TAG_POOL = [
  "warm","dark","analog","digital","cinematic","lofi","modern","trap","house",
  "techno","ambient","vintage","clean","aggressive","experimental","punchy",
];
const CATEGORIES = ["instruments","effects","libraries","daws","software","freebies"];
const DAW_POOL = ["Ableton Live","FL Studio","Logic Pro","Pro Tools","Cubase","Reaper","Studio One","Bitwig"];

function daysAgo(d: number) {
  const dt = new Date();
  dt.setDate(dt.getDate() - d);
  return dt.toISOString();
}

const baseProducts: AdminProduct[] = [];
let pid = 1;

// Seed real catalog items first
for (const p of catalog) {
  const sold = between(5, 840);
  baseProducts.push({
    id: `prd_${String(pid++).padStart(4, "0")}`,
    slug: p.slug,
    name: p.name,
    maker: p.maker,
    category: p.category,
    tags: [pick(TAG_POOL), pick(TAG_POOL)],
    daws: p.daws,
    price: p.price,
    salePrice: p.compareAtPrice ? Math.round(p.price * 0.65) : undefined,
    coverGradient: p.coverGradient,
    status: "published",
    zipFileName: `${p.slug}-v${p.version}.zip`,
    zipSizeMB: between(200, 1800),
    version: p.version,
    uploadedAt: daysAgo(between(10, 540)),
    createdAt: daysAgo(between(60, 540)),
    updatedAt: daysAgo(between(1, 60)),
    unitsSold: sold,
    revenue: sold * p.price,
    refundCount: between(0, Math.max(1, Math.floor(sold / 60))),
    lastSaleDate: daysAgo(between(0, 14)),
    description: p.description,
  });
}

// Fill out to 80 with synthetic products
const SYNTH_NAMES = [
  "Velvet Verb","Quantum Bass","Iron Glue","Ghost Choir","Modular X","Tape Drift",
  "Sub Architect","Crystal Keys","Drift Pads","Hammer Drums","Phantom Strings",
  "Neon Lead","Acid Funk","City Lights","Glass Snare","Brick Wall","Vapor Halls",
  "Analog Tape 64","Steel Stack","Lunar Bass","Brass Mafia","Wide Verb",
  "Synthwave Kit","Trap Royale","Bass Surgeon","Mix Doctor","Vocal Air","Punch Plus",
];
while (baseProducts.length < 80) {
  const name = `${pick(SYNTH_NAMES)} ${between(1,9)}`;
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g,"-");
  const price = pick([14,19,24,29,39,49,59,79]);
  const sold = between(5, 420);
  const status: ProductStatus = pick(["published","published","published","published","published","draft","archived"]);
  const cat = pick(CATEGORIES);
  baseProducts.push({
    id: `prd_${String(pid++).padStart(4,"0")}`,
    slug,
    name,
    maker: pick(["Boutique Audio","Wavehouse","Black Box","Studio Lab","Plugin Warehouse","Ironworks"]),
    category: cat,
    tags: [pick(TAG_POOL), pick(TAG_POOL)],
    daws: DAW_POOL.slice(0, between(3,6)),
    price,
    salePrice: rand() > 0.6 ? Math.round(price * 0.65) : undefined,
    coverGradient: `radial-gradient(circle at 30% 20%, hsl(${between(280,360)} 90% 55%), transparent 60%), radial-gradient(circle at 70% 80%, hsl(${between(220,280)} 90% 55%), transparent 55%), linear-gradient(135deg, #1a0040, #0A0018)`,
    status,
    zipFileName: `${slug}-v1.0.zip`,
    zipSizeMB: between(200, 1800),
    version: "1.0",
    uploadedAt: daysAgo(between(10, 540)),
    createdAt: daysAgo(between(60, 540)),
    updatedAt: daysAgo(between(1, 90)),
    unitsSold: status === "published" ? sold : 0,
    revenue: status === "published" ? sold * price : 0,
    refundCount: between(0, 4),
    lastSaleDate: daysAgo(between(0, 40)),
    description: `High-quality ${cat} from ${name}. Built for modern production.`,
  });
}

// Tune status counts to ~65/10/5
let drafts = baseProducts.filter(p=>p.status==="draft").length;
let arch = baseProducts.filter(p=>p.status==="archived").length;
for (const p of baseProducts) {
  if (p.status==="published" && drafts < 10) { p.status = "draft"; p.unitsSold = 0; p.revenue = 0; drafts++; continue; }
  if (p.status==="published" && arch < 5) { p.status = "archived"; arch++; continue; }
}

export const products: AdminProduct[] = baseProducts;
export const productCategories = Array.from(new Set(products.map(p => p.category)));

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

const FIRST = ["Alex","Sam","Jordan","Taylor","Riley","Casey","Morgan","Quinn","Drew","Avery","Cameron","Skyler","Reese","Parker","Hayden","Rowan","Sage","River","Emery","Finley","Marlon","Indigo","Luca","Noa","Theo","Ezra","Mateo","Kai","Nico","Zane"];
const LAST = ["Hayes","Reyes","Park","Vega","Kim","Chen","Patel","Singh","Rivera","Nguyen","Brooks","Cole","Hill","Carter","Ford","Webb","Bryant","Garcia","Lopez","Adams","Bishop","Doyle","Floyd","Hart","Page","Quinn","Stone","Valentine","Watts","Yates"];
const SOURCES = ["instagram","tiktok","youtube","reddit","google","direct","twitter","email"];
const CUSTOMER_NOTES = [
  "Hit me up via email for promo codes.",
  "Refunded once due to download failure — sorted.",
  "Heavy repeat buyer, loves cinematic libraries.",
  "Asked about bundle pricing on Plugmas.",
  "Producer in NYC — gave us a shout out.",
  "Wanted invoice in business name.",
  "Bought during Halloween Haunt early access.",
  "Reported a corrupted ZIP — re-issued.",
  "Vocalist — bought every reverb in stock.",
  "Friend of a friend, comp'd one freebie.",
];

export const customers: Customer[] = Array.from({ length: 85 }, (_, i) => {
  const f = pick(FIRST);
  const l = pick(LAST);
  const name = `${f} ${l}`;
  const email = `${f.toLowerCase()}.${l.toLowerCase()}${between(1,99)}@gmail.com`;
  const orders = pick([1,1,1,1,2,2,3,3,5,8]);
  const spent = orders * between(29, 220);
  return {
    id: `cus_${String(i+1).padStart(4,"0")}`,
    name,
    email,
    initials: (f[0]+l[0]).toUpperCase(),
    joinedAt: daysAgo(between(7, 540)),
    totalSpent: spent,
    ordersCount: orders,
    lastPurchaseAt: daysAgo(between(0, 90)),
    status: i < 78 ? "active" : i < 83 ? "refunded" : "banned",
    primarySource: pick(SOURCES),
    notes: i < 10 ? CUSTOMER_NOTES[i] : undefined,
  };
});

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

const DISCOUNT_CODES = ["WELCOME10","RESTOCK20","PRODUCER50","FREESHIP","BFCM2025","HALLOWS","SUMMER35","PLUGMAS50"];

export const orders: Order[] = Array.from({ length: 250 }, (_, i) => {
  const itemCount = between(1, 4);
  const pubProducts = products.filter(p => p.status === "published");
  const items: OrderItem[] = Array.from({ length: itemCount }, () => {
    const p = pick(pubProducts);
    return { productId: p.id, name: p.name, price: p.salePrice ?? p.price, coverGradient: p.coverGradient };
  });
  const subtotal = items.reduce((s,x) => s + x.price, 0);
  const hasDiscount = rand() > 0.6;
  const discount = hasDiscount ? Math.round(subtotal * pick([0.1,0.2,0.25,0.35])) : 0;
  const total = subtotal - discount;
  const cust = pick(customers);
  const status: OrderStatus = i < 235 ? "completed" : i < 247 ? "refunded" : "partial";
  // Cluster: heavier on day 0-3 (recent), day 28-32 (BFCM), day 305 (Halloween)
  let dayOff = between(0, 360);
  if (i % 7 === 0) dayOff = between(0, 5);
  if (i % 11 === 0) dayOff = between(28, 34);
  return {
    id: `ord_${String(i+1).padStart(5,"0")}`,
    number: `PW-${String(100000 + i).slice(-6)}`,
    customerId: cust.id,
    items,
    subtotal,
    discountCode: hasDiscount ? pick(DISCOUNT_CODES) : undefined,
    discount,
    total,
    stripeId: `pi_${Math.random().toString(36).slice(2, 14)}`,
    status,
    utmSource: rand() > 0.4 ? pick(SOURCES) : undefined,
    createdAt: daysAgo(dayOff),
    downloadCount: between(0, 12),
    refundReason: status !== "completed" ? pick(["Duplicate purchase","Customer request","Product issue","Fraudulent","Other"]) : undefined,
  };
});

// Backfill customer aggregates
for (const c of customers) {
  const cOrders = orders.filter(o => o.customerId === c.id && o.status !== "refunded");
  if (cOrders.length) {
    c.ordersCount = cOrders.length;
    c.totalSpent = cOrders.reduce((s,o) => s + o.total, 0);
    c.lastPurchaseAt = cOrders[0].createdAt;
  }
}

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

const now = new Date();
const addDays = (d: Date, n: number) => { const c = new Date(d); c.setDate(c.getDate()+n); return c.toISOString(); };

export const saleEvents: SaleEvent[] = [
  { id: "sal_001", name: "Summer Steals", slug: "summer-steals", discountPct: 35, startAt: addDays(now,-12), endAt: addDays(now,18), scope: "all", productCount: 80, status: "active", themeColor: "#FF6B6B", headline: "35% off. Everything.", subheadline: "Sun's out. Prices down.", revenue: 24850 },
  { id: "sal_002", name: "Halloween Haunt", slug: "halloween-haunt", discountPct: 40, startAt: "2026-10-25T00:00:00Z", endAt: "2026-11-02T23:59:59Z", scope: "all", productCount: 80, status: "scheduled", themeColor: "#FF7A1A", headline: "40% off. Trick or treat.", subheadline: "Spooky season, scarier prices." },
  { id: "sal_003", name: "Plugmas 2026", slug: "plugmas-2026", discountPct: 50, startAt: "2026-12-18T00:00:00Z", endAt: "2027-01-02T23:59:59Z", scope: "all", productCount: 80, status: "scheduled", themeColor: "#E11D2E", headline: "50% off. Plugmas is here.", subheadline: "12 days of plugins." },
  { id: "sal_004", name: "Spring Cleaning", slug: "spring-cleaning-2026", discountPct: 25, startAt: "2026-03-01T00:00:00Z", endAt: "2026-03-14T23:59:59Z", scope: "selected", productCount: 22, status: "ended", themeColor: "#22D3A6", headline: "25% off select gear.", subheadline: "Out with the old.", revenue: 9420 },
];

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

export const discountCodes: DiscountCode[] = [
  { id: "dc_01", code: "WELCOME10", type: "percent", value: 10, uses: 340, status: "active", appliesTo: "All products" },
  { id: "dc_02", code: "RESTOCK20", type: "flat", value: 20, usageLimit: 100, uses: 73, status: "active", appliesTo: "All products" },
  { id: "dc_03", code: "PRODUCER50", type: "percent", value: 50, usageLimit: 50, uses: 12, status: "active", appliesTo: "Effects" },
  { id: "dc_04", code: "FREESHIP", type: "flat", value: 5, uses: 1244, expiresAt: addDays(now,-90), status: "expired", appliesTo: "All products" },
  { id: "dc_05", code: "BFCM2025", type: "percent", value: 30, uses: 892, expiresAt: addDays(now,-280), status: "expired", appliesTo: "All products" },
  { id: "dc_06", code: "VIP25", type: "percent", value: 25, usageLimit: 200, uses: 88, status: "active", appliesTo: "All products" },
  { id: "dc_07", code: "MIXERS15", type: "percent", value: 15, uses: 47, status: "active", appliesTo: "Mixing tools" },
  { id: "dc_08", code: "SUMMER35", type: "percent", value: 35, uses: 612, status: "active", appliesTo: "All products" },
  { id: "dc_09", code: "FIRSTBUY", type: "flat", value: 10, usageLimit: 500, uses: 211, status: "active", appliesTo: "All products" },
  { id: "dc_10", code: "STUDENT20", type: "percent", value: 20, uses: 64, status: "disabled", appliesTo: "All products" },
  { id: "dc_11", code: "EARLYBIRD", type: "percent", value: 40, uses: 9, usageLimit: 20, expiresAt: addDays(now,7), status: "active", appliesTo: "Plugmas products" },
  { id: "dc_12", code: "TESTCODE", type: "flat", value: 1, uses: 3, status: "disabled", appliesTo: "All products" },
];

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

export const abandonedCarts: AbandonedCart[] = [
  { id: "abc_1", customerEmail: "guest+a3f@hotmail.com", isGuest: true, items: 2, itemSummary: "Serum + Pro-Q 4", cartValue: 53, abandonedHoursAgo: 1, reminderSent: false },
  { id: "abc_2", customerEmail: customers[2].email, isGuest: false, items: 1, itemSummary: "Omnisphere", cartValue: 99, abandonedHoursAgo: 4, reminderSent: false },
  { id: "abc_3", customerEmail: "guest+b1c@gmail.com", isGuest: true, items: 3, itemSummary: "Soundtoys 5 + 2 more", cartValue: 92, abandonedHoursAgo: 8, reminderSent: true },
  { id: "abc_4", customerEmail: customers[7].email, isGuest: false, items: 4, itemSummary: "Ableton Live 12 + 3 more", cartValue: 247, abandonedHoursAgo: 22, reminderSent: false },
  { id: "abc_5", customerEmail: customers[12].email, isGuest: false, items: 2, itemSummary: "Diva + Massive X", cartValue: 63, abandonedHoursAgo: 36, reminderSent: true },
  { id: "abc_6", customerEmail: "guest+99x@yahoo.com", isGuest: true, items: 1, itemSummary: "Pro Tools Studio", cartValue: 89, abandonedHoursAgo: 60, reminderSent: false },
  { id: "abc_7", customerEmail: customers[20].email, isGuest: false, items: 2, itemSummary: "Spitfire Strings + Arcade", cartValue: 98, abandonedHoursAgo: 96, reminderSent: true },
  { id: "abc_8", customerEmail: "guest+lm2@gmail.com", isGuest: true, items: 1, itemSummary: "Adobe Creative Cloud", cartValue: 89, abandonedHoursAgo: 120, reminderSent: false },
];

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

export const campaigns: Campaign[] = [
  { id: "cmp_1", name: "Summer Steals announcement", sentAt: daysAgo(10), recipients: 8420, openRate: 42, clickRate: 11, revenue: 6240 },
  { id: "cmp_2", name: "New drop: Modular Bass Pack", sentAt: daysAgo(28), recipients: 7980, openRate: 38, clickRate: 9, revenue: 3120 },
  { id: "cmp_3", name: "Halloween Haunt early access", sentAt: daysAgo(60), recipients: 1200, openRate: 64, clickRate: 22, revenue: 4820 },
  { id: "cmp_4", name: "Free this week: Tape Drift 2", sentAt: daysAgo(90), recipients: 8120, openRate: 51, clickRate: 18, revenue: 1240 },
  { id: "cmp_5", name: "Plugmas teaser", sentAt: daysAgo(140), recipients: 8200, openRate: 47, clickRate: 14, revenue: 2780 },
  { id: "cmp_6", name: "Repeat buyer thank you", sentAt: daysAgo(200), recipients: 320, openRate: 72, clickRate: 31, revenue: 1580 },
];

// ---------- Derived metrics for /dashboard overview ----------
export function totalRevenue() {
  return orders.filter(o => o.status !== "refunded").reduce((s,o) => s + o.total, 0);
}
export function revenueThisMonth() {
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 30);
  return orders.filter(o => new Date(o.createdAt) >= cutoff && o.status !== "refunded").reduce((s,o) => s + o.total, 0);
}
export function ordersThisMonth() {
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 30);
  return orders.filter(o => new Date(o.createdAt) >= cutoff).length;
}
export function activeCustomers() {
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 30);
  return new Set(orders.filter(o => new Date(o.createdAt) >= cutoff).map(o => o.customerId)).size;
}

export function revenueSeries(grouping: "daily" | "weekly" | "monthly") {
  const buckets = grouping === "daily" ? 30 : grouping === "weekly" ? 12 : 12;
  const size = grouping === "daily" ? 1 : grouping === "weekly" ? 7 : 30;
  const out: { label: string; value: number }[] = [];
  for (let i = buckets - 1; i >= 0; i--) {
    const start = new Date(); start.setDate(start.getDate() - (i+1)*size);
    const end = new Date(); end.setDate(end.getDate() - i*size);
    const total = orders
      .filter(o => { const d = new Date(o.createdAt); return d >= start && d < end && o.status !== "refunded"; })
      .reduce((s,o) => s + o.total, 0);
    const label = grouping === "daily" ? `${start.getMonth()+1}/${start.getDate()}` : grouping === "weekly" ? `W${buckets - i}` : start.toLocaleString("en", { month: "short" });
    out.push({ label, value: total });
  }
  return out;
}

export function bestSellersThisMonth(limit = 5) {
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 30);
  const tally = new Map<string, { units: number; revenue: number }>();
  for (const o of orders) {
    if (new Date(o.createdAt) < cutoff || o.status === "refunded") continue;
    for (const it of o.items) {
      const t = tally.get(it.productId) ?? { units: 0, revenue: 0 };
      t.units += 1; t.revenue += it.price;
      tally.set(it.productId, t);
    }
  }
  return Array.from(tally.entries())
    .map(([id, v]) => ({ product: products.find(p => p.id === id)!, ...v }))
    .filter(r => r.product)
    .sort((a,b) => b.units - a.units)
    .slice(0, limit);
}

export function sourceBreakdown() {
  const map = new Map<string, { customers: Set<string>; revenue: number }>();
  for (const o of orders) {
    if (!o.utmSource) continue;
    const m = map.get(o.utmSource) ?? { customers: new Set<string>(), revenue: 0 };
    m.customers.add(o.customerId); m.revenue += o.total;
    map.set(o.utmSource, m);
  }
  return Array.from(map.entries()).map(([source, v]) => ({
    source, customers: v.customers.size, revenue: v.revenue,
  })).sort((a,b) => b.revenue - a.revenue);
}

export function topCustomers(limit = 10) {
  return [...customers].sort((a,b) => b.totalSpent - a.totalSpent).slice(0, limit);
}

export function relativeTime(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
  if (diff < 86400*30) return `${Math.floor(diff/86400)}d ago`;
  return new Date(iso).toLocaleDateString("en", { month: "short", day: "numeric" });
}

export function formatMoney(n: number) {
  return `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
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

export function rangeBounds(r: AnalyticsRange): { start: Date; end: Date } {
  const end = new Date();
  const start = new Date();
  if (r === "wtd") {
    const day = (end.getDay() + 6) % 7; // Mon=0
    start.setDate(end.getDate() - day); start.setHours(0,0,0,0);
  } else if (r === "mtd") {
    start.setDate(1); start.setHours(0,0,0,0);
  } else if (r === "last-month") {
    start.setMonth(end.getMonth() - 1, 1); start.setHours(0,0,0,0);
    end.setDate(0); end.setHours(23,59,59,999);
  } else if (r === "30d") {
    start.setDate(end.getDate() - 30);
  } else if (r === "12mo") {
    start.setMonth(end.getMonth() - 12);
  } else {
    start.setFullYear(2000);
  }
  return { start, end };
}

function ordersIn(r: AnalyticsRange) {
  const { start, end } = rangeBounds(r);
  return orders.filter(o => {
    const d = new Date(o.createdAt);
    return d >= start && d <= end && o.status !== "refunded";
  });
}

export function revenueInRange(r: AnalyticsRange) {
  return ordersIn(r).reduce((s, o) => s + o.total, 0);
}

export function aovInRange(r: AnalyticsRange) {
  const o = ordersIn(r);
  return o.length ? Math.round(o.reduce((s, x) => s + x.total, 0) / o.length) : 0;
}

export function refundRateInRange(r: AnalyticsRange) {
  const { start, end } = rangeBounds(r);
  const all = orders.filter(o => { const d = new Date(o.createdAt); return d >= start && d <= end; });
  if (!all.length) return 0;
  const refunded = all.filter(o => o.status !== "completed").length;
  return Math.round((refunded / all.length) * 1000) / 10;
}

export function revenueSeriesRange(r: AnalyticsRange) {
  const { start, end } = rangeBounds(r);
  const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000));
  // pick grouping
  let bucketDays = 1;
  let bucketCount = days;
  let labelFmt: "day" | "week" | "month" = "day";
  if (days > 60 && days <= 200) { bucketDays = 7; bucketCount = Math.ceil(days / 7); labelFmt = "week"; }
  else if (days > 200) { bucketDays = 30; bucketCount = Math.ceil(days / 30); labelFmt = "month"; }
  const out: { label: string; value: number }[] = [];
  for (let i = 0; i < bucketCount; i++) {
    const bStart = new Date(start); bStart.setDate(start.getDate() + i * bucketDays);
    const bEnd = new Date(start); bEnd.setDate(start.getDate() + (i + 1) * bucketDays);
    const total = orders
      .filter(o => { const d = new Date(o.createdAt); return d >= bStart && d < bEnd && o.status !== "refunded"; })
      .reduce((s, o) => s + o.total, 0);
    const label = labelFmt === "day" ? `${bStart.getMonth() + 1}/${bStart.getDate()}`
      : labelFmt === "week" ? `W${i + 1}`
      : bStart.toLocaleString("en", { month: "short" });
    out.push({ label, value: total });
  }
  return out;
}

export function topProductsInRange(r: AnalyticsRange, limit = 5) {
  const tally = new Map<string, { units: number; revenue: number }>();
  for (const o of ordersIn(r)) {
    for (const it of o.items) {
      const t = tally.get(it.productId) ?? { units: 0, revenue: 0 };
      t.units += 1; t.revenue += it.price;
      tally.set(it.productId, t);
    }
  }
  return Array.from(tally.entries())
    .map(([id, v]) => ({ product: products.find(p => p.id === id)!, ...v }))
    .filter(x => x.product)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit);
}

export function sourceBreakdownInRange(r: AnalyticsRange) {
  const map = new Map<string, { customers: Set<string>; revenue: number }>();
  for (const o of ordersIn(r)) {
    if (!o.utmSource) continue;
    const m = map.get(o.utmSource) ?? { customers: new Set<string>(), revenue: 0 };
    m.customers.add(o.customerId); m.revenue += o.total;
    map.set(o.utmSource, m);
  }
  return Array.from(map.entries()).map(([source, v]) => ({
    source, customers: v.customers.size, revenue: v.revenue,
  })).sort((a, b) => b.revenue - a.revenue);
}

export function customerSplitInRange(r: AnalyticsRange) {
  const o = ordersIn(r);
  const seenBefore = new Set<string>();
  for (const ord of orders) {
    if (new Date(ord.createdAt) < rangeBounds(r).start) seenBefore.add(ord.customerId);
  }
  let newC = 0, ret = 0;
  const inRange = new Set<string>();
  for (const ord of o) {
    if (inRange.has(ord.customerId)) continue;
    inRange.add(ord.customerId);
    if (seenBefore.has(ord.customerId)) ret++; else newC++;
  }
  return [{ name: "New", value: newC }, { name: "Returning", value: ret }];
}
